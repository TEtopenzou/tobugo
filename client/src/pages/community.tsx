import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CommunityCard from "@/components/community-card";
import { Users, TrendingUp, MessageSquare, ThumbsUp, Calendar, DollarSign, Star, Plus, MessageCircle, Search, Filter, X } from "lucide-react";

// Types for API responses
interface CommunityStats {
  totalTrips: number;
  totalUsers: number;
  totalReviews: number;
  averageRating: number;
}

interface ReviewWithUser {
  id: string;
  userId: string;
  tripId: string | null;
  targetType: string;
  targetId: string;
  rating: number;
  comment: string | null;
  helpful: number | null;
  createdAt: Date | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  targetName?: string;
}

export default function Community() {
  const [activeTab, setActiveTab] = useState("itinerarios");
  const { toast } = useToast();

  // Filter states
  const [filters, setFilters] = useState({
    destination: "",
    minBudget: "",
    maxBudget: "",
    minDuration: "",
    maxDuration: "",
    travelStyle: ""
  });
  const [showFilters, setShowFilters] = useState(false);

  // Mutation for saving trips to user's itinerary
  const saveToItineraryMutation = useMutation({
    mutationFn: async (tripId: string) => {
      return apiRequest('POST', '/api/saved-trips', {
        tripId,
        userId: 'current-user' // This will be replaced with actual user ID by backend
      });
    },
    onSuccess: () => {
      toast({
        title: "¡Guardado exitosamente!",
        description: "El itinerario se añadió a tus viajes guardados",
      });
      // Invalidate saved trips query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trips/saved'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar",
        description: error?.message || "No se pudo guardar el itinerario",
        variant: "destructive",
      });
    },
  });

  const handleSaveTrip = (tripId: string) => {
    saveToItineraryMutation.mutate(tripId);
  };

  // Get public trips with filters
  const { data: publicTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ['/api/trips/public', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const url = params.toString() ? `/api/trips/public?${params}` : '/api/trips/public';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch trips');
      return response.json();
    },
  });

  // Get community statistics and reviews
  const { data: communityStats } = useQuery<CommunityStats>({
    queryKey: ['/api/community/stats'],
  });

  const { data: recentReviews, isLoading: reviewsLoading } = useQuery<ReviewWithUser[]>({
    queryKey: ['/api/reviews/recent'],
  });

  // Mutation for marking review as helpful
  const helpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 409) {
        throw new Error('Ya has marcado esta reseña como útil');
      }

      if (!response.ok) {
        throw new Error('Error al marcar la reseña como útil');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/recent'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Error al marcar la reseña como útil",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const formatRelativeTime = (date: Date | null) => {
    if (!date) return "Recientemente";
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Hoy";
    if (diffInDays === 1) return "Ayer";
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    return new Date(date).toLocaleDateString('es-ES');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2" data-testid="text-community-title">
          <Users className="h-8 w-8 text-primary" />
          Comunidad de Viajeros
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-community-subtitle">
          Conecta con otros viajeros, comparte experiencias y obtén recomendaciones de primera mano
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-trips">
                  {communityStats?.totalTrips || 0}
                </p>
                <p className="text-xs text-muted-foreground">Itinerarios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-users">
                  {communityStats?.totalUsers || 0}
                </p>
                <p className="text-xs text-muted-foreground">Viajeros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-reviews">
                  {communityStats?.totalReviews || 0}
                </p>
                <p className="text-xs text-muted-foreground">Reseñas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stat-rating">
                  {communityStats?.averageRating ? communityStats.averageRating.toFixed(1) : "0.0"}
                </p>
                <p className="text-xs text-muted-foreground">Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="itinerarios" data-testid="tab-itinerarios">Itinerarios Populares</TabsTrigger>
          <TabsTrigger value="reseñas" data-testid="tab-reseñas">Reseñas Recientes</TabsTrigger>
          <TabsTrigger value="contribuciones" data-testid="tab-contribuciones">Mis Contribuciones</TabsTrigger>
        </TabsList>

        <TabsContent value="itinerarios" className="space-y-6">
          {/* Advanced Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar destino..."
                value={filters.destination}
                onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
                className="pl-10"
                data-testid="input-search-destination"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros {showFilters && <X className="h-4 w-4 ml-2" />}
            </Button>
            {Object.values(filters).some(v => v) && (
              <Button
                variant="ghost"
                onClick={() => setFilters({ destination: "", minBudget: "", maxBudget: "", minDuration: "", maxDuration: "", travelStyle: "" })}
                className="shrink-0"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>

          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Presupuesto Mínimo</label>
                  <Input
                    type="number"
                    placeholder="$500"
                    value={filters.minBudget}
                    onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
                    data-testid="input-min-budget"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Presupuesto Máximo</label>
                  <Input
                    type="number"
                    placeholder="$5000"
                    value={filters.maxBudget}
                    onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
                    data-testid="input-max-budget"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Duración Mínima (días)</label>
                  <Input
                    type="number"
                    placeholder="3"
                    value={filters.minDuration}
                    onChange={(e) => setFilters({ ...filters, minDuration: e.target.value })}
                    data-testid="input-min-duration"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Duración Máxima (días)</label>
                  <Input
                    type="number"
                    placeholder="21"
                    value={filters.maxDuration}
                    onChange={(e) => setFilters({ ...filters, maxDuration: e.target.value })}
                    data-testid="input-max-duration"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Tipo de Viaje</label>
                <Select value={filters.travelStyle} onValueChange={(value) => setFilters({ ...filters, travelStyle: value })}>
                  <SelectTrigger data-testid="select-travel-style">
                    <SelectValue placeholder="Seleccionar estilo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="aventura">Aventura</SelectItem>
                    <SelectItem value="relajacion">Relajación</SelectItem>
                    <SelectItem value="gastronomico">Gastronómico</SelectItem>
                    <SelectItem value="deportes">Deportes</SelectItem>
                    <SelectItem value="familiar">Familiar</SelectItem>
                    <SelectItem value="romantico">Romántico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}

          {tripsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="h-48 bg-muted"></div>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicTrips && Array.isArray(publicTrips) && publicTrips.length > 0 ? (
                (publicTrips as any[]).map((trip: any) => (
                  <CommunityCard key={trip.id} trip={trip} onSave={handleSaveTrip} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2" data-testid="text-no-trips-title">
                        No hay itinerarios públicos aún
                      </h3>
                      <p className="text-muted-foreground mb-4" data-testid="text-no-trips-subtitle">
                        Sé el primero en compartir tu experiencia de viaje con la comunidad
                      </p>
                      <Button data-testid="button-share-trip">
                        <Plus className="h-4 w-4 mr-2" />
                        Compartir Itinerario
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reseñas" className="space-y-4">
          {reviewsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentReviews && recentReviews.length > 0 ? (
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-sm font-medium">
                        {review.user.firstName?.charAt(0) || review.user.lastName?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="font-medium" data-testid={`text-reviewer-name-${review.id}`}>
                            {review.user.firstName && review.user.lastName
                              ? `${review.user.firstName} ${review.user.lastName}`
                              : `Usuario #${review.userId.slice(-6)}`
                            }
                          </p>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`text-sm ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground" data-testid={`text-review-target-${review.id}`}>
                            {review.targetName || review.targetId}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2" data-testid={`text-review-comment-${review.id}`}>
                          {review.comment || "Sin comentario"}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span data-testid={`text-review-date-${review.id}`}>
                            {formatRelativeTime(review.createdAt)}
                          </span>
                          <Button variant="ghost" size="sm" className="h-auto p-0" data-testid={`button-reply-${review.id}`}>
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Responder
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => helpfulMutation.mutate(review.id)}
                            disabled={helpfulMutation.isPending}
                            data-testid={`button-helpful-${review.id}`}
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {review.helpful || 0}
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
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-reviews-title">
                    No hay reseñas aún
                  </h3>
                  <p className="text-muted-foreground mb-4" data-testid="text-no-reviews-subtitle">
                    Sé el primero en compartir tu experiencia y ayudar a otros viajeros
                  </p>
                  <Button data-testid="button-write-first-review">
                    <Star className="h-4 w-4 mr-2" />
                    Escribir Primera Reseña
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contribuciones">
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-contributions-title">
                  Aún no has contribuido
                </h3>
                <p className="text-muted-foreground mb-4" data-testid="text-no-contributions-subtitle">
                  Comparte tus experiencias de viaje para ayudar a otros viajeros
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button data-testid="button-share-itinerary">
                    <Plus className="h-4 w-4 mr-2" />
                    Compartir Itinerario
                  </Button>
                  <Button variant="outline" data-testid="button-write-review">
                    <Star className="h-4 w-4 mr-2" />
                    Escribir Reseña
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
