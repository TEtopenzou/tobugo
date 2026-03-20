import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Plus, MapPin, Calendar, DollarSign, Users, Home, ShoppingBag } from "lucide-react";
import PurchaseHistory from "@/components/purchase-history";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

export default function Dashboard() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("home");

//  // Check URL params for tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "purchases") {
      setActiveTab("purchases");
    }
  }, [location]);

  // Fetch recent trips
  const { data: userTrips, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips/user'],
  });

  const formatDate = (date: Date | null) => {
    if (!date) return "Fechas no especificadas";
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4" data-testid="text-welcome-title">
              ¡Bienvenido de vuelta, {user?.firstName || 'viajero'}!
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto" data-testid="text-welcome-subtitle">
              Tu próxima aventura te está esperando. ¿Qué destino exploraremos hoy?
            </p>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b-0 h-auto p-0">
              <TabsTrigger
                value="home"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                data-testid="tab-home"
              >
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </TabsTrigger>
              <TabsTrigger
                value="purchases"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                data-testid="tab-purchases"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Mis Compras
              </TabsTrigger>
            </TabsList>

            {/* Home Tab Content */}
            <TabsContent value="home" className="mt-0">
              {/* Quick Actions */}
              <section className="py-12 bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col md:flex-row md:justify-center gap-6 md:gap-8 mb-12">
                    <Card className="hover:shadow-lg transition-shadow w-full md:w-[480px]" data-testid="card-new-trip">
                      <CardHeader className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle>Nuevo Viaje</CardTitle>
                        <CardDescription>
                          Planifica tu próxima aventura con nuestra IA inteligente
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link href="/chat">
                          <Button className="w-full" data-testid="button-plan-trip">
                            Comenzar a Planificar
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* <Card className="hover:shadow-lg transition-shadow" data-testid="card-community">
                      <CardHeader className="text-center">
                        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="w-6 h-6 text-secondary" />
                        </div>
                        <CardTitle>Comunidad - Próximamente</CardTitle>
                        <CardDescription>
                          Conecta con otros viajeros y comparte experiencias
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link href="/community">
                          <Button variant="secondary" className="w-full" data-testid="button-explore-community">
                            Explorar Comunidad
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card> */}

                    <Card className="hover:shadow-lg transition-shadow w-full md:w-[480px]" data-testid="card-my-trips">
                      <CardHeader className="text-center">
                        <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapPin className="w-6 h-6 text-accent-foreground" />
                        </div>
                        <CardTitle>Mis Viajes</CardTitle>
                        <CardDescription>
                          Revisa y gestiona tus viajes guardados
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full" data-testid="button-my-trips">
                          Ver Mis Viajes
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </section>

              {/* Recent Activity */}
              <section className="py-12 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-2xl font-bold mb-8" data-testid="text-recent-activity">Actividad Reciente</h2>

                  {tripsLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse h-48 bg-card/50" />
                      ))}
                    </div>
                  ) : userTrips && userTrips.length > 0 ? (
                    <div className="px-10">
                      <Carousel
                        opts={{
                          align: "start",
                          loop: false,
                        }}
                        className="w-full"
                      >
                        <CarouselContent className="-ml-2 md:-ml-4">
                          {userTrips.map((trip) => (
                            <CarouselItem key={trip.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                              <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
                                <CardHeader className="flex-none">
                                  <CardTitle className="text-lg line-clamp-2">
                                    {trip.title || "Viaje sin título"}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col flex-1 justify-between">
                                  <div className="space-y-2 mb-4">
                                    {trip.destination && (
                                      <div className="flex items-center text-sm text-muted-foreground line-clamp-1">
                                        <MapPin className="min-w-4 w-4 h-4 mr-2" />
                                        <span className="truncate">{trip.destination}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <Calendar className="min-w-4 w-4 h-4 mr-2" />
                                      <span className="truncate">
                                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                                      </span>
                                    </div>
                                  </div>
                                  <Link href={`/itinerarios`}>
                                    <Button variant="outline" className="w-full" size="sm">
                                      Ver Detalles
                                    </Button>
                                  </Link>
                                </CardContent>
                              </Card>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="disabled:hidden" />
                        <CarouselNext className="disabled:hidden" />
                      </Carousel>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <Card data-testid="card-no-trips">
                        <CardHeader>
                          <CardTitle className="text-lg">¡Empieza tu primer viaje!</CardTitle>
                          <CardDescription>
                            Aún no tienes viajes planificados. ¡Es el momento perfecto para empezar!
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link href="/chat">
                            <Button size="sm" data-testid="button-start-first-trip">
                              Planificar Primer Viaje
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </section>

              {/* Travel Inspiration */}
              {/* <section className="py-12 bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-2xl font-bold mb-8" data-testid="text-inspiration">Inspiración para Viajes</h2>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid="card-destination-europe">
                      <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600"></div>
                      <CardHeader>
                        <CardTitle className="text-lg">Europa</CardTitle>
                        <CardDescription>
                          Ciudades históricas y cultura vibrante
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary" data-testid="badge-popular">Popular</Badge>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid="card-destination-asia">
                      <div className="h-32 bg-gradient-to-br from-green-500 to-teal-600"></div>
                      <CardHeader>
                        <CardTitle className="text-lg">Asia</CardTitle>
                        <CardDescription>
                          Aventuras exóticas y gastronomía única
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" data-testid="badge-trending">Tendencia</Badge>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid="card-destination-america">
                      <div className="h-32 bg-gradient-to-br from-orange-500 to-red-600"></div>
                      <CardHeader>
                        <CardTitle className="text-lg">América</CardTitle>
                        <CardDescription>
                          Diversidad natural y cultural increíble
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary" data-testid="badge-recommended">Recomendado</Badge>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid="card-destination-oceania">
                      <div className="h-32 bg-gradient-to-br from-cyan-500 to-blue-600"></div>
                      <CardHeader>
                        <CardTitle className="text-lg">Oceanía</CardTitle>
                        <CardDescription>
                          Playas paradisíacas y vida salvaje única
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" data-testid="badge-adventure">Aventura</Badge>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </section> */}
            </TabsContent>

            {/* Purchases Tab Content */}
            <TabsContent value="purchases" className="mt-0">
              <section className="py-12 bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <PurchaseHistory />
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
