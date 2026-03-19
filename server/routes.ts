import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertTripSchema, insertChatSessionSchema, insertReviewSchema, insertSavedTripSchema, insertPlaceReviewSchema } from "@shared/schema";
import { generateItinerary, processConversation, optimizeItinerary, type TravelPreferences } from "./services/gemini";
import { ObjectPermission } from "./objectAcl";
// import { setupAuth, isAuthenticated, hashPassword } from "./auth"; // Removed auth
import passport from "passport"; // Necesario para las rutas de login
import { ObjectStorageService } from "./objectStorage";
import { createPaymentPreference, getPaymentInfo } from "./mercadopago";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Auth middleware
  // Removed: await setupAuth(app); // No authentication required(app);

  // Initialize object storage service
  const objectStorage = new ObjectStorageService();

  // --- RUTAS DE AUTENTICACIÓN (Login/Registro) ---

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;

      // Validaciones del servidor
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Todos los campos son obligatorios" });
      }

      if (username.length > 20) {
        return res.status(400).json({ message: "El nombre no puede exceder los 20 caracteres" });
      }

      const nameRegex = /^[a-zA-Z\s]*$/;
      if (!nameRegex.test(username)) {
        return res.status(400).json({ message: "El nombre no puede contener caracteres especiales" });
      }

      if (!email.includes("@")) {
        return res.status(400).json({ message: "Email inválido" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        email: email, // Usamos el email enviado
        firstName: username, // Mapeamos nombre a firstName también por si acaso
        lastName: "",
        profileImageUrl: "",
      });

      req.login(newUser, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as any;
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Get current user info
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // FIX: Usamos el usuario directamente de la sesión (ya deserializado)
      const user = req.user;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes (protected)
  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user", error });
    }
  });

  // Trip routes  
  app.get("/api/trips/public", async (req, res) => {
    try {
      const filters = {
        destination: req.query.destination as string,
        minBudget: req.query.minBudget ? parseFloat(req.query.minBudget as string) : undefined,
        maxBudget: req.query.maxBudget ? parseFloat(req.query.maxBudget as string) : undefined,
        minDuration: req.query.minDuration ? parseInt(req.query.minDuration as string) : undefined,
        maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined,
        travelStyle: req.query.travelStyle as string,
      };

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined)
      );

      const trips = await storage.getPublicTrips(Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Failed to get public trips", error });
    }
  });

  // Get current user's trips (authenticated)
  app.get("/api/trips/user", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id en lugar de claims.sub
      const userId = (req.user as any).id;
      const trips = await storage.getTripsByUserId(userId);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user trips", error });
    }
  });

  app.get("/api/trips/user/:userId", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const requestingUserId = (req.user as any).id;
      const targetUserId = req.params.userId;

      if (requestingUserId !== targetUserId) {
        return res.status(403).json({ message: "Forbidden: You can only access your own trips" });
      }

      const trips = await storage.getTripsByUserId(req.params.userId);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user trips", error });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Failed to get trip", error });
    }
  });

  app.post("/api/trips", isAuthenticated, async (req, res) => {
    try {
      console.log("POST /api/trips received data:", JSON.stringify(req.body, null, 2));
      const tripData = insertTripSchema.parse(req.body);
      console.log("POST /api/trips validation passed, creating trip...");
      const trip = await storage.createTrip(tripData);
      res.json(trip);
    } catch (error) {
      console.error("POST /api/trips validation error:", error);
      res.status(400).json({ message: "Invalid trip data", error });
    }
  });

  app.put("/api/trips/:id", isAuthenticated, async (req, res) => {
    try {
      const tripData = insertTripSchema.partial().parse(req.body);
      const trip = await storage.updateTrip(req.params.id, tripData);
      res.json(trip);
    } catch (error) {
      res.status(400).json({ message: "Failed to update trip", error });
    }
  });

  app.delete("/api/trips/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTrip(req.params.id);
      res.json({ message: "Trip deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete trip", error });
    }
  });

  // Chat session routes
  app.get("/api/chat/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getChatSessionsByUserId(req.params.userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat sessions", error });
    }
  });

  app.get("/api/chat/:id", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat session", error });
    }
  });

  app.post("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid chat session data", error });
    }
  });

  app.post("/api/chat/:id/message", isAuthenticated, async (req, res) => {
    try {
      const { message } = req.body;
      const sessionId = req.params.id;

      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Log the prompt
      const userId = (req.user as any).id;
      await storage.createChatPrompt({
        userId,
        sessionId,
        promptText: message,
      });


      const messages = session.messages || [];
      const newMessage = {
        id: Math.random().toString(36),
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      };

      messages.push(newMessage);
      const currentPreferences = session.extractedPreferences || {};

      const aiResponse = await processConversation(
        messages.map(m => ({ role: m.role, content: m.content })),
        { preferences: currentPreferences }
      );

      const aiMessage = {
        id: Math.random().toString(36),
        role: 'assistant' as const,
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
      };

      messages.push(aiMessage);

      const newPreferences = aiResponse.extractedPreferences ?? {};
      const mergedPreferences = {
        ...currentPreferences,
        ...newPreferences
      };

      const updatedSession = await storage.updateChatSession(sessionId, {
        messages,
        extractedPreferences: mergedPreferences,
        status: aiResponse.shouldGenerateItinerary ? 'completed' : 'active'
      });

      res.json({
        session: updatedSession,
        shouldGenerateItinerary: aiResponse.shouldGenerateItinerary,
        extractedPreferences: mergedPreferences
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process message", error });
    }
  });

  // AI itinerary generation
  app.post("/api/ai/generate-itinerary", async (req, res) => {
    try {
      const preferencesSchema = z.object({
        destination: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        duration: z.union([z.number(), z.string()]).optional().transform((val) => {
          if (typeof val === 'string') {
            const match = String(val).match(/\d+/);
            return match ? parseInt(match[0], 10) : undefined;
          }
          return val;
        }),
        days: z.union([z.number(), z.string()]).optional().transform((val) => {
          if (typeof val === 'string') {
            const match = String(val).match(/\d+/);
            return match ? parseInt(match[0], 10) : undefined;
          }
          return val;
        }),
        budget: z.union([z.number(), z.string()]).optional().transform((val) => {
          if (typeof val === 'string') {
            const numbers = val.match(/\d+(?:,\d+)*/g);
            if (numbers) {
              const numericValue = parseInt(numbers[0].replace(/,/g, ''), 10);
              return isNaN(numericValue) ? undefined : numericValue;
            }
            return undefined;
          }
          return val;
        }),
        travelers: z.union([z.number(), z.string()]).optional().transform((val) => {
          if (typeof val === 'string') {
            const num = parseInt(val, 10);
            return isNaN(num) ? 1 : num;
          }
          return val || 1;
        }),
        accommodationType: z.string().optional(),
        activities: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
          if (typeof val === 'string') {
            return [val];
          }
          return val;
        }),
        travelStyle: z.string().optional(),
        dietaryRestrictions: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
          if (typeof val === 'string') {
            return [val];
          }
          return val;
        }),
      });

      const parsedPreferences = preferencesSchema.parse(req.body);

      let startDate = parsedPreferences.startDate;
      let endDate = parsedPreferences.endDate;
      const duration = parsedPreferences.duration || parsedPreferences.days || 7;

      if (!startDate && !endDate) {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() + 7);
        const end = new Date(start);
        end.setDate(start.getDate() + duration - 1);
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      } else if (startDate && !endDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + duration - 1);
        endDate = end.toISOString().split('T')[0];
      } else if (!startDate && endDate) {
        const end = new Date(endDate);
        const start = new Date(end);
        start.setDate(end.getDate() - duration + 1);
        startDate = start.toISOString().split('T')[0];
      }

      if (!startDate || !endDate) {
        throw new Error("Unable to determine trip dates");
      }

      const finalPreferences = {
        ...parsedPreferences,
        startDate,
        endDate
      };

      const itinerary = await generateItinerary(finalPreferences);
      res.json(itinerary);
    } catch (error: any) {
      console.error("Itinerary generation error:", error);
      res.status(400).json({ message: "Failed to generate itinerary", error: error?.message || error });
    }
  });

  app.post("/api/ai/optimize-itinerary", async (req, res) => {
    try {
      const { itinerary, feedback, selectedActivity } = req.body;
      const optimizedItinerary = await optimizeItinerary(itinerary, feedback, selectedActivity);
      res.json(optimizedItinerary);
    } catch (error) {
      res.status(400).json({ message: "Failed to optimize itinerary", error });
    }
  });

  // Review routes
  app.get("/api/reviews/trip/:tripId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByTripId(req.params.tripId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reviews", error });
    }
  });

  app.get("/api/reviews/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const reviews = await storage.getReviewsByUserId(req.params.userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user reviews", error });
    }
  });

  app.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid review data", error });
    }
  });

  // Saved trips routes
  app.get("/api/trips/saved", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const savedTrips = await storage.getSavedTripsByUserId(userId);
      res.json(savedTrips);
    } catch (error) {
      res.status(500).json({ message: "Failed to get saved trips", error });
    }
  });

  app.get("/api/saved-trips/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const savedTrips = await storage.getSavedTripsByUserId(req.params.userId);
      res.json(savedTrips);
    } catch (error) {
      res.status(500).json({ message: "Failed to get saved trips", error });
    }
  });

  app.post("/api/saved-trips", isAuthenticated, async (req, res) => {
    try {
      const savedTripData = insertSavedTripSchema.parse(req.body);
      const savedTrip = await storage.createSavedTrip(savedTripData);
      res.json(savedTrip);
    } catch (error) {
      res.status(400).json({ message: "Invalid saved trip data", error });
    }
  });

  app.delete("/api/saved-trips/:userId/:tripId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSavedTrip(req.params.userId, req.params.tripId);
      res.json({ message: "Trip removed from saved trips" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove saved trip", error });
    }
  });

  // --- PAYMENT ROUTES (FIXED FOR LOCAL AUTH) ---
  app.post("/api/payments/create-preference", isAuthenticated, async (req, res) => {
    try {
      const { tripId, amount, currency = 'UYU' } = req.body;
      // FIX: Acceso directo a req.user.id (sin .claims)
      const user = req.user as any;
      const userId = user.id;

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const existingPurchase = await storage.getPurchaseByTripAndUser(tripId, userId);
      if (existingPurchase) {
        return res.json({
          message: "Already purchased",
          preferenceId: existingPurchase.mercadoPagoPreferenceId,
          alreadyPurchased: true
        });
      }

      const externalReference = `tobugo-${tripId}-${userId}-${Date.now()}`;
      const host = req.get('host') || '';

      // LÓGICA ACTUALIZADA: Detectar Localhost O Variable de Entorno
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const forceSimulation = process.env.PAYMENT_SIMULATION === 'true';

      // Si estamos en local O si la variable de entorno lo fuerza
      if (isLocal || forceSimulation) {
        console.log("Simulando pago exitoso (Local o Forzado)...");
        const purchase = await storage.createPurchase({
          userId,
          tripId,
          amount: String(Number(amount) || 99),
          currency,
          status: 'approved',
          mercadoPagoPreferenceId: 'simulated-pref-id-' + Date.now(),
          mercadoPagoExternalReference: externalReference,
          paidAt: new Date()
        });

        return res.json({
          preferenceId: purchase.mercadoPagoPreferenceId,
          initPoint: null,
          sandboxInitPoint: null,
          purchaseId: externalReference,
          simulated: true
        });
      }

      // MODO PRODUCCIÓN
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;

      // FIX: Datos del pagador desde el objeto user local
      const firstName = user.firstName || user.username || "User";
      const lastName = user.lastName || "";
      const email = user.email || "no-email@example.com";

      const preference = await createPaymentPreference({
        title: `Descarga de Itinerario: ${trip.title}`,
        description: `Acceso completo al itinerario de ${trip.destination}`,
        quantity: 1,
        unitPrice: Number(amount) || 99,
        currency,
        externalReference,
        backUrls: {
          success: `${baseUrl}/payment/success`,
          failure: `${baseUrl}/payment/failure`,
          pending: `${baseUrl}/payment/pending`,
        },
        autoReturn: 'approved',
        notificationUrl: `${baseUrl}/api/payments/webhook`,
        payer: {
          email: email,
          firstName: firstName,
          lastName: lastName,
        }
      });

      const purchase = await storage.createPurchase({
        userId,
        tripId,
        amount: String(Number(amount) || 99),
        currency,
        status: 'pending',
        mercadoPagoPreferenceId: preference.id || '',
        mercadoPagoExternalReference: externalReference,
      });

      res.json({
        preferenceId: preference.id,
        initPoint: preference.initPoint,
        sandboxInitPoint: preference.sandboxInitPoint,
        purchaseId: purchase.id
      });
    } catch (error: any) {
      console.error("Payment preference creation error:", error);
      res.status(500).json({ message: "Failed to create payment preference", error: error.message });
    }
  });

  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const { type, data } = req.body;
      if (type === 'payment') {
        const paymentId = data.id;
        const paymentInfo = await getPaymentInfo(paymentId);
        if (paymentInfo) {
          const externalReference = paymentInfo.external_reference;
          const status = paymentInfo.status;
          let purchaseStatus = 'pending';
          if (status === 'approved') purchaseStatus = 'approved';
          else if (status === 'rejected') purchaseStatus = 'rejected';
          else if (status === 'cancelled') purchaseStatus = 'cancelled';

          if (externalReference) {
            await storage.updatePurchaseByExternalReference(externalReference, {
              status: purchaseStatus,
              mercadoPagoPaymentId: String(paymentId),
              paymentMethod: paymentInfo.payment_type_id,
              paidAt: status === 'approved' ? new Date() : undefined,
            });
          }
        }
      }
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing failed", error: error.message });
    }
  });

  app.get("/api/payments/check/:tripId", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const tripId = req.params.tripId;
      const purchase = await storage.getPurchaseByTripAndUser(tripId, userId);
      res.json({
        hasPurchased: !!purchase,
        purchase: purchase || null
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check purchase status", error });
    }
  });

  app.get("/api/payments/history", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const purchases = await storage.getPurchasesByUserId(userId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ message: "Failed to get purchase history", error });
    }
  });

  // Place Reviews routes
  app.get("/api/place-reviews", async (req, res) => {
    try {
      const location = req.query.location as string;
      const userId = req.query.userId as string;
      let reviews;
      if (location) {
        reviews = await storage.getPlaceReviewsByLocation(location);
      } else if (userId) {
        reviews = await storage.getPlaceReviewsByUserId(userId);
      } else {
        reviews = await storage.getPlaceReviewsByLocation("");
      }
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to get place reviews", error });
    }
  });

  app.get("/api/place-reviews/:id", async (req, res) => {
    try {
      const review = await storage.getPlaceReview(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Place review not found" });
      }
      res.json(review);
    } catch (error) {
      res.status(500).json({ message: "Failed to get place review", error });
    }
  });

  app.post("/api/place-reviews", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const reviewData = insertPlaceReviewSchema.parse({ ...req.body, userId });
      const review = await storage.createPlaceReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid place review data", error });
    }
  });

  app.put("/api/place-reviews/:id", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const existingReview = await storage.getPlaceReview(req.params.id);
      if (!existingReview) {
        return res.status(404).json({ message: "Place review not found" });
      }
      if (existingReview.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only update your own reviews" });
      }
      const reviewData = insertPlaceReviewSchema.partial().omit({ userId: true }).parse(req.body);
      const review = await storage.updatePlaceReview(req.params.id, reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Failed to update place review", error });
    }
  });

  app.delete("/api/place-reviews/:id", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const existingReview = await storage.getPlaceReview(req.params.id);
      if (!existingReview) {
        return res.status(404).json({ message: "Place review not found" });
      }
      if (existingReview.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only delete your own reviews" });
      }
      await storage.deletePlaceReview(req.params.id);
      res.json({ message: "Place review deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete place review", error });
    }
  });

  // Media upload routes
  app.post("/api/media/upload-url", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const { isPublic = false } = req.body;
      const uploadUrl = await objectStorage.getObjectEntityUploadURL();
      const urlObj = new URL(uploadUrl, `http://${req.headers.host}`);
      const objectPath = urlObj.pathname;
      res.json({
        uploadUrl,
        objectPath,
        isPublic,
        instructions: "After upload, call POST /api/place-reviews/:id/media with objectPath to attach"
      });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL", error: error.message || error });
    }
  });

  app.post("/api/place-reviews/:id/media", isAuthenticated, async (req, res) => {
    try {
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const reviewId = req.params.id;
      const { objectPath, isPublic = false } = req.body;

      if (!objectPath) {
        return res.status(400).json({ message: "Object path is required" });
      }

      const existingReview = await storage.getPlaceReview(reviewId);
      if (!existingReview) {
        return res.status(404).json({ message: "Place review not found" });
      }
      if (existingReview.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only attach media to your own reviews" });
      }

      const aclPolicy = {
        visibility: isPublic ? "public" : "private" as "public" | "private",
        owner: userId,
        aclRules: []
      };

      const normalizedPath = await objectStorage.trySetObjectEntityAclPolicy(objectPath, aclPolicy);
      const currentMediaUrls = existingReview.mediaUrls || [];
      const updatedMediaUrls = [...currentMediaUrls, normalizedPath];
      const updatedReview = await storage.updatePlaceReview(reviewId, {
        mediaUrls: updatedMediaUrls
      });

      res.json({
        success: true,
        review: updatedReview,
        attachedMedia: normalizedPath
      });
    } catch (error: any) {
      console.error("Error attaching media to place review:", error);
      res.status(500).json({ message: "Failed to attach media", error: error.message || error });
    }
  });

  app.get("/objects/*", async (req, res) => {
    try {
      const file = await objectStorage.getObjectEntityFile(req.path);
      // FIX: req.user.id (opcional)
      const userId = req.user ? (req.user as any).id : undefined;

      const canRead = await objectStorage.canAccessObjectEntity({
        userId,
        objectFile: file,
        requestedPermission: ObjectPermission.READ
      });

      if (!canRead) {
        console.log(`ACL: Access denied for user ${userId || 'anonymous'} to object ${req.path}`);
        return res.status(403).json({ message: "Forbidden" });
      }
      await objectStorage.downloadObject(file, res);
    } catch (error: any) {
      if (error.name === "ObjectNotFoundError") {
        return res.status(404).json({ message: "Object not found" });
      }
      console.error("Error serving object:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/community/stats", async (req, res) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching community stats:", error);
      res.status(500).json({ message: "Failed to fetch community stats", error });
    }
  });

  app.get("/api/reviews/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const reviews = await storage.getRecentReviews(limit);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching recent reviews:", error);
      res.status(500).json({ message: "Failed to fetch recent reviews", error });
    }
  });

  app.post("/api/reviews/:reviewId/helpful", isAuthenticated, async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      // FIX: req.user.id
      const userId = (req.user as any).id;
      const review = await storage.incrementReviewHelpful(reviewId, userId);
      if (review === null) {
        return res.status(409).json({ message: "You have already marked this review as helpful" });
      }
      res.json(review);
    } catch (error) {
      console.error("Error updating review helpful count:", error);
      res.status(500).json({ message: "Failed to update review helpful count", error });
    }
  });

  // RUTA DE SUBIDA DE ARCHIVOS LOCAL
  app.put("/api/uploads/:id", isAuthenticated, (req, res) => {
    const uploadDir = require("path").resolve(process.cwd(), "uploads");
    const filePath = require("path").join(uploadDir, req.params.id);
    const fileStream = require("fs").createWriteStream(filePath);

    req.pipe(fileStream);

    fileStream.on('finish', () => {
      res.status(200).json({ success: true });
    });

    fileStream.on('error', (err: any) => {
      console.error("File upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
