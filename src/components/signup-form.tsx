"use client";

import { useState } from "react";
import { useSupabase } from "./providers/supabase-provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function SignUpForm() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("client");
  const [vehicleType, setVehicleType] = useState("Auto");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Intentando registrar usuario con metadatos:", email);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
            role,
          }
        }
      });

      if (authError) {
        console.error("Error de autenticación:", authError);
        throw authError;
      }

      const user = authData.user;
      if (!user) throw new Error("No se pudo obtener el usuario de la respuesta.");

      console.log("Usuario creado en Auth con éxito. El perfil se creará automáticamente vía Trigger.");

      // If it's a driver, we still might need to create the driverProfile manually 
      // or add another trigger. For now, let's keep it simple.
      if (role === "driver") {
        // Wait a bit for the trigger to finish userProfiles creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("Intentando crear perfil de conductor...");
        const { error: driverError } = await supabase.from("driverProfiles").insert({
          userId: user.id,
          vehicleType: vehicleType,
          isAvailable: false,
        });

        if (driverError) {
          console.error("Error al insertar perfil de conductor:", driverError);
          // Non-critical error, the user is already created
        }
      }

      console.log("Registro completado con éxito");
      setSuccess(true);
      
      // Optional: alert and redirect
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);

    } catch (err: any) {
      console.error("Error completo en handleSignUp:", err);
      const errorMessage =
        err.message || "Error al crear la cuenta. El correo electrónico podría estar ya en uso.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-muted-foreground font-medium">
              Nombre
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Juan"
              required
              className="mt-2 bg-background border h-12"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-muted-foreground font-medium">
              Apellido
            </Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Pérez"
              required
              className="mt-2 bg-background border h-12"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email" className="text-muted-foreground font-medium">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu dirección de correo electrónico"
            required
            className="mt-2 bg-background border h-12"
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-muted-foreground font-medium">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Crea una contraseña (mín. 6 caracteres)"
            required
            className="mt-2 bg-background border h-12"
          />
        </div>
        <div>
          <Label htmlFor="role" className="text-muted-foreground font-medium">
            Soy un
          </Label>
          <Select onValueChange={setRole} defaultValue="client">
            <SelectTrigger className="w-full mt-2 bg-background border h-12">
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent className="bg-popover border text-popover-foreground">
              <SelectItem value="client">Cliente</SelectItem>
              <SelectItem value="driver">Conductor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {role === 'driver' && (
          <div>
            <Label htmlFor="vehicleType" className="text-muted-foreground font-medium">
              Tipo de Vehículo
            </Label>
            <Select onValueChange={setVehicleType} defaultValue={vehicleType}>
              <SelectTrigger className="w-full mt-2 bg-background border h-12">
                <SelectValue placeholder="Seleccione un tipo de vehículo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border text-popover-foreground">
                <SelectItem value="Auto">Auto</SelectItem>
                <SelectItem value="Motocicleta">Motocicleta</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Furgon">Furgón</SelectItem>
                <SelectItem value="Camion Ligero">Camión Ligero</SelectItem>
                <SelectItem value="Camion Pesado">Camión Pesado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {error && <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">{error}</p>}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg text-center mb-4">
            <p className="font-bold">¡Cuenta creada con éxito!</p>
            <p className="text-sm">Redirigiendo al inicio de sesión...</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 font-semibold text-lg transition-all active:scale-95"
          disabled={isLoading || success}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Procesando...
            </div>
          ) : success ? (
            "¡Listo!"
          ) : (
            "Crear Cuenta"
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{" "}
        <a href="/" className="font-semibold text-primary hover:underline transition-colors">
          Inicia Sesión
        </a>
      </p>
    </div>
  );
}
