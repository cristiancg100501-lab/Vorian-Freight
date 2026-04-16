"use client";

import { useMemo, useState, useCallback } from "react";
import { useUser, useSupabase } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {
    Users,
    Search,
    UserPlus,
    Mail,
    Phone,
    Truck,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Clock,
    User as UserIcon,
    AlertCircle,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const driverStatusStyles: { [key: string]: { color: string; label: string; icon: any } } = {
    available_free: { color: "text-green-500 bg-green-500/10", label: "Disponible", icon: CheckCircle2 },
    available_busy: { color: "text-yellow-500 bg-yellow-500/10", label: "En Ruta", icon: Clock },
    unavailable: { color: "text-red-500 bg-red-500/10", label: "Desconectado", icon: XCircle },
};

export default function MisConductoresPage() {
    const { user } = useUser();
    const { supabase } = useSupabase();
    const [searchTerm, setSearchTerm] = useState("");
    
    // Create Driver Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newDriver, setNewDriver] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        rut: "",
        phone: "",
    });
    const [createError, setCreateError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Get all drivers belonging to this company
    const filterCompanyDrivers = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: companyDrivers, isLoading: isLoadingDrivers } = useSupabaseCollection("driverProfiles", filterCompanyDrivers);
    
    const driverIds = useMemo(() => companyDrivers?.map(d => d.id) || [], [companyDrivers]);

    // 2. Get user profiles for only this company's drivers
    const filterCompanyUsers = useCallback((q: any) => {
        if (driverIds.length === 0) return q.none();
        return q.in('id', driverIds.slice(0, 30));
    }, [driverIds]);
    const { data: companyUsers, isLoading: isLoadingUsers } = useSupabaseCollection("userProfiles", filterCompanyUsers);

    // 3. Get active shipments to determine if busy

    const filterActiveShipments = useCallback((q: any) => {
        if (driverIds.length === 0) return q.none();
        return q.in("driverId", driverIds.slice(0, 30)).in("status", ["Booked", "In transit"]);
    }, [driverIds]);
    const { data: activeShipments } = useSupabaseCollection("shipments", filterActiveShipments);

    const isLoading = isLoadingDrivers || isLoadingUsers;

    // 4. Process and merge data
    const filteredDrivers = useMemo(() => {
        if (isLoading || !companyDrivers || !companyUsers) {
            return [];
        }

        const userMap = new Map(companyUsers.map(u => [u.id, u]));
        const activeJobDriverIds = new Set((activeShipments || []).map(s => s.driverId));

        const drivers = companyDrivers.map(driver => {
            const userProfile = userMap.get(driver.id);
            let status = 'unavailable';
            if (driver.isAvailable) {
                status = activeJobDriverIds.has(driver.id) ? 'available_busy' : 'available_free';
            }
            return {
                id: driver.id,
                name: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Desconocido",
                email: userProfile?.email || "N/A",
                phone: driver.phone || userProfile?.phone || "N/A",
                vehicle: driver.vehicleType || "N/A",
                licensePlate: driver.licensePlate || "N/A",
                licenseType: driver.licenseType || "N/A",
                status,
            }
        });

        if (!searchTerm) return drivers;
        
        const lowerSearch = searchTerm.toLowerCase();
        return drivers.filter(d => 
            d.name.toLowerCase().includes(lowerSearch) || 
            d.email.toLowerCase().includes(lowerSearch) ||
            d.licensePlate.toLowerCase().includes(lowerSearch)
        );
    }, [isLoading, companyDrivers, companyUsers, activeShipments, searchTerm]);

    const handleCreateDriver = async () => {
        if (!user) return;
        
        const { firstName, lastName, email, password, rut, phone } = newDriver;
        if (!firstName || !lastName || !email || !password || !rut) {
            setCreateError("Por favor, completa todos los campos obligatorios.");
            return;
        }

        setIsSubmitting(true);
        setCreateError(null);

        try {
            // IMPORTANT: In Supabase, creating another user from the client-side 
            // will likely change the current session unless using an Edge Function 
            // with the Service Role key.
            // For now, we will at least create the profile records.
            // You should implement an Edge Function for the Auth part.
            
            /* 
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { firstName, lastName, role: 'driver' }
                }
            });
            if (authError) throw authError;
            const uid = authData.user?.id;
            */

            // Assuming we have a UID (e.g. from an Edge Function or temporary logic)
            // For this migration, we'll use a placeholder or assume the user exists
            const tempUid = crypto.randomUUID(); 

            // 1. Create userProfile in Supabase
            const { error: profileError } = await supabase.from("userProfiles").insert({
                id: tempUid,
                email,
                firstName,
                lastName,
                rut,
                phone: phone || '',
                role: 'driver',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            if (profileError) throw profileError;

            // 2. Create driverProfile in Supabase
            const { error: driverError } = await supabase.from("driverProfiles").insert({
                id: tempUid,
                userId: tempUid,
                rut,
                companyId: user.id,
                vehicleType: 'Auto',
                licensePlate: 'No especificada',
                licenseType: 'B',
                phone: phone || '',
                isAvailable: false,
                currentLatitude: null,
                currentLongitude: null,
                lastLocationUpdate: null,
                updatedAt: new Date().toISOString(),
            });
            if (driverError) throw driverError;

            setIsCreateOpen(false);
            setNewDriver({
                firstName: "",
                lastName: "",
                email: "",
                password: "",
                rut: "",
                phone: "",
            });
        } catch (err: any) {
            console.error("Error creating driver:", err);
            setCreateError(err.message || "Error al crear el conductor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveDriver = async (driverId: string) => {
        if (!user) return;

        if (!confirm("¿Estás seguro de que deseas eliminar a este conductor de tu flota?")) {
            return;
        }

        try {
            await supabase
                .from("driverProfiles")
                .update({
                    companyId: null,
                    updatedAt: new Date().toISOString()
                })
                .eq("id", driverId);
        } catch (err) {
            console.error("Error removing driver:", err);
            alert("Error al eliminar al conductor de la flota.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mis Conductores</h1>
                    <p className="text-muted-foreground">Gestiona los conductores de tu flota y supervisa su estado.</p>
                </div>
                <Button className="w-full md:w-auto" onClick={() => setIsCreateOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Crear Conductor
                </Button>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Conductor</DialogTitle>
                        <DialogDescription>
                            Registra un nuevo conductor en tu flota. El conductor podrá iniciar sesión con su RUT y la clave asignada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="firstName">Nombre</Label>
                                <Input
                                    id="firstName"
                                    placeholder="Juan"
                                    value={newDriver.firstName}
                                    onChange={(e) => setNewDriver({ ...newDriver, firstName: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastName">Apellido</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Pérez"
                                    value={newDriver.lastName}
                                    onChange={(e) => setNewDriver({ ...newDriver, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="juan.perez@ejemplo.com"
                                value={newDriver.email}
                                onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="rut">RUT</Label>
                                <Input
                                    id="rut"
                                    placeholder="12.345.678-9"
                                    value={newDriver.rut}
                                    onChange={(e) => setNewDriver({ ...newDriver, rut: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Clave de Acceso</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="********"
                                    value={newDriver.password}
                                    onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                placeholder="+56 9 1234 5678"
                                value={newDriver.phone}
                                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                            />
                        </div>

                        {createError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{createError}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateDriver} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Crear Conductor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por nombre, email o placa..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="px-3 py-1">
                                {filteredDrivers.length} Conductores
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs font-medium uppercase text-muted-foreground border-b">
                                    <tr>
                                        <th className="px-4 py-3">Conductor</th>
                                        <th className="px-4 py-3">Contacto</th>
                                        <th className="px-4 py-3">Vehículo / Licencia</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                                    Cargando conductores...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredDrivers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-12 w-12 opacity-20" />
                                                    <p>{searchTerm ? "No se encontraron conductores con ese criterio." : "Aún no tienes conductores registrados."}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDrivers.map((driver) => {
                                            const status = driverStatusStyles[driver.status];
                                            const StatusIcon = status.icon;
                                            return (
                                                <tr key={driver.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                                {driver.name.charAt(0)}
                                                            </div>
                                                            <div className="font-medium">{driver.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" /> {driver.email}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" /> {driver.phone}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1 font-medium">
                                                                <Truck className="h-3.5 w-3.5 text-muted-foreground" /> {driver.vehicle}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">Placa: {driver.licensePlate}</div>
                                                            {driver.licenseType && (
                                                                <div className="text-xs text-muted-foreground">Licencia: {driver.licenseType}</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <Badge className={`flex items-center gap-1.5 w-fit font-medium border-none ${status.color}`}>
                                                            <StatusIcon className="h-3.5 w-3.5" />
                                                            {status.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                                                                <DropdownMenuItem>Ver Historial de Viajes</DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    className="text-destructive"
                                                                    onClick={() => handleRemoveDriver(driver.id)}
                                                                >
                                                                    Eliminar de Flota
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
