import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import ChatInterface from "@/components/chat-interface";
import ItineraryDisplay from "@/components/itinerary-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [match, params] = useRoute("/chat/:id");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(params?.id || null);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ id: string, role: string, content: string, timestamp: string }>>([]);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Create new chat session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat", {
        userId: user?.id,
        messages: [],
        status: "active"
      });
      return response.json();
    },
    onSuccess: (session) => {
      setCurrentSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ['/api/chat', session.id] });
    },
  });

  // Get current chat session with persistent history
  const { data: chatSession, isLoading: sessionLoading } = useQuery<{
    id: string;
    messages?: Array<{ id: string, role: string, content: string, timestamp: string }>;
    status: string;
  }>({
    queryKey: ['/api/chat', currentSessionId],
    enabled: !!currentSessionId,
  });

  // Update chat history when session data changes
  useEffect(() => {
    if (chatSession?.messages) {
      setChatHistory(chatSession.messages);
    }
  }, [chatSession]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, tempId }: { message: string, tempId: string }) => {
      if (!currentSessionId) throw new Error("No active session");

      const response = await apiRequest("POST", `/api/chat/${currentSessionId}/message`, {
        message
      });
      return { data: await response.json(), tempId };
    },
    onMutate: async ({ message, tempId }) => {
      // Optimistic update: add user message immediately to chat history
      const userMessage = {
        id: tempId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, userMessage]);

      return { tempId };
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', currentSessionId] });

      if (data.shouldGenerateItinerary && data.extractedPreferences) {
        generateItineraryMutation.mutate(data.extractedPreferences);
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.tempId) {
        setChatHistory(prev => prev.filter(msg => msg.id !== context.tempId));
      }
      console.error("Error sending message:", error);

      // Notify user
      toast({
        title: "Error al enviar mensaje",
        description: "No se pudo enviar tu mensaje. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Generate itinerary mutation
  const generateItineraryMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await apiRequest("POST", "/api/ai/generate-itinerary", preferences);
      return response.json();
    },
    onSuccess: (itinerary, preferences) => {
      setGeneratedItinerary(itinerary);
      // Save the itinerary as a trip to the database
      saveTripMutation.mutate({ itinerary, preferences });
    },
  });

  // Save trip mutation
  const saveTripMutation = useMutation({
    mutationFn: async ({ itinerary, preferences }: { itinerary: any, preferences: any }) => {
      const tripData = {
        userId: user?.id,
        title: `Viaje a ${preferences.destination}`,
        destination: preferences.destination,
        startDate: new Date(preferences.startDate).toISOString(),
        endDate: new Date(preferences.endDate).toISOString(),
        budget: preferences.budget || itinerary.totalCost,
        preferences: {
          accommodation: preferences.accommodationType,
          activities: preferences.activities,
          travelStyle: preferences.travelStyle,
          dietaryRestrictions: preferences.dietaryRestrictions
        },
        itinerary: itinerary,
        isPublic: false // Default to private, user can change later
      };

      const response = await apiRequest("POST", "/api/trips", tripData);
      return response.json();
    },
    onSuccess: (savedTrip) => {
      console.log("Trip saved successfully:", savedTrip.id);
      setSavedTripId(savedTrip.id); // Save trip ID for checkout
      queryClient.invalidateQueries({ queryKey: ['/api/trips/public'] });
    },
  });

  // Optimize itinerary mutation
  const optimizeItineraryMutation = useMutation({
    mutationFn: async ({ feedback, selectedActivity }: { feedback: string, selectedActivity?: any }) => {
      if (!generatedItinerary) throw new Error("No itinerary to optimize");

      const response = await apiRequest("POST", "/api/ai/optimize-itinerary", {
        itinerary: generatedItinerary,
        feedback,
        selectedActivity
      });
      return response.json();
    },
    onSuccess: (optimizedItinerary) => {
      setGeneratedItinerary(optimizedItinerary);
    },
  });

  useEffect(() => {
    // Only create session if user is authenticated, no current session, not on specific route, and not already creating
    if (isAuthenticated && !currentSessionId && !match && !createSessionMutation.isPending) {
      createSessionMutation.mutate();
    }
  }, [currentSessionId, match, isAuthenticated, createSessionMutation.isPending]);

  const handleSendMessage = (message: string) => {
    if (currentSessionId) {
      const tempId = `temp-${Date.now()}`;
      sendMessageMutation.mutate({ message, tempId });
    }
  };

  // Show loading while auth is loading or session is loading
  if (authLoading || (!currentSessionId && !createSessionMutation.isPending) || sessionLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authLoading ? 'Verificando autenticación...' : 'Iniciando conversación...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!generatedItinerary ? (
        <div>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2" data-testid="text-chat-title">
              <MessageSquare className="h-8 w-8 text-primary" />
              Cuéntanos sobre tu viaje
            </h1>
            <p className="text-muted-foreground text-lg" data-testid="text-chat-subtitle">
              Responde unas preguntas y crearemos tu itinerario ideal
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <ChatInterface
                session={{ ...chatSession, messages: chatHistory } as any}
                onSendMessage={handleSendMessage}
                isLoading={sendMessageMutation.isPending}
              />
            </div>

            {/* Quick Options */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" data-testid="text-quick-responses">Respuestas rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("15-20 de Marzo, 2024")}
                    data-testid="button-quick-dates"
                  >
                    <svg className="h-4 w-4 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    15-20 de Marzo, 2024
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("$1,000 - $1,500 USD")}
                    data-testid="button-quick-budget"
                  >
                    <svg className="h-4 w-4 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    $1,000 - $1,500 USD
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("Me gusta la cultura e historia")}
                    data-testid="button-quick-culture"
                  >
                    <svg className="h-4 w-4 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Cultura e Historia
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("Hotel 3-4 estrellas")}
                    data-testid="button-quick-accommodation"
                  >
                    <svg className="h-4 w-4 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
                    </svg>
                    Hotel 3-4 estrellas
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Generated Itinerary Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2" data-testid="text-itinerary-title">
              <Sparkles className="h-8 w-8 text-primary" />
              Tu Itinerario Personalizado
            </h1>
            <p className="text-muted-foreground text-lg" data-testid="text-itinerary-subtitle">
              Creado especialmente para ti con inteligencia artificial
            </p>
          </div>

          <ItineraryDisplay
            itinerary={generatedItinerary}
            tripId={savedTripId || undefined}
            onModify={(feedback, selectedActivity) => {
              optimizeItineraryMutation.mutate({ feedback, selectedActivity });
            }}
            onItineraryUpdate={(newItinerary) => {
              setGeneratedItinerary(newItinerary);
            }}
          />
        </div>
      )}

      {(generateItineraryMutation.isPending || optimizeItineraryMutation.isPending) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2" data-testid="text-generating">
                {generateItineraryMutation.isPending ? "Generando tu itinerario..." : "Optimizando tu itinerario..."}
              </h3>
              <p className="text-muted-foreground text-sm">
                {generateItineraryMutation.isPending
                  ? "Nuestra IA está creando el viaje perfecto para ti"
                  : "Aplicando tus cambios al itinerario"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
