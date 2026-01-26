import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import CostSummary from "@/components/cost-summary";
import CheckoutModal from "@/components/checkout-modal";
import { Edit, Download, Calendar, MapPin, Plane, Bed, Utensils, Car, Send, Lock, Trash, X } from "lucide-react";
import { generatePDF } from "@/lib/pdf-generator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ItineraryDisplayProps {
  itinerary: any;
  tripId?: string;
  onModify: (feedback: string, selectedActivity?: any) => void;
  onItineraryUpdate?: (itinerary: any) => void;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'flight':
      return <Plane className="h-5 w-5" />;
    case 'accommodation':
      return <Bed className="h-5 w-5" />;
    case 'meal':
      return <Utensils className="h-5 w-5" />;
    case 'transport':
      return <Car className="h-5 w-5" />;
    case 'activity':
    default:
      return <MapPin className="h-5 w-5" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'flight':
      return 'bg-primary';
    case 'accommodation':
      return 'bg-secondary';
    case 'meal':
      return 'bg-accent';
    case 'transport':
      return 'bg-secondary';
    case 'activity':
    default:
      return 'bg-accent';
  }
};

export default function ItineraryDisplay({ itinerary, tripId, onModify, onItineraryUpdate }: ItineraryDisplayProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [selectedActivity, setSelectedActivity] = useState<{ dayIndex: number; activityIndex: number } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [modificationText, setModificationText] = useState("");
  const [isModificationDialogOpen, setIsModificationDialogOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has purchased this trip
  const { data: purchaseCheck, refetch: refetchPurchaseCheck } = useQuery<{ hasPurchased: boolean }>({
    queryKey: ["/api/payments/check", tripId],
    enabled: !!tripId && !!user,
  });

  const toggleDay = (index: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDays(newExpanded);
  };

  const handleDeleteConfirm = () => {
    if (!selectedActivity || !onItineraryUpdate) return;

    const { dayIndex, activityIndex } = selectedActivity;
    const newItinerary = JSON.parse(JSON.stringify(itinerary));
    const day = newItinerary.days[dayIndex];
    const activity = day.activities[activityIndex];

    // Remove activity
    day.activities.splice(activityIndex, 1);

    // Update costs if available
    if (activity.cost) {
      day.totalCost = Math.max(0, (day.totalCost || 0) - activity.cost);
      newItinerary.totalCost = Math.max(0, (newItinerary.totalCost || 0) - activity.cost);
    }

    onItineraryUpdate(newItinerary);
    setSelectedActivity(null);
    setIsDeleteDialogOpen(false);

    toast({
      title: "Actividad eliminada",
      description: "La actividad ha sido eliminada del itinerario.",
    });
  };

  const handleDownloadPDF = async () => {
    // If no tripId, allow free download (for trips created in current session)
    if (!tripId) {
      try {
        await generatePDF(itinerary);
        toast({
          title: "PDF descargado",
          description: "Tu itinerario se descargó correctamente",
        });
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
          title: "Error al generar PDF",
          description: "No se pudo generar el archivo",
          variant: "destructive",
        });
      }
      return;
    }

    // Check if user is logged in
    if (!user) {
      toast({
        title: "Inicia sesión para descargar",
        description: "Necesitas tener una cuenta para descargar itinerarios",
        variant: "destructive",
      });
      return;
    }

    // Check if user has purchased
    if (purchaseCheck?.hasPurchased) {
      try {
        await generatePDF(itinerary);
        toast({
          title: "PDF descargado",
          description: "Tu itinerario se descargó correctamente",
        });
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
          title: "Error al generar PDF",
          description: "No se pudo generar el archivo",
          variant: "destructive",
        });
      }
    } else {
      // Show checkout modal
      setIsCheckoutOpen(true);
    }
  };

  const handlePurchaseComplete = async () => {
    await refetchPurchaseCheck();
    await generatePDF(itinerary);
    toast({
      title: "¡Compra exitosa!",
      description: "Tu PDF se está descargando ahora",
    });
  };

  const handleSendModification = () => {
    if (modificationText.trim()) {
      let activityContext = undefined;

      if (selectedActivity) {
        const { dayIndex, activityIndex } = selectedActivity;
        if (itinerary.days[dayIndex] && itinerary.days[dayIndex].activities[activityIndex]) {
          activityContext = {
            ...itinerary.days[dayIndex].activities[activityIndex],
            dayIndex, // Pass indices as well for context if needed
            activityIndex,
            date: itinerary.days[dayIndex].date
          };
        }
      }

      onModify(modificationText, activityContext);
      setModificationText("");
      setIsModificationDialogOpen(false);
    }
  };

  if (!itinerary || !itinerary.days) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudo cargar el itinerario.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Itinerary Content - Left Side */}
      <div className="lg:col-span-3 space-y-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-itinerary-header">
              Tu Itinerario Personalizado
            </h2>
            <p className="text-muted-foreground">
              {itinerary.days?.length} días • ${itinerary.totalCost?.toLocaleString()} total
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
              variant={purchaseCheck?.hasPurchased || !tripId ? "default" : "outline"}
            >
              {purchaseCheck?.hasPurchased || !tripId ? (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Descargar PDF ($99)
                </>
              )}
            </Button>
          </div>

          {/* Checkout Modal */}
          {tripId && (
            <CheckoutModal
              isOpen={isCheckoutOpen}
              onClose={() => setIsCheckoutOpen(false)}
              trip={{
                id: tripId,
                title: itinerary.title || `Viaje a ${itinerary.destination || 'destino'}`,
                destination: itinerary.destination || 'Destino desconocido',
                totalCost: itinerary.totalCost,
                days: itinerary.days,
              }}
              onPurchaseComplete={handlePurchaseComplete}
            />
          )}
        </div>

        {/* Itinerary Days */}
        <div className="space-y-6">
          {itinerary.days?.map((day: any, index: number) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleDay(index)}
                data-testid={`header-day-${index}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">
                        Día {index + 1} - {day.activities?.[0]?.title || 'Actividades del día'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${day.totalCost?.toLocaleString() || '0'}</p>
                    <p className="text-sm text-muted-foreground">
                      {expandedDays.has(index) ? 'Contraer' : 'Expandir'}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {expandedDays.has(index) && (
                <CardContent className="space-y-4">
                  {day.activities?.map((activity: any, actIndex: number) => (
                    <div
                      key={actIndex}
                      className={`flex items-center space-x-4 p-4 rounded-lg cursor-pointer transition-all border-2 relative group ${selectedActivity?.dayIndex === index && selectedActivity?.activityIndex === actIndex
                        ? "bg-green-500/20 border-green-500"
                        : "bg-muted border-transparent hover:bg-muted/80"
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedActivity?.dayIndex === index && selectedActivity?.activityIndex === actIndex) {
                          setSelectedActivity(null);
                        } else {
                          setSelectedActivity({ dayIndex: index, activityIndex: actIndex });
                        }
                      }}
                      data-testid={`activity-${index}-${actIndex}`}
                    >
                      <div className={`w-10 h-10 ${getActivityColor(activity.type)} rounded-full flex items-center justify-center text-white`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium" data-testid={`text-activity-title-${index}-${actIndex}`}>
                          {activity.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {activity.time} {activity.location && ` • ${activity.location}`}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-activity-description-${index}-${actIndex}`}>
                            {activity.description}
                          </p>
                        )}
                      </div>
                      {activity.cost && (
                        <div className="text-right">
                          <p className="font-medium text-primary" data-testid={`text-activity-cost-${index}-${actIndex}`}>
                            ${activity.cost}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {activity.type === 'accommodation' ? 'Por noche' : 'Estimado'}
                          </p>
                        </div>
                      )}

                      {/* Delete Button - Always visible */}
                      <div className="absolute right-2 top-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivity({ dayIndex: index, activityIndex: actIndex });
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Day Total */}
                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-medium">Total del día</span>
                    <span className="text-lg font-bold text-primary" data-testid={`text-day-total-${index}`}>
                      ${day.totalCost?.toLocaleString() || '0'}
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Show more days button if some are collapsed */}
          {itinerary.days?.length > 3 && expandedDays.size < itinerary.days.length && (
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setExpandedDays(new Set(Array.from({ length: itinerary.days.length }, (_, i) => i)))}
                data-testid="button-show-all-days"
              >
                Ver todos los días ({itinerary.days.length - expandedDays.size} restantes)
              </Button>
            </div>
          )}
        </div>

        {/* Cost Summary */}
        <CostSummary
          totalCost={itinerary.totalCost}
          costBreakdown={itinerary.costBreakdown}
          days={itinerary.days?.length || 0}
        />
      </div>

      {/* Modification Panel - Right Side */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Modificar Itinerario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Dime qué cambios te gustaría hacer:
            </p>
            <div className="space-y-2">
              <Input
                placeholder="Ej: Añadir más tiempo en el museo..."
                value={modificationText}
                onChange={(e) => setModificationText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendModification()}
                data-testid="input-modification-text"
                className="text-sm"
              />
              <Button
                onClick={handleSendModification}
                disabled={!modificationText.trim()}
                data-testid="button-send-modification"
                size="sm"
                className="w-full"
              >
                <Send className="h-3 w-3 mr-2" />
                Enviar
              </Button>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Ejemplos de modificaciones:
              </p>
              <div className="space-y-1">
                {[
                  "Cambiar el hotel por uno más económico",
                  "Agregar tiempo libre en la tarde",
                  "Incluir más restaurantes locales",
                  "Reducir actividades del día 2"
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setModificationText(example)}
                    className="text-xs text-left text-muted-foreground hover:text-foreground transition-colors p-1 rounded text-wrap block w-full hover:bg-muted/50"
                  >
                    • {example}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la actividad del itinerario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
