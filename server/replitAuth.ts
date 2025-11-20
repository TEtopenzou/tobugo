import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Validamos variable de entorno, pero permitimos un valor por defecto para desarrollo local
if (!process.env.REPLIT_DOMAINS && process.env.NODE_ENV !== "development") {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Asegura que se cree la tabla de sesiones
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key", // Fallback para dev
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // IMPORTANTE: secure: false en desarrollo para que funcione en localhost
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
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // --- LOGIN PARA DESARROLLO LOCAL ---
  // Esto permite simular un usuario logueado sin conectar con Replit
  if (process.env.NODE_ENV === "development") {
    app.post("/api/dev/login", async (req, res) => {
      const devUser = {
        id: "dev-user-id",
        email: "carlos@tobugo.local",
        firstName: "Carlos",
        lastName: "Dev",
        profileImageUrl: "",
      };

      // Asegurar que el usuario existe en la DB
      await storage.upsertUser(devUser);

      // Crear sesión de Passport
      const passportUser = {
        id: devUser.id,
        claims: { 
          sub: devUser.id, 
          email: devUser.email, 
          first_name: devUser.firstName, 
          last_name: devUser.lastName 
        },
        // Token "eterno" para que no expire la sesión local
        expires_at: Math.floor(Date.now() / 1000) + 31536000, 
      };

      req.login(passportUser, (err) => {
        if (err) return res.status(500).json({ message: "Login failed", error: err });
        return res.json(passportUser);
      });
    });
  }

  // Configuración OIDC de Replit (Solo intenta conectarse si no falla)
  try {
    if (process.env.REPL_ID && process.env.ISSUER_URL) {
        const config = await getOidcConfig();
        const verify: VerifyFunction = async (tokens, verified) => {
            const user = {};
            updateUserSession(user, tokens);
            await upsertUser(tokens.claims());
            verified(null, user);
        };

        const domains = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(",") : [];
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
      console.log("OIDC setup skipped or failed (normal in local dev without real credentials)");
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    if (process.env.NODE_ENV === "development") {
        return res.status(200).send("En modo desarrollo, usa el botón de Dev Login (o implementa un botón temporal que haga POST a /api/dev/login)");
    }
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
    req.logout(() => {
       res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // FIX CLAVE: Si estamos en desarrollo y hay sesión de passport, pase adelante
  // sin chequear tokens de Replit que no existen.
  if (process.env.NODE_ENV === "development" && req.isAuthenticated()) {
    return next();
  }

  const user = req.user as any;
  
  // Verificación estricta original (se mantiene para producción)
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Intento de refresh token (solo funcionará en Replit real)
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};