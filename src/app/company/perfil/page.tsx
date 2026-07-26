"use client";

import { useState, useEffect } from "react";
import { useSupabase, useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc } from "@/hooks/supabase-hooks";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, Car, Bike, Truck, CheckCircle, Image as ImageIcon } from "lucide-react";

const vehicleOptions = [
    { value: "Auto", label: "Auto", icon: Car },
    { value: "Motocicleta", label: "Motocicleta", icon: Bike },
    { value: "Van", label: "Van", icon: Truck },
    { value: "Furgon", label: "Furgón", icon: Truck },
    { value: "Camion Ligero", label: "C. Ligero", icon: Truck },
    { value: "Camion Pesado", label: "C. Pesado", icon: Truck },
];

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
        {isMultiSelect && <p className="text-xs text-muted-foreground mt-1 mb-2">Seleccione los tipos de vehículos que opera su flota.</p>}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
            {vehicleOptions.map(({ value, label, icon: Icon }) => {
                const isSelected = (selected as string[]).includes(value);
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

export default function CompanyProfilePage() {
    const { user } = useUser();
    const { supabase } = useSupabase();

    // Data fetching
    const { data: companyProfile, isLoading: isLoadingCompany } = useSupabaseDoc("companyProfiles", user?.id);
    const { data: userProfile, isLoading: isLoadingUser } = useSupabaseDoc("userProfiles", user?.id);

    // Form State
    const [companyName, setCompanyName] = useState("");
    const [rut, setRut] = useState("");
    const [address, setAddress] = useState("");
    const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const isLoading = isLoadingCompany || isLoadingUser;

    useEffect(() => {
        if (companyProfile) {
            setCompanyName((companyProfile as any).companyName || "");
            setRut((companyProfile as any).rut || "");
            setAddress((companyProfile as any).address || "");
            setVehicleTypes((companyProfile as any).vehicleTypes || []);
            setLogoUrl((companyProfile as any).logoUrl || "");
        }
        if (userProfile) {
            setFirstName((userProfile as any).firstName || "");
            setLastName((userProfile as any).lastName || "");
        }
    }, [companyProfile, userProfile]);

    const handleCompanyVehicleSelect = (value: string) => {
        setVehicleTypes(prev => {
            const isSelected = prev.includes(value);
            if (isSelected) {
                if (prev.length > 1) return prev.filter(v => v !== value);
                return prev;
            } else {
                return [...prev, value];
            }
        });
    };
    
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("No se puede guardar el perfil. Usuario no válido.");
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            let finalLogoUrl = logoUrl;

            // Upload logo if there is a new file
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const filePath = `${user.id}/logo_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('company_logos')
                    .upload(filePath, logoFile, { upsert: true });

                if (uploadError) throw uploadError;

                // Get public URL for the logo
                const { data: publicUrlData } = supabase.storage
                    .from('company_logos')
                    .getPublicUrl(filePath);

                finalLogoUrl = publicUrlData.publicUrl;
                setLogoUrl(finalLogoUrl);
            }

            const { error: companyError } = await supabase
                .from("companyProfiles")
                .update({
                    companyName,
                    rut,
                    address,
                    vehicleTypes,
                    logoUrl: finalLogoUrl
                })
                .eq("id", user.id);
            if (companyError) throw companyError;

            const { error: userError } = await supabase
                .from("userProfiles")
                .update({
                    firstName,
                    lastName,
                    name: companyName,
                    updatedAt: new Date().toISOString()
                })
                .eq("id", user.id);
            if (userError) throw userError;
            
            setSuccess("¡Perfil actualizado correctamente!");
            setTimeout(() => setSuccess(null), 4000);

        } catch (err: any) {
            console.error("Error updating profile:", err);
            setError("No se pudo actualizar el perfil. Por favor, verifique sus permisos e inténtelo de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfil de la Empresa</CardTitle>
                <CardDescription>Vea y actualice la información de su empresa y los datos de contacto.</CardDescription>
            </CardHeader>
            {isLoading ? (
                <CardContent className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            ) : (
                <form onSubmit={handleUpdateProfile}>
                    <CardContent className="space-y-8">
                        <fieldset disabled={isSaving} className="space-y-4">
                             <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold">Datos de la Empresa</h3>
                             </div>
                             
                             <div className="flex items-start gap-6 pt-2">
                                {/* Logo Section */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted flex items-center justify-center overflow-hidden bg-muted/20 relative group">
                                        {logoFile ? (
                                            <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                                        ) : logoUrl ? (
                                            <img src={logoUrl} alt="Company Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Label htmlFor="logoUpload" className="cursor-pointer text-white text-xs font-semibold px-2 py-1 bg-primary rounded-md">
                                                Cambiar
                                            </Label>
                                        </div>
                                    </div>
                                    <Input 
                                        id="logoUpload" 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/webp" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setLogoFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <span className="text-xs text-muted-foreground text-center">Logo (Opcional)</span>
                                </div>

                                {/* Company Name */}
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="companyName">Nombre de la Empresa</Label>
                                    <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                                </div>
                             </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="rut">RUT de la Empresa</Label>
                                    <Input id="rut" value={rut} onChange={e => setRut(e.target.value)} required className="mt-1" />
                                </div>
                                <div>
                                    <Label htmlFor="address">Dirección de la Empresa</Label>
                                    <Input id="address" value={address} onChange={e => setAddress(e.target.value)} required className="mt-1" />
                                </div>
                            </div>
                            <VehicleSelector selected={vehicleTypes} onSelect={handleCompanyVehicleSelect} isMultiSelect />
                        </fieldset>

                        <fieldset disabled={isSaving} className="space-y-4 pt-4">
                             <h3 className="text-lg font-semibold border-b pb-2">Datos del Administrador</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">Nombres</Label>
                                    <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required className="mt-1" />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Apellidos</Label>
                                    <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required className="mt-1" />
                                </div>
                            </div>
                             <div>
                                <Label htmlFor="email">Correo Electrónico (no editable)</Label>
                                <Input id="email" value={user?.email || ''} readOnly disabled className="mt-1 bg-muted/50" />
                            </div>
                        </fieldset>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                        {error && <p className="text-destructive text-sm">{error}</p>}
                        {success && <p className="text-green-600 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</p>}
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar Cambios"}
                        </Button>
                    </CardFooter>
                </form>
            )}
        </Card>
    );
}

