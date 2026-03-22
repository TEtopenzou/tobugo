import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-provider";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Community from "@/pages/community";
import Itinerarios from "@/pages/itinerarios";
import PaymentSuccess from "@/pages/payment-success";
import PaymentFailure from "@/pages/payment-failure";
import PaymentPending from "@/pages/payment-pending";
import NotFound from "@/pages/not-found";
import Navbar from "@/components/navbar";

function App() {
      return (
              <QueryClientProvider client={queryClient}>
                        <ThemeProvider>
                                <TooltipProvider>
                                          <Toaster />
                                          <div className="min-h-screen bg-background">
                                                      <Navbar />
                                                      <Switch>
                                                                    <Route path="/" component={Dashboard} />
                                                                    <Route path="/chat" component={Chat} />
                                                                    <Route path="/chat/:id" component={Chat} />
                                                                    <Route path="/community" component={Community} />
                                                                    <Route path="/itinerarios" component={Itinerarios} />
                                                                    <Route path="/payment/success" component={PaymentSuccess} />
                                                                    <Route path="/payment/failure" component={PaymentFailure} />
                                                                    <Route path="/payment/pending" component={PaymentPending} />
                                                                    <Route component={NotFound} />
                                                      </Switch
                                          </div>div>
                                </TooltipProvider>
                        </ThemeProvider>
              </QueryClientProvider>
            );
}

export default App;
