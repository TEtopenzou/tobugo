import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plane, Menu, X, LogOut, User, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient"; // Import apiRequest

export default function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();

  const isActive = (path: string) => location === path;

  const handleLogout = async () => {
    await apiRequest("POST", "/api/logout");
    queryClient.setQueryData(["/api/auth/user"], null); // Limpiar cache de usuario
    window.location.href = "/"; // Redirigir al home
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const firstName = user.firstName || user.username || ""; // Fallback a username si firstName es null
    const lastName = user.lastName || "";
    return (firstName.charAt(0) + (lastName ? lastName.charAt(0) : "")).toUpperCase() || "U";
  };

  return (
    <>
      <nav className="bg-white dark:bg-slate-900 border-b border-sand-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group" data-testid="link-home">
              <div className="relative">
                <Plane className="h-7 w-7 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))] transition-transform group-hover:scale-110 group-hover:rotate-12" />
                <Sparkles className="h-3 w-3 text-coral absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-ocean-deep to-ocean-primary dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                TobuGo
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-32">
              <Link
                href="/chat"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/chat')
                  ? 'bg-ocean-primary/10 dark:bg-ocean-primary-dark/10 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]'
                  : 'text-sand-700 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-800 hover:text-ocean-primary dark:hover:text-[hsl(var(--ocean-primary-dark))]'
                  }`}
                data-testid="link-chat"
              >
                Planificar
              </Link>
              {/* <Link
                href="/community"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/community')
                    ? 'bg-ocean-primary/10 dark:bg-ocean-primary-dark/10 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]'
                    : 'text-sand-700 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-800 hover:text-ocean-primary dark:hover:text-[hsl(var(--ocean-primary-dark))]'
                  }`}
                data-testid="link-community"
              >
                Comunidad
              </Link> */}
              <Link
                href="/itinerarios"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/itinerarios')
                  ? 'bg-ocean-primary/10 dark:bg-ocean-primary-dark/10 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]'
                  : 'text-sand-700 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-800 hover:text-ocean-primary dark:hover:text-[hsl(var(--ocean-primary-dark))]'
                  }`}
                data-testid="link-trips"
              >
                Mis Viajes
              </Link>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              {/* Authentication Section */}
              {isLoading ? (
                <div className="w-9 h-9 rounded-full bg-sand-100 dark:bg-slate-700 animate-pulse" />
              ) : isAuthenticated && user ? (
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-sand-50 dark:bg-slate-800 border border-sand-200 dark:border-slate-700">
                    <Avatar className="w-7 h-7 border-2 border-white dark:border-slate-600" data-testid="avatar-user">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback className="text-xs bg-ocean-primary dark:bg-[hsl(var(--ocean-primary-dark))] text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-sand-900 dark:text-slate-100" data-testid="text-username">
                      {user.firstName || user.username || user.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400"
                    onClick={handleLogout}
                    data-testid="button-logout"
                    title="Cerrar sesión"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  className="hidden sm:flex h-10 bg-ocean-primary dark:bg-[hsl(var(--ocean-primary-dark))] hover:opacity-90 text-white font-semibold shadow-sm"
                  onClick={() => setIsAuthModalOpen(true)}
                  data-testid="button-login"
                >
                  <User className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Button>
              )}

              {/* Mobile Menu Sheet */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-11 w-11"
                    data-testid="button-menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2.5">
                      <Plane className="h-6 w-6 text-ocean-primary dark:text-[hsl(var(--ocean-primary-dark))]" />
                      <span className="text-lg font-bold bg-gradient-to-r from-ocean-deep to-ocean-primary dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                        TobuGo
                      </span>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="flex flex-col gap-2 mt-6">
                    {/* Mobile Links ... (sin cambios) */}

                    {/* Mobile Authentication Section */}
                    <div className="mt-4 pt-4 border-t border-sand-200 dark:border-slate-700">
                      {isLoading ? (
                        <div className="w-9 h-9 rounded-full bg-sand-100 dark:bg-slate-700 animate-pulse" />
                      ) : isAuthenticated && user ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sand-50 dark:bg-slate-800">
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-slate-600" data-testid="avatar-user-mobile">
                              <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                              <AvatarFallback className="bg-ocean-primary dark:bg-[hsl(var(--ocean-primary-dark))] text-white">
                                {getUserInitials()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-sand-900 dark:text-slate-100 truncate" data-testid="text-username-mobile">
                                {user.firstName || user.username}
                              </p>
                              <p className="text-xs text-sand-500 dark:text-slate-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full justify-start min-h-[44px] border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => {
                              handleLogout();
                              setIsMobileMenuOpen(false);
                            }}
                            data-testid="button-logout-mobile"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Cerrar Sesión
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full min-h-[44px] bg-ocean-primary dark:bg-[hsl(var(--ocean-primary-dark))] hover:opacity-90 text-white font-semibold"
                          onClick={() => {
                            setIsAuthModalOpen(true);
                            setIsMobileMenuOpen(false);
                          }}
                          data-testid="button-login-mobile"
                        >
                          <User className="w-4 h-4 mr-2" />
                          Iniciar Sesión
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

    </>
  );
}
