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
  const [email, setEmail] = useState("");

  // Mutation para Login
  const loginMutation = useMutation({
    mutationFn: async () => {
      // Enviamos email y password. El backend esperará 'email' o 'username' mapeado a email.
      const res = await apiRequest("POST", "/api/login", { email, password });
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
        description: "Email o contraseña incorrectos",
        variant: "destructive"
      });
    },
  });

  // Mutation para Registro
  const registerMutation = useMutation({
    mutationFn: async () => {
      // Enviamos email y mapeamos "Nombre" a username
      const res = await apiRequest("POST", "/api/register", { username, password, email });
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
        description: "El nombre ya existe o hubo un problema.",
        variant: "destructive"
      });
    },
  });

  const validateName = (name: string) => {
    if (name.length > 20) return false;
    // Permite letras mayúsculas, minúsculas y espacios. No caracteres especiales.
    const regex = /^[a-zA-Z\s]*$/;
    return regex.test(name);
  };

  const validateEmail = (email: string) => {
    // Al menos un caracter, luego @, luego al menos un caracter. Simple check de existencia de @
    return email.includes("@") && email.length > 3;
  };

  const handleSubmit = (isLogin: boolean) => {
    if (isLogin) {
      if (!email || !password) {
        toast({ title: "Campos requeridos", description: "Por favor ingresa email y contraseña", variant: "destructive" });
        return;
      }
      loginMutation.mutate();
    } else {
      if (!username || !password || !email) {
        toast({ title: "Campos requeridos", description: "Por favor completa todos los campos", variant: "destructive" });
        return;
      }
      // Validaciones extra para registro
      if (!validateEmail(email)) {
        toast({ title: "Email inválido", description: "El email debe contener '@'", variant: "destructive" });
        return;
      }
      if (!validateName(username)) {
        // Esta validación debería prevenirse en el input, pero por seguridad chequeamos aquí también
        toast({ title: "Nombre inválido", description: "El nombre no puede tener caracteres especiales ni más de 20 caracteres", variant: "destructive" });
        return;
      }

      registerMutation.mutate();
    }
  };

  // Handler para input de nombre con validación en tiempo real
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (validateName(val)) {
      setUsername(val);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto transition-all max-sm:focus-within:top-[25%]">
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
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
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
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-username">Nombre</Label>
              <Input id="reg-username" placeholder="Tu nombre" value={username} onChange={handleNameChange} />
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