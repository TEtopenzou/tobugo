import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertTripSchema, insertChatSessionSchema, insertReviewSchema, insertSavedTripSchema, insertPlaceReviewSchema } from "@shared/schema";
import { generateItinerary, processConversation, optimizeItinerary, type TravelPreferences } from "./services/gemini";
import { ObjectPermission } from "./objectAcl";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService } from "./objectStorage";
import { createPaymentPreference, getPaymentInfo } from "./mercadopago";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth middleware
  await setupAuth(app);
  
  // Initialize object storage service
  const objectStorage = new ObjectStorageService();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Sanitize response by omitting sensitive fields
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
      
      // Remove undefined values
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
      const userId = (req.user as any).claims.sub;
      const trips = await storage.getTripsByUserId(userId);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user trips", error });
    }
  });

  app.get("/api/trips/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const requestingUserId = (req.user as any).claims.sub;
      const targetUserId = req.params.userId;
      
      // Security: Only allow users to access their own trips
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

  // Chat session routes (protected)
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

      const messages = session.messages || [];
      const newMessage = {
        id: Math.random().toString(36),
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      };

      messages.push(newMessage);

      // Get accumulated preferences from previous interactions
      const currentPreferences = session.extractedPreferences || {};

      // Process with Gemini AI, passing accumulated preferences as context
      const aiResponse = await processConversation(
        messages.map(m => ({ role: m.role, content: m.content })),
        { preferences: currentPreferences }
      );

      console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

      const aiMessage = {
        id: Math.random().toString(36),
        role: 'assistant' as const,
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
      };

      messages.push(aiMessage);

      // Merge new preferences with existing ones (accumulate)
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

      console.log("Extracted preferences (new):", JSON.stringify(newPreferences, null, 2));
      console.log("Merged preferences (total):", JSON.stringify(mergedPreferences, null, 2));

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
            // Extract numbers from strings like "$1,000 - $1,500 USD" or "$1500"
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
      
      // Smart date calculation preserving provided dates
      let startDate = parsedPreferences.startDate;
      let endDate = parsedPreferences.endDate;
      const duration = parsedPreferences.duration || parsedPreferences.days || 7;
      
      if (!startDate && !endDate) {
        // No dates provided - generate defaults
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() + 7); // Start 7 days from now
        
        const end = new Date(start);
        end.setDate(start.getDate() + duration - 1);
        
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      } else if (startDate && !endDate) {
        // Start date provided, calculate end date
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          throw new Error("Invalid start date format");
        }
        const end = new Date(start);
        end.setDate(start.getDate() + duration - 1);
        endDate = end.toISOString().split('T')[0];
      } else if (!startDate && endDate) {
        // End date provided, calculate start date
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          throw new Error("Invalid end date format");
        }
        const start = new Date(end);
        start.setDate(end.getDate() - duration + 1);
        startDate = start.toISOString().split('T')[0];
      }
      // If both dates provided, use them as-is
      
      // Validate that we have valid dates
      if (!startDate || !endDate) {
        throw new Error("Unable to determine trip dates");
      }
      
      // Ensure dates are strings (TypeScript safety)
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
      const { itinerary, feedback } = req.body;
      const optimizedItinerary = await optimizeItinerary(itinerary, feedback);
      
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

  // Saved trips routes (protected)
  // Get current user's saved trips (authenticated)
  app.get("/api/trips/saved", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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

  // Payment routes with Mercado Pago
  // Payment routes with Mercado Pago
  app.post("/api/payments/create-preference", isAuthenticated, async (req, res) => {
    try {
      const { tripId, amount, currency = 'UYU' } = req.body;
      const userId = (req.user as any).claims.sub;

      // 1. Validar viaje
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // 2. Chequear si ya compró
      const existingPurchase = await storage.getPurchaseByTripAndUser(tripId, userId);
      if (existingPurchase) {
        return res.json({ 
          message: "Already purchased", 
          preferenceId: existingPurchase.mercadoPagoPreferenceId,
          alreadyPurchased: true 
        });
      }

      const externalReference = `tobugo-${tripId}-${userId}-${Date.now()}`;
      
      // --- DETECCIÓN DE ENTORNO LOCAL PARA SIMULACIÓN ---
      const host = req.get('host') || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

      // MODO DESARROLLO LOCAL: Simulamos pago exitoso directamente
      // Esto evita errores con Mercado Pago por URLs no válidas (localhost)
      if (isLocal) {
        console.log("Entorno local detectado: Simulando pago exitoso...");
        
        const purchase = await storage.createPurchase({
          userId,
          tripId,
          amount: String(Number(amount) || 99),
          currency,
          status: 'approved', // <--- Creamos la compra ya APROBADA
          mercadoPagoPreferenceId: 'simulated-pref-id-' + Date.now(),
          mercadoPagoExternalReference: externalReference,
          paidAt: new Date()
        });

        return res.json({ 
          preferenceId: purchase.mercadoPagoPreferenceId,
          initPoint: null, 
          sandboxInitPoint: null, 
          purchaseId: externalReference, // Usamos la referencia para que coincida
          simulated: true // <--- Bandera para que el frontend sepa qué hacer
        });
      }
      
      // --- MODO PRODUCCIÓN (Cualquier servidor real) ---
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;

      const claims = (req.user as any).claims;
      // Manejo flexible de nombres según el proveedor de identidad que uses
      const firstName = claims.first_name || claims.firstName || "User";
      const lastName = claims.last_name || claims.lastName || "";

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
          email: claims.email,
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

  // Webhook to receive Mercado Pago notifications
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const { type, data } = req.body;

      // Only process payment notifications
      if (type === 'payment') {
        const paymentId = data.id;
        
        // Get payment information from Mercado Pago
        const paymentInfo = await getPaymentInfo(paymentId);
        
        if (paymentInfo) {
          const externalReference = paymentInfo.external_reference;
          const status = paymentInfo.status;

          // Map Mercado Pago status to our status
          let purchaseStatus = 'pending';
          if (status === 'approved') {
            purchaseStatus = 'approved';
          } else if (status === 'rejected') {
            purchaseStatus = 'rejected';
          } else if (status === 'cancelled') {
            purchaseStatus = 'cancelled';
          }

          // Update purchase in database
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

  // Check if user has purchased a trip
  app.get("/api/payments/check/:tripId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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

  // Get user's purchase history
  app.get("/api/payments/history", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const purchases = await storage.getPurchasesByUserId(userId);
      
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ message: "Failed to get purchase history", error });
    }
  });

  // Place Reviews routes
  // Get all place reviews (public)
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
        // Default: Get recent reviews
        reviews = await storage.getPlaceReviewsByLocation("");
      }
      
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to get place reviews", error });
    }
  });

  // Get single place review (public)
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

  // Create place review (protected)
  app.post("/api/place-reviews", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const reviewData = insertPlaceReviewSchema.parse({ ...req.body, userId });
      const review = await storage.createPlaceReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid place review data", error });
    }
  });

  // Update place review (protected)
  app.put("/api/place-reviews/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const existingReview = await storage.getPlaceReview(req.params.id);
      
      if (!existingReview) {
        return res.status(404).json({ message: "Place review not found" });
      }
      
      // SECURITY: Verify ownership
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

  // Delete place review (protected)
  app.delete("/api/place-reviews/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const existingReview = await storage.getPlaceReview(req.params.id);
      
      if (!existingReview) {
        return res.status(404).json({ message: "Place review not found" });
      }
      
      // SECURITY: Verify ownership
      if (existingReview.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only delete your own reviews" });
      }
      
      await storage.deletePlaceReview(req.params.id);
      res.json({ message: "Place review deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete place review", error });
    }
  });

  // Media upload URL generation (protected)
  app.post("/api/media/upload-url", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { isPublic = false } = req.body;
      
      // Generate upload URL
      const uploadUrl = await objectStorage.getObjectEntityUploadURL();
      
      // Extract object path from upload URL for later reference
      const urlObj = new URL(uploadUrl);
      const objectPath = urlObj.pathname;
      
      res.json({ 
        uploadUrl,
        objectPath,
        isPublic,
        instructions: "After upload, call POST /api/place-reviews/:id/media with objectPath to attach"
      });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      
      // Graceful error handling for missing config
      if (error.message && error.message.includes("not set")) {
        return res.status(503).json({ 
          message: "Object storage not configured", 
          error: "Please configure object storage environment variables",
          details: error.message
        });
      }
      
      res.status(500).json({ message: "Failed to generate upload URL", error: error.message || error });
    }
  });

  // Attach media to place review with ACL policy (protected)
  app.post("/api/place-reviews/:id/media", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const reviewId = req.params.id;
      const { objectPath, isPublic = false } = req.body;
      
      if (!objectPath) {
        return res.status(400).json({ message: "Object path is required" });
      }
      
      // Verify ownership of the place review
      const existingReview = await storage.getPlaceReview(reviewId);
      if (!existingReview) {
        return res.status(404).json({ message: "Place review not found" });
      }
      
      if (existingReview.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only attach media to your own reviews" });
      }
      
      // Set ACL policy for the uploaded object
      const aclPolicy = {
        visibility: isPublic ? "public" : "private" as "public" | "private",
        owner: userId,
        aclRules: []
      };
      
      const normalizedPath = await objectStorage.trySetObjectEntityAclPolicy(objectPath, aclPolicy);
      
      // Update place review with new media URL
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
      
      if (error.message && error.message.includes("not set")) {
        return res.status(503).json({ 
          message: "Object storage not configured",
          error: "Please configure object storage environment variables"
        });
      }
      
      res.status(500).json({ message: "Failed to attach media", error: error.message || error });
    }
  });

  // Media serving route with ACL enforcement (public)
  app.get("/objects/*", async (req, res) => {
    try {
      // Graceful handling for missing object storage config
      try {
        // Use req.path to get full path including /objects/ prefix
        const file = await objectStorage.getObjectEntityFile(req.path);
        
        // Get user ID from authenticated request (optional)
        const userId = req.user ? (req.user as any).claims.sub : undefined;
        
        // CRITICAL: Enforce ACL before serving object
        const canRead = await objectStorage.canAccessObjectEntity({
          userId,
          objectFile: file,
          requestedPermission: ObjectPermission.READ
        });
        
        if (!canRead) {
          console.log(`ACL: Access denied for user ${userId || 'anonymous'} to object ${req.path}`);
          return res.status(403).json({ message: "Forbidden" });
        }
        
        // ACL check passed - serve object
        await objectStorage.downloadObject(file, res);
      } catch (configError: any) {
        if (configError.message && configError.message.includes("not set")) {
          console.error("Object storage config error:", configError.message);
          return res.status(503).json({ 
            message: "Object storage not configured",
            error: "Service temporarily unavailable"
          });
        }
        throw configError;
      }
    } catch (error: any) {
      // Properly handle ObjectNotFoundError
      if (error.name === "ObjectNotFoundError") {
        return res.status(404).json({ message: "Object not found" });
      }
      
      console.error("Error serving object:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Community statistics routes (public)
  app.get("/api/community/stats", async (req, res) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching community stats:", error);
      res.status(500).json({ message: "Failed to fetch community stats", error });
    }
  });

  // Recent reviews routes (public)
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

  // Update review helpful count (protected)
  app.post("/api/reviews/:reviewId/helpful", isAuthenticated, async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      const userId = (req.user as any).claims.sub;
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

  app.put("/api/uploads/:id", isAuthenticated, (req, res) => {
    const objectStorage = new ObjectStorageService();
    // Accedemos al directorio de subida de forma segura
    const uploadDir = require("path").resolve(process.cwd(), "uploads");
    const filePath = require("path").join(uploadDir, req.params.id);
    
    // Creamos un stream de escritura
    const fileStream = require("fs").createWriteStream(filePath);

    // "Pipeamos" (conectamos) la petición directamente al archivo
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