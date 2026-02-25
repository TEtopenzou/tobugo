import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ArrowRight, Sparkles, Users, MapPin, Star, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/auth-modal"; // Importamos el modal
import userVideo1 from "@assets/230575_small_1757936852080.mp4";
import userVideo2 from "@assets/12584129_1080_1920_60fps_1757937267745.mp4";
import userVideo3 from "@assets/16119043-hd_1080_1920_30fps (1)_1757937270131.mp4";

const videoSources = [
  userVideo1,
  userVideo2,
  userVideo3
];

export function VideoHero() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Estado para el modal
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const handleStartPlanning = () => {
    if (isAuthenticated) {
      setLocation("/chat");
    } else {
      // Si no está logueado, abrimos el modal en lugar de redirigir a /api/login
      setIsAuthModalOpen(true);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % videoSources.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [videoSources.length]);

  const handleVideoLoad = () => {
    console.log("Video loaded successfully:", videoSources[currentVideoIndex]);
    setIsVideoLoaded(true);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video failed to load:", videoSources[currentVideoIndex], e);
  };

  return (
    <section className="relative min-h-screen overflow-hidden" data-active-video-index={currentVideoIndex}>
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          key={currentVideoIndex}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={handleVideoLoad}
          onError={handleVideoError}
          src={videoSources[currentVideoIndex]}
          data-testid="hero-video"
          data-active-index={currentVideoIndex}
        />

        {/* Professional Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-deep/80 via-ocean-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-in fade-in slide-in-from-top-4 duration-700" data-testid="hero-badge">
              <Sparkles className="h-4 w-4 text-coral" />
              <span className="text-sm font-medium">Planificación inteligente con IA</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-8 duration-1000" data-testid="text-hero-title">
              Planifica tu viaje perfecto
              <span className="block mt-2 bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                con Inteligencia Artificial
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150" data-testid="text-hero-subtitle">
              Crea itinerarios personalizados en minutos, descubre destinos únicos
              y conecta con una comunidad de viajeros apasionados
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Button
                size="lg"
                className="bg-coral hover:bg-coral/90 text-white px-8 h-14 text-lg sm:px-16 sm:py-5 sm:h-auto sm:text-4xl font-semibold shadow-xl shadow-coral/20 transition-all hover:shadow-2xl hover:shadow-coral/30 hover:scale-105 min-w-[240px] sm:min-w-[480px]"
                data-testid="button-start-planning"
                onClick={handleStartPlanning}
                disabled={isLoading}
              >
                Comenzar a Planificar
                <ArrowRight className="ml-2 h-5 w-5 sm:ml-4 sm:h-10 sm:w-10" />
              </Button>
              {/* <Link href="/community">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 px-8 h-14 text-lg font-semibold min-w-[240px]"
                  data-testid="button-explore-community"
                >
                  Explorar Comunidad
                  <Users className="ml-2 h-5 w-5" />
                </Button>
              </Link> */}
            </div>

            {/* Social Proof / Trust Signals */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-white/80 animate-in fade-in duration-1000 delay-500" data-testid="hero-social-proof">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coral to-ocean-primary border-2 border-white/20" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-primary to-ocean-deep border-2 border-white/20" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-deep to-coral border-2 border-white/20" />
                </div>
                <span className="font-medium">+1,200 viajeros activos</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                <span className="font-medium">4.9/5 valoración promedio</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <span className="font-medium">95% satisfacción de usuarios</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Band */}
        <div className="relative z-20 border-t border-white/10 bg-white/5 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <div className="text-center" data-testid="kpi-destinations">
                <div className="flex items-center justify-center mb-2">
                  <MapPin className="h-6 w-6 text-coral" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">150+</div>
                <div className="text-sm text-white/70">Destinos cubiertos</div>
              </div>

              <div className="text-center" data-testid="kpi-itineraries">
                <div className="flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-coral" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">2,500+</div>
                <div className="text-sm text-white/70">Itinerarios creados</div>
              </div>

              <div className="text-center" data-testid="kpi-travelers">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-coral" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">1,200+</div>
                <div className="text-sm text-white/70">Viajeros registrados</div>
              </div>

              <div className="text-center" data-testid="kpi-rating">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">4.9/5</div>
                <div className="text-sm text-white/70">Valoración promedio</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Indicators */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
        {videoSources.map((_, index: number) => (
          <button
            key={index}
            className={`h-1 rounded-full transition-all duration-300 ${index === currentVideoIndex
              ? 'bg-white w-8'
              : 'bg-white/50 w-1 hover:bg-white/70'
              }`}
            onClick={() => {
              setCurrentVideoIndex(index);
              setIsVideoLoaded(false);
            }}
            data-testid={`video-indicator-${index}`}
            aria-label={`Ver video ${index + 1}`}
          />
        ))}
      </div>

      {/* Componente Modal de Autenticación para este botón específico */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={() => setLocation("/chat")}
      />
    </section>
  );
}