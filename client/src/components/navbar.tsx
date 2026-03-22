import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plane, Menu, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Navbar() {
    const [location] = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location === path;

  return (
        <nav className="bg-white dark:bg-slate-900 border-b border-sand-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-6">
                      <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                                <Link
                                              href="/"
                                              className="flex items-center gap-2.5 group"
                                              data-testid="link-home"
                                            >
                                            <div className="relative">
                                                          <Plane className="h-7 w-7 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))] transition-transform group-hover:scale-110" />
                                                          <Sparkles className="h-3 w-3 text-coral absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>div>
                                            <div>
                                                          <span className="text-xl font-bold bg-gradient-to-r from-ocean-deep to-ocean-primary dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                                                                          TobuGo
                                                          </span>span>
                                            </div>div>
                                </Link>Link>
                      
                        {/* Desktop Navigation */}
                                <div className="hidden md:flex items-center gap-32">
                                            <Link
                                                            href="/chat"
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                                              isActive("/chat")
                                                                                ? "bg-ocean-primary/10 dark:bg-ocean-primary-dark/10 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]"
                                                                                : "text-sand-700 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-800 hover:text-ocean-primary"
                                                            }`}
                                                            data-testid="link-chat"
                                                          >
                                                          Planificar
                                            </Link>Link>
                                
                                            <Link
                                                            href="/itinerarios"
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                                              isActive("/itinerarios")
                                                                                ? "bg-ocean-primary/10 dark:bg-ocean-primary-dark/10 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]"
                                                                                : "text-sand-700 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-800 hover:text-ocean-primary"
                                                            }`}
                                                            data-testid="link-trips"
                                                          >
                                                          Mis Viajes
                                            </Link>Link>
                                </div>div>
                      
                        {/* Right Section */}
                                <div className="flex items-center gap-3">
                                            <ThemeToggle />
                                
                                  {/* Mobile Menu */}
                                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                                          <SheetTrigger asChild>
                                                                          <Button
                                                                                              variant="ghost"
                                                                                              size="icon"
                                                                                              className="md:hidden h-11 w-11"
                                                                                              data-testid="button-menu"
                                                                                            >
                                                                                            <Menu className="h-6 w-6" />
                                                                          </Button>Button>
                                                          </SheetTrigger>SheetTrigger>
                                                          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                                                                          <SheetHeader className="mb-6">
                                                                                            <SheetTitle className="flex items-center gap-2.5">
                                                                                                                <Plane className="h-6 w-6 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]" />
                                                                                                                <span className="text-lg font-bold bg-gradient-to-r from-ocean-deep to-ocean-primary dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                                                                                                                                      TobuGo
                                                                                                                  </span>span>
                                                                                              </SheetTitle>SheetTitle>
                                                                          </SheetHeader>SheetHeader>
                                                          
                                                                          <div className="flex flex-col gap-2 mt-6">
                                                                                            <Link
                                                                                                                  href="/chat"
                                                                                                                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                                                                                                                          isActive("/chat")
                                                                                                                                            ? "bg-ocean-primary/10 dark:bg-ocean-primary-dark/10 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]"
                                                                                                                                            : "text-sand-700 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-800"
                                                                                                                    }`}
                                                                                                                  data-testid="link-chat-mobile"
                                                                                                                >
                                                                                                                Planificar
                                                                                              </Link>Link>
                                                                          
                                                                                            <Link
                                                                                                                  href="/itinerarios"
                                                                                                                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                                                                                                                          isActive("/itinerarios")
                                                                                                                                            ? "bg-ocean-primary/10 dark:bg-ocean-primary-dark/10 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]"
                                                                                                                                            : "text-sand-700 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-800"
                                                                                                                    }`}
                                                                                                                  data-testid="link-trips-mobile"
                                                                                                                >
                                                                                                                Mis Viajes
                                                                                              </Link>Link>
                                                                          </div>div>
                                                          </SheetContent>SheetContent>
                                            </Sheet>Sheet>
                                </div>div>
                      </div>div>
              </div>div>
        </nav>nav>
      );
}</nav>
