"use client";

import { useState } from "react";
import { useUser, useSupabase } from "@/components/providers/supabase-provider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Car, Bike, Truck } from "lucide-react";
import Link from "next/link";

export default function NewUserAdminPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rut, setRut] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("client");
  
  // Driver fields
  const [licensePlate, setLicensePlate] = useState("");

  // Driver/Company fields
  const [vehicleType, setVehicleType] = useState("Auto");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(["Auto"]);

  // Company fields
  const [companyName, setCompanyName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const vehicleOptions = [
    { value: "Auto", label: "Auto", icon: Car },
    { value: "Motocicleta", label: "Motocicleta", icon: Bike },
    { value: "Van", label: "Van", icon: Truck },
    { value: "Furgon", label: "Furgón", icon: Truck },
    { value: "Camion Ligero", label: "C. Ligero", icon: Truck },
    { value: "Camion Pesado", label: "C. Pesado", icon: Truck },
  ];

  const handleCompanyVehicleSelect = (value: string) => {
    setVehicleTypes(prev => {
        const isSelected = prev.includes(value);
        if (isSelected) {
            // Prevent deselecting the last item
            if (prev.length > 1) {
                return prev.filter(v => v !== value);
            }
            return prev;
        } else {
            return [...prev, value];
        }
    });
  };

  const VehicleSelector = ({ 
    selected, 
    onSelect, 
    isMultiSelect = false 
  }: { 
    selected: string | string[], 
    onSelect: (value: string) => void,
    isMultiSelect?: boolean
  }) => (
    <div>
        <Label>Tipo de Vehículo{isMultiSelect ? 's' : ''}</Label>
        {isMultiSelect && <p className="text-xs text-muted-foreground mt-1 mb-2">Seleccione uno o más tipos.</p>}
        <div className="grid grid-cols-3 gap-2 mt-2">
            {vehicleOptions.map(({ value, label, icon: Icon }) => {
                const isSelected = isMultiSelect 
                    ? (selected as string[]).includes(value) 
                    : selected === value;
                return (
                    <Button
                        key={value}
                        type="button"
                        variant="outline"
                        className={cn(
                            "h-auto flex-col p-3 gap-1.5",
                            isSelected && "border-primary ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => onSelect(value)}
                    >
                        <Icon className="w-8 h-8" />
                        <span className="text-xs font-medium">{label}</span>
                    </Button>
                )
            })}
        </div>
    </div>
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setIsLoading(false);
      return;
    }

    try {
      // IMPORTANT: To create a user WITHOUT logging out the current admin, 
      // we must use a Supabase Edge Function with the Service Role Key.
      // This is a placeholder for that call.
      
      /*
      const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
        body: { email, password, role, firstName, lastName, rut, address, ...otherFields }
      });
      if (authError) throw authError;
      const newUserId = authData.user.id;
      */

      // FOR DEMO/MIGRATION PURPOSES, I will simulate it by creating the profile with a random UUID
      // In production, the Edge Function should handle both Auth + Profile creation atomically.
      const newUserId = crypto.randomUUID();

      const { error: profileError } = await supabase.from("userProfiles").insert({
        id: newUserId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        rut: role !== 'company' ? rut : "",
        address: role !== 'company' ? address : "",
        role: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      if (role === "driver") {
        const { error: driverError } = await supabase.from("driverProfiles").insert({
          id: newUserId,
          userId: newUserId,
          vehicleType: vehicleType,
          licensePlate: licensePlate || "N/A",
          isAvailable: false,
        });
        if (driverError) throw driverError;
      }

      if (role === "company") {
        const { error: companyError } = await supabase.from("companyProfiles").insert({
          id: newUserId,
          userId: newUserId,
          companyName: companyName,
          rut: rut,
          address: address,
          vehicleTypes: vehicleTypes,
        });
        if (companyError) throw companyError;
      }

      router.push("/admin/users");

    } catch (err: any) {
        console.error("Error creating user:", err);
        setError(err.message || "Ocurrió un error al crear el usuario.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Card className="bg-card border text-card-foreground">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Link href="/admin/users">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <div>
                <CardTitle>Crear Nuevo Usuario</CardTitle>
                <CardDescription className="mt-1">
                Complete el formulario para registrar un nuevo usuario en la plataforma.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-6 max-w-lg mx-auto">
            <div>
                <Label htmlFor="role">Rol de Usuario</Label>
                <Select onValueChange={setRole} defaultValue={role}>
                    <SelectTrigger id="role" className="w-full mt-1">
                        <SelectValue placeholder="Seleccionar un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="driver">Conductor (Independiente)</SelectItem>
                        <SelectItem value="company">Empresa de Transporte</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {role === 'company' ? (
              <div className="space-y-6">
                <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                  <h4 className="font-semibold text-base">1. Datos de la Empresa</h4>
                  <div>
                    <Label htmlFor="companyName">Nombre de la Empresa</Label>
                    <Input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ej: Transportes Rápidos S.A." required={role === 'company'} className="mt-1 bg-background"/>
                  </div>
                  <div>
                      <Label htmlFor="rut">RUT de la Empresa</Label>
                      <Input id="rut" type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ej: 76.123.456-7" required={role === 'company'} className="mt-1" />
                  </div>
                  <div>
                      <Label htmlFor="address">Dirección de la Empresa</Label>
                      <Input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Av. Principal 123, Ciudad" required={role === 'company'} className="mt-1" />
                  </div>
                  <VehicleSelector selected={vehicleTypes} onSelect={handleCompanyVehicleSelect} isMultiSelect />
                </div>

                <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                  <h4 className="font-semibold text-base">2. Cuenta de Administrador</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <Label htmlFor="firstName">Nombres de Contacto</Label>
                          <Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Juan" required className="mt-1" />
                      </div>
                      <div>
                          <Label htmlFor="lastName">Apellidos de Contacto</Label>
                          <Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: Pérez" required className="mt-1" />
                      </div>
                  </div>
                  <div>
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@empresa.com" required className="mt-1" />
                  </div>
                  <div>
                      <Label htmlFor="password">Contraseña</Label>
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required className="mt-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="firstName">Nombres</Label>
                        <Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Juan" required className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="lastName">Apellidos</Label>
                        <Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: Pérez" required className="mt-1" />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="rut">RUT</Label>
                    <Input id="rut" type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="Ej: 12.345.678-9" required className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@ejemplo.com" required className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Av. Principal 123, Ciudad" required className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="password">Contraseña</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required className="mt-1" />
                </div>

                {role === 'driver' && (
                    <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                        <h4 className="font-semibold text-sm">Perfil de Conductor</h4>
                        <div>
                            <Label htmlFor="licensePlate">Patente del Vehículo</Label>
                            <Input id="licensePlate" type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="Ej: ABCD-12" className="mt-1 bg-background"/>
                        </div>
                        <VehicleSelector selected={vehicleType} onSelect={setVehicleType} />
                    </div>
                )}
              </div>
            )}


            {error && <p className="text-destructive text-sm">{error}</p>}
                
            <div className="flex justify-end pt-2">
                <Button type="submit" className="font-semibold px-6" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : "Crear Usuario"}
                </Button>
            </div>
          </form>
        </CardContent>
    </Card>
  );
}
