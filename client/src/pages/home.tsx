import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plane } from "lucide-react";
import { VideoHero } from "@/components/video-hero";

export default function Home() {
  return (
    <div>
      {/* Hero Section with Video Background */}
      <VideoHero />

      {/* Features Section */}
      <section className="py-14 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-11 md:mb-16">
            <h2 className="text-3xl md:text-6xl font-bold mb-3 md:mb-4" data-testid="text-features-title">
              ¿Por qué elegir TobuGo?
            </h2>
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
                <svg className="h-8 w-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">Comunidad de Viajeros - Próximamente</h3>
              <p className="text-muted-foreground">
                Conecta con otros viajeros, comparte experiencias y obtén recomendaciones de primera mano
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6" data-testid="text-cta-title">
            ¿Listo para tu próxima aventura?
          </h2>
          <p className="text-muted-foreground text-lg mb-8" data-testid="text-cta-subtitle">
            Únete a miles de viajeros que ya han planificado sus viajes perfectos con TobuGo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/chat">
              <Button size="lg" data-testid="button-start-now">
                Comenzar Ahora
              </Button>
            </Link>
            <Link href="/community">
              <Button size="lg" variant="outline" data-testid="button-explore-community">
                Explorar Comunidad
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Plane className="text-2xl text-primary" />
                <span className="text-xl font-bold">TobuGo</span>
              </div>
              <p className="text-muted-foreground text-sm" data-testid="text-footer-description">
                Planifica viajes perfectos con inteligencia artificial y conecta con otros viajeros.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="/chat" className="block hover:text-foreground transition-colors" data-testid="link-footer-planner">Planificador AI</Link>
                <Link href="/community" className="block hover:text-foreground transition-colors" data-testid="link-footer-community">Comunidad</Link>
                <Link href="#" className="block hover:text-foreground transition-colors" data-testid="link-footer-pricing">Precios</Link>
                <Link href="#" className="block hover:text-foreground transition-colors" data-testid="link-footer-api">API</Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Soporte</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="#" className="block hover:text-foreground transition-colors" data-testid="link-footer-help">Centro de Ayuda</Link>
                <Link href="#" className="block hover:text-foreground transition-colors" data-testid="link-footer-contact">Contacto</Link>
                <Link href="#" className="block hover:text-foreground transition-colors" data-testid="link-footer-terms">Términos</Link>
                <Link href="#" className="block hover:text-foreground transition-colors" data-testid="link-footer-privacy">Privacidad</Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Síguenos</h3>
              <div className="flex space-x-4">
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-twitter">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-instagram">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.648.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297L3.323 17.494c-.49-.49-.49-1.297 0-1.784l1.803-1.803c-.808-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323L3.323 5.458c-.49-.49-.49-1.297 0-1.784L5.126 1.871c.49-.49 1.297-.49 1.784 0l1.803 1.803c.875-.808 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297L17.162 1.871c.49-.49 1.297-.49 1.784 0l1.803 1.803c.49.49.49 1.297 0 1.784L18.946 7.261c.808.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323l1.803 1.803c.49.49.49 1.297 0 1.784l-1.803 1.803c-.49.49-1.297.49-1.784 0L15.359 17.494c-.875.808-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297z" />
                  </svg>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-facebook">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p data-testid="text-footer-copyright">&copy; 2024 TobuGo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
