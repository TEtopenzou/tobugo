import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Configuración OIDC genérica (originalmente para Replit, pero adaptable)
const getOidcConfig = memoize(
  async () => {
    if (!process.env.ISSUER_URL || !process.env.REPL_ID) {
      throw new Error("OIDC configuration missing");
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 semana
  const pgStore = connectPg(session);
  
  // Asegurarnos de que DATABASE_URL existe
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set, session persistence will fail");
  }

  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Secure false en desarrollo para localhost, true en producción
      secure: process.env.NODE_ENV === "production", 
      sameSite: 'lax', 
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  // Mapeo seguro de campos
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"] || claims["given_name"] || "User",
    lastName: claims["last_name"] || claims["family_name"] || "",
    profileImageUrl: claims["profile_image_url"] || claims["picture"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // --- ESTRATEGIA LOCAL PARA DESARROLLO ---
  if (process.env.NODE_ENV === "development") {
    console.log("🔧 Development Auth Strategy Enabled");
    app.post("/api/dev/login", async (req, res) => {
      const devUser = {
        id: "dev-user-id",
        email: "carlos@tobugo.local",
        firstName: "Carlos",
        lastName: "Dev",
        profileImageUrl: "",
      };

      try {
        await storage.upsertUser(devUser);

        const passportUser = {
          id: devUser.id,
          claims: { 
            sub: devUser.id, 
            email: devUser.email, 
            first_name: devUser.firstName, 
            last_name: devUser.lastName 
          },
          expires_at: Math.floor(Date.now() / 1000) + 31536000, // 1 año
        };

        req.login(passportUser, (err) => {
          if (err) return res.status(500).json({ message: "Login failed", error: err });
          return res.json(passportUser);
        });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ message: "Internal error during dev login" });
      }
    });
  }

  // --- ESTRATEGIA OIDC (Producción / Replit) ---
  // Solo se activa si existen las variables necesarias
  try {
    if (process.env.REPL_ID && process.env.ISSUER_URL && process.env.REPLIT_DOMAINS) {
        const config = await getOidcConfig();
        const verify: VerifyFunction = async (tokens, verified) => {
            try {
                const user = {};
                updateUserSession(user, tokens);
                await upsertUser(tokens.claims());
                verified(null, user);
            } catch (err) {
                verified(err as Error);
            }
        };

        const domains = process.env.REPLIT_DOMAINS.split(",");
        for (const domain of domains) {
            passport.use(new Strategy({
                name: `replitauth:${domain}`,
                config,
                scope: "openid email profile offline_access",
                callbackURL: `https://${domain}/api/callback`,
            }, verify));
        }
    }
  } catch (e) {
      // Silencioso en local, ya que es esperado que falle si no hay credenciales de Replit
      if (process.env.NODE_ENV === "production") {
          console.error("OIDC setup failed:", e);
      }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Rutas de autenticación estándar
  app.get("/api/login", (req, res, next) => {
    if (process.env.NODE_ENV === "development") {
        return res.status(200).send("Development mode: Use POST /api/dev/login");
    }
    // Fallback a estrategia basada en hostname para compatibilidad con Replit
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
       if (err) console.error("Logout error:", err);
       res.redirect("/");
    });
  });
}

// Middleware de protección de rutas
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Acceso permitido en desarrollo si hay sesión de Passport válida
  if (process.env.NODE_ENV === "development" && req.isAuthenticated()) {
    return next();
  }

  // Verificación estricta para producción (tokens OIDC)
  const user = req.user as any;
  if (!req.isAuthenticated() || !user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Intento de refrescar token (si existe refresh_token)
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized - Session expired" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized - Refresh failed" });
  }
};