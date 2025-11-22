import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Lock, Loader2, Download, CreditCard, Shield } from "lucide-react";
import { SiMercadopago } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: {
    id: string;
    title: string;
    destination: string;
    totalCost?: number;
    days?: any[];
  };
  onPurchaseComplete?: () => void;
}

export default function CheckoutModal({ isOpen, onClose, trip, onPurchaseComplete }: CheckoutModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const PRICE_UYU = 80; // Approximately 2 USD
  const PRICE_USD = 2.00;

  // Check if already purchased
  const { data: purchaseCheck } = useQuery<{ hasPurchased: boolean }>({
    queryKey: ["/api/payments/check", trip.id],
    enabled: isOpen && !!trip.id,
  });

  const createPreferenceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments/create-preference", {
        tripId: trip.id,
        amount: PRICE_UYU,
        currency: "UYU",
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.alreadyPurchased) {
        toast({
          title: "Ya compraste este itinerario",
          description: "Puedes descargarlo directamente.",
        });
        onPurchaseComplete?.();
        onClose();
      } else if (data.simulated) {
        // MANEJO DE SIMULACIÓN LOCAL
        // Si el backend nos dice que fue simulado, redirigimos directo al éxito
        toast({
          title: "Pago Simulado (Local)",
          description: "Compra aprobada automáticamente para pruebas.",
        });
        
        // Construimos la URL de éxito simulando los parámetros que enviaría MP
        window.location.href = `/payment/success?status=approved&payment_id=simulated&external_reference=${data.purchaseId}`;
      } else {
        // FLUJO DE PRODUCCIÓN REAL
        const checkoutUrl = data.sandboxInitPoint || data.initPoint;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error al procesar el pago",
        description: error.message || "No se pudo crear la preferencia de pago",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleCheckout = () => {
    setIsProcessing(true);
    createPreferenceMutation.mutate();
  };

  // If already purchased, show download option
  if (purchaseCheck?.hasPurchased) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-already-purchased">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Ya tienes acceso
            </DialogTitle>
            <DialogDescription>
              Ya compraste este itinerario. Puedes descargarlo cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={onClose} data-testid="button-close-purchased">
              Cerrar
            </Button>
            <Button onClick={() => {
              onPurchaseComplete?.();
              onClose();
            }} data-testid="button-download-purchased">
              <Download className="h-4 w-4 mr-2" />
              Descargar Ahora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-checkout">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" data-testid="text-checkout-title">
            Descargar Itinerario
          </DialogTitle>
          <DialogDescription>
            Obtén acceso completo para descargar tu itinerario en PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-trip-title">
                  {trip.title || trip.destination}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid="text-trip-destination">
                  {trip.destination}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Incluye:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Itinerario completo día a día en formato PDF</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Desglose detallado de costos y actividades</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Recomendaciones personalizadas de IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Acceso ilimitado a futuras descargas</span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Precio</span>
                  <div className="text-right">
                    <p className="text-3xl font-bold" data-testid="text-price-uyu">
                      ${PRICE_UYU} <span className="text-base font-normal text-muted-foreground">UYU</span>
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-price-usd">
                      ≈ ${PRICE_USD} USD
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Pago seguro</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>SSL cifrado</span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full h-12 text-base"
            size="lg"
            data-testid="button-checkout"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pagar con Mercado Pago
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <SiMercadopago className="h-4 w-4" />
            <span>Procesado de forma segura por Mercado Pago</span>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Al continuar, aceptas nuestros términos de servicio. 
            Política de reembolso disponible dentro de 7 días.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}