"use client";

import { useState } from "react";
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
  const { auth, firestore } = useFirebase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("client");
  const [vehicleType, setVehicleType] = useState("Auto");
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!auth || !firestore) {
      setError("Firebase no está listo. Por favor, inténtalo de nuevo en un momento.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userProfile = {
        id: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        role: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userDocRef = doc(firestore, "userProfiles", user.uid);

      setDoc(userDocRef, userProfile).catch(() => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: "create",
          requestResourceData: userProfile,
        });
        errorEmitter.emit("permission-error", permissionError);
        setError("No se pudo crear el perfil de usuario. Por favor, contacta a soporte.");
      });

      if (role === "driver") {
        const driverProfile = {
          id: user.uid,
          userId: user.uid,
          vehicleType: vehicleType,
          licensePlate: "Not specified",
          isAvailable: false,
          currentLatitude: null,
          currentLongitude: null,
          lastLocationUpdate: null,
        };
        const driverDocRef = doc(firestore, "driverProfiles", user.uid);
        setDoc(driverDocRef, driverProfile).catch(() => {
          const permissionError = new FirestorePermissionError({
            path: driverDocRef.path,
            operation: "create",
            requestResourceData: driverProfile,
          });
          errorEmitter.emit("permission-error", permissionError);
          // Don't set a user-facing error here as the main profile creation is more critical
        });
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Error al crear la cuenta. El correo electrónico podría estar ya en uso.";
      setError(errorMessage);
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
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          className="w-full h-12 font-semibold"
        >
          Crear Cuenta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{" "}
        <a href="/" className="font-semibold text-primary hover:underline">
          Inicia Sesión
        </a>
      </p>
    </div>
  );
}
