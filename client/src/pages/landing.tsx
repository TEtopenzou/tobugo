import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plane } from "lucide-react";
import { VideoHero } from "@/components/video-hero";

export default function Landing() {
  return (
    <div>
      {/* Hero Section with Video Background */}
      <VideoHero />

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">
              ¿Por qué elegir TobuGo?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-features-subtitle">
              Nuestra plataforma combina inteligencia artificial avanzada con la sabiduría de viajeros experimentados
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-xl border border-border p-8 text-center hover:shadow-lg transition-shadow" data-testid="card-feature-ai">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plane className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Planificación con IA</h3>
              <p className="text-muted-foreground">
                Nuestro chatbot inteligente crea itinerarios personalizados basados en tus preferencias y presupuesto
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-8 text-center hover:shadow-lg transition-shadow" data-testid="card-feature-costs">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">Análisis de Costos</h3>
              <p className="text-muted-foreground">
                Obtén estimaciones precisas de gastos desglosados por categoría y día de tu viaje
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-8 text-center hover:shadow-lg transition-shadow" data-testid="card-feature-community">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">Comunidad de Viajeros</h3>
              <p className="text-muted-foreground">
                Conecta con otros viajeros, comparte experiencias y obtén recomendaciones de primera mano
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6" data-testid="text-cta-title">
            ¿Listo para planificar tu próxima aventura?
          </h2>
          <p className="text-xl mb-8 opacity-90" data-testid="text-cta-subtitle">
            Únete a miles de viajeros que ya han descubierto la forma más inteligente de planificar sus viajes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-4"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-cta-login"
            >
              Iniciar Sesión para Planificar
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-4 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-explore-community"
            >
              Explorar Comunidad
            </Button>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8" data-testid="text-about-title">
            Nuestra misión: Viajar sin estrés
          </h2>
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p data-testid="text-about-p1">
              TobuGo nace a partir de una necesidad simple: organizar un viaje debería ser un proceso claro y accesible, no una tarea compleja que requiera múltiples herramientas y coordinaciones. Con el tiempo, la planificación de viajes se volvió fragmentada, obligando a los usuarios a saltar entre distintas plataformas para tomar decisiones.
            </p>
            <p data-testid="text-about-p2">
              Somos un equipo interesado en la tecnología y en cómo esta puede simplificar experiencias cotidianas. A partir de esa idea, creamos TobuGo como una plataforma que reúne en un solo lugar la información necesaria para planificar un viaje, ayudando a ordenar opciones y preferencias de forma más sencilla.
            </p>
            <p data-testid="text-about-p3">
              Nuestro propósito es que viajar vuelva a ser disfrutar, no gestionar. Actuamos como tu copiloto inteligente para eliminar la carga logística y resolver el caos de coordinar grupos, devolviéndote lo más valioso: tu tiempo y tu tranquilidad.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Plane className="text-2xl text-primary" />
                <span className="text-xl font-bold">TobuGo</span>
              </div>
              <p className="text-muted-foreground" data-testid="text-footer-description">
                La plataforma definitiva para planificar viajes inteligentes con IA y comunidad de viajeros.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4" data-testid="text-footer-platform">Plataforma</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><button onClick={() => window.location.href = "/api/login"} className="hover:text-primary transition-colors" data-testid="link-footer-planning">Planificación</button></li>
                <li><button onClick={() => window.location.href = "/api/login"} className="hover:text-primary transition-colors" data-testid="link-footer-community">Comunidad</button></li>
                <li><button onClick={() => window.location.href = "/api/login"} className="hover:text-primary transition-colors" data-testid="link-footer-trips">Mis Viajes</button></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4" data-testid="text-footer-company">Empresa</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-footer-about">Acerca de</a></li>
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-footer-contact">Contacto</a></li>
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-footer-privacy">Privacidad</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4" data-testid="text-footer-social">Síguenos</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-footer-twitter">Twitter</a></li>
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-footer-instagram">Instagram</a></li>
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-footer-facebook">Facebook</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p data-testid="text-footer-copyright">&copy; 2025 TobuGo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}