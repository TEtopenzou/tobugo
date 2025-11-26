import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void; // Nueva prop opcional
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Mutation para Login
  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/login", { username, password });
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({ title: "¡Bienvenido de vuelta!", description: `Hola, ${user.firstName || user.username}` });
      onClose();
      // Si existe una acción post-login, la ejecutamos
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de acceso", 
        description: "Usuario o contraseña incorrectos", 
        variant: "destructive" 
      });
    },
  });

  // Mutation para Registro
  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/register", { username, password });
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({ title: "¡Cuenta creada!", description: "Tu cuenta ha sido creada exitosamente." });
      onClose();
      // También redirigimos al registrarse si es necesario
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error de registro", 
        description: "El usuario ya existe o hubo un problema.", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (isLogin: boolean) => {
    if (!username || !password) {
      toast({ title: "Campos requeridos", description: "Por favor ingresa usuario y contraseña", variant: "destructive" });
      return;
    }
    
    if (isLogin) {
      loginMutation.mutate();
    } else {
      registerMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center">Bienvenido a TobuGo</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" placeholder="tu_usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => handleSubmit(true)} disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reg-username">Usuario</Label>
              <Input id="reg-username" placeholder="Elige un usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Contraseña</Label>
              <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => handleSubmit(false)} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}