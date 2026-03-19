import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-provider";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Community from "@/pages/community";
import Itinerarios from "@/pages/itinerarios";
import PaymentSuccess from "@/pages/payment-success";
import PaymentFailure from "@/pages/payment-failure";
import PaymentPending from "@/pages/payment-pending";
import NotFound from "@/pages/not-found";
import Navbar from "@/components/navbar";

// Loading component
function LoadingScreen() {
    return (
          <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>div>
                        <p className="text-muted-foreground" data-testid="text-loading">Cargando...</p>p>
                </div>div>
          </div>div>
        </div>);
}

function Router() {
    return (
          <div className="min-h-screen bg-background">
                <Navbar />
                <Switch>
                  {/* Landing page - shows Dashboard directly */}
                        <Route path="/" component={Dashboard} />
                        
                  {/* Chat routes - now public */}
                        <Route path="/chat" component={Chat} />
                        <Route path="/chat/:id" component={Chat} />
                        
                  {/* Community - now public */}
                        <Route path="/community" component={Community} />
                        
                  {/* Itinerarios - now public */}
                        <Route path="/itinerarios" component={Itinerarios} />
                        
                  {/* Payment confirmation pages - Public */}
                        <Route path="/payment/success" component={PaymentSuccess} />
                        <Route path="/payment/failure" component={PaymentFailure} />
                        <Route path="/payment/pending" component={PaymentPending} />
                        
                  {/* 404 page */}
                        <Route component={NotFound} />
                </Switch>Switch>
          </div>div>
        );
}

function App() {
    return (
          <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                        <TooltipProvider>
                                  <Toaster />
                                  <Router />
                        </TooltipProvider>TooltipProvider>
                </ThemeProvider>ThemeProvider>
          </QueryClientProvider>QueryClientProvider>
        );
}

export default App;</div>
