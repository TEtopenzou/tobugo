import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Share2, Download, Edit3, Trash2, Eye, Plus } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast"; // Importamos el hook de notificaciones
import { generatePDF } from "@/lib/pdf-generator"; // Importamos la función generadora

// Types for user trips
interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  currency: string | null;
  isPublic: boolean;
  itinerary: any;
  preferences: any;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function Itinerarios() {
  const { user } = useAuth();
  const { toast } = useToast(); // Inicializamos el toast

  // Get user's trips
  const { data: userTrips, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips/user'],
  });

  // Get user's saved trips
  const { data: savedTrips, isLoading: savedLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips/saved'],
  });

  const formatDate = (date: Date | null) => {
    if (!date) return "Fecha no especificada";
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatBudget = (budget: number | null, currency: string | null) => {
    if (!budget) return "Presupuesto no especificado";
    return `${budget.toLocaleString()} ${currency || 'EUR'}`;
  };

  // Función para manejar la descarga del PDF
  const handleDownload = async (trip: Trip) => {
    if (!trip.itinerary) {
      toast({
        title: "Error al descargar",
        description: "Este viaje no tiene un itinerario generado disponible.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generando PDF...",
        description: "Tu descarga comenzará en breve.",
      });
      
      await generatePDF(trip.itinerary);
      
      toast({
        title: "Descarga completada",
        description: "El archivo PDF se ha guardado correctamente.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Ocurrió un problema al generar el PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-4" data-testid="text-itinerarios-title">
                Mis Itinerarios
              </h1>
              <p className="text-xl opacity-90" data-testid="text-itinerarios-subtitle">
                Gestiona y organiza todos tus planes de viaje
              </p>
            </div>
            <Link href="/chat">
              <Button 
                variant="secondary" 
                size="lg" 
                className="mt-4 sm:mt-0"
                data-testid="button-new-itinerary"
              >
                <Plus className="mr-2 w-5 h-5" />
                Nuevo Itinerario
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="mis-viajes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="mis-viajes" data-testid="tab-my-trips">
                Mis Viajes ({userTrips?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="guardados" data-testid="tab-saved-trips">
                Guardados ({savedTrips?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mis-viajes" className="space-y-6">
              {tripsLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="h-4 bg-muted rounded"></div>
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : userTrips && userTrips.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userTrips.map((trip) => (
                    <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2" data-testid={`text-trip-title-${trip.id}`}>
                              {trip.title || "Viaje sin título"}
                            </CardTitle>
                            <CardDescription className="mt-1" data-testid={`text-trip-description-${trip.id}`}>
                              {trip.description || "Sin descripción"}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            {trip.isPublic && (
                              <Badge variant="secondary" data-testid={`badge-public-${trip.id}`}>
                                Público
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {trip.destination && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span data-testid={`text-trip-destination-${trip.id}`}>
                                {trip.destination}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span data-testid={`text-trip-dates-${trip.id}`}>
                              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                            </span>
                          </div>

                          {trip.budget && (
                            <div className="text-sm font-medium text-primary" data-testid={`text-trip-budget-${trip.id}`}>
                              {formatBudget(trip.budget, trip.currency)}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-${trip.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-edit-${trip.id}`}>
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-share-${trip.id}`}>
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                data-testid={`button-download-${trip.id}`}
                                onClick={() => handleDownload(trip)} // Conectamos la función aquí
                                title="Descargar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-${trip.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-no-trips-title">
                        Aún no tienes viajes planeados
                      </h3>
                      <p className="text-muted-foreground mb-4" data-testid="text-no-trips-subtitle">
                        ¡Comienza a planificar tu próxima aventura ahora!
                      </p>
                      <Link href="/chat">
                        <Button data-testid="button-create-first-trip">
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Mi Primer Viaje
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="guardados" className="space-y-6">
              {savedLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="h-4 bg-muted rounded"></div>
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : savedTrips && savedTrips.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedTrips.map((trip) => (
                    <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2" data-testid={`text-saved-trip-title-${trip.id}`}>
                              {trip.title || "Viaje sin título"}
                            </CardTitle>
                            <CardDescription className="mt-1" data-testid={`text-saved-trip-description-${trip.id}`}>
                              {trip.description || "Sin descripción"}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge variant="outline" data-testid={`badge-saved-${trip.id}`}>
                              Guardado
                            </Badge>
                            {trip.isPublic && (
                              <Badge variant="secondary" data-testid={`badge-saved-public-${trip.id}`}>
                                Público
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {trip.destination && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span data-testid={`text-saved-trip-destination-${trip.id}`}>
                                {trip.destination}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span data-testid={`text-saved-trip-dates-${trip.id}`}>
                              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                            </span>
                          </div>
                          
                          {trip.budget && (
                            <div className="text-sm font-medium text-primary" data-testid={`text-saved-trip-budget-${trip.id}`}>
                              {formatBudget(trip.budget, trip.currency)}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-saved-${trip.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-share-saved-${trip.id}`}>
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                data-testid={`button-download-saved-${trip.id}`}
                                onClick={() => handleDownload(trip)} // Conectamos la función también aquí
                                title="Descargar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-remove-saved-${trip.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-no-saved-title">
                        No tienes viajes guardados
                      </h3>
                      <p className="text-muted-foreground mb-4" data-testid="text-no-saved-subtitle">
                        Explora la comunidad y guarda itinerarios que te inspiren
                      </p>
                      <Link href="/community">
                        <Button data-testid="button-explore-community">
                          Explorar Comunidad
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}