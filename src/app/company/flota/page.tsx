"use client";

import { useState, useMemo, useCallback } from "react";
import { useUser, useSupabase } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Truck,
    PlusCircle,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Calendar,
    Hash,
    Car,
    User
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function GestionFlotaPage() {
    const { user } = useUser();
    const { supabase } = useSupabase();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
        make: "",
        model: "",
        year: new Date().getFullYear(),
        licensePlate: "",
        type: "Camion Ligero",
        status: "active",
        driverId: "none"
    });

    // 1. Get all vehicles belonging to this company
    const filterVehicles = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: vehicles, isLoading: isLoadingVehicles } = useSupabaseCollection("vehicles", filterVehicles);

    // 2. Get all drivers belonging to this company
    const filterDrivers = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: companyDrivers } = useSupabaseCollection("driverProfiles", filterDrivers);

    const driverIds = useMemo(() => companyDrivers?.map(d => d.id) || [], [companyDrivers]);

    // 3. Get user profiles for these drivers to get their names
    const filterUsers = useCallback((q: any) => {
        if (driverIds.length === 0) return q.none();
        return q.in('id', driverIds.slice(0, 30));
    }, [driverIds]);
    const { data: companyUsers } = useSupabaseCollection("userProfiles", filterUsers);

    const driversList = useMemo(() => {
        if (!companyDrivers || !companyUsers) return [];
        const userMap = new Map(companyUsers.map(u => [u.id, u]));
        return companyDrivers.map(d => {
            const up = userMap.get(d.id);
            return {
                id: d.id,
                name: up ? `${up.firstName} ${up.lastName}` : "Conductor Desconocido"
            };
        });
    }, [companyDrivers, companyUsers]);

    const handleAddVehicle = async () => {
        if (!user) return;
        try {
            await supabase.from("vehicles").insert({
                ...newVehicle,
                driverId: newVehicle.driverId === "none" ? null : newVehicle.driverId,
                companyId: user.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            setIsAddDialogOpen(false);
            setNewVehicle({
                make: "",
                model: "",
                year: new Date().getFullYear(),
                licensePlate: "",
                type: "Camion Ligero",
                status: "active",
                driverId: "none"
            });
        } catch (err) {
            console.error(err);
            alert("Error al agregar el vehículo.");
        }
    };

    const handleUpdateVehicle = async (vehicleId: string, updates: any) => {
        try {
            await supabase.from("vehicles").update({
                ...updates,
                updatedAt: new Date().toISOString()
            }).eq("id", vehicleId);
        } catch (err) {
            console.error(err);
            alert("Error al actualizar el vehículo.");
        }
    };

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!confirm("¿Está seguro de que desea eliminar este vehículo de su flota?")) return;
        try {
            await supabase.from("vehicles").delete().eq("id", vehicleId);
        } catch (err) {
            console.error(err);
            alert("Error al eliminar el vehículo.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Flota</h1>
                    <p className="text-muted-foreground">Administre los vehículos de su empresa.</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <PlusCircle className="h-4 w-4" />
                            Agregar Vehículo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar Nuevo Vehículo</DialogTitle>
                            <DialogDescription>
                                Ingrese los detalles del vehículo para agregarlo a su flota.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="make">Marca</Label>
                                    <Input 
                                        id="make" 
                                        placeholder="Ej: Toyota" 
                                        value={newVehicle.make}
                                        onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model">Modelo</Label>
                                    <Input 
                                        id="model" 
                                        placeholder="Ej: Hilux" 
                                        value={newVehicle.model}
                                        onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="year">Año</Label>
                                    <Input 
                                        id="year" 
                                        type="number" 
                                        value={newVehicle.year}
                                        onChange={(e) => setNewVehicle({...newVehicle, year: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="licensePlate">Patente</Label>
                                    <Input 
                                        id="licensePlate" 
                                        placeholder="Ej: AB-123-CD" 
                                        className="uppercase"
                                        value={newVehicle.licensePlate}
                                        onChange={(e) => setNewVehicle({...newVehicle, licensePlate: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo de Vehículo</Label>
                                    <Select onValueChange={(v) => setNewVehicle({...newVehicle, type: v})} defaultValue={newVehicle.type}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Auto">Auto</SelectItem>
                                            <SelectItem value="Motocicleta">Motocicleta</SelectItem>
                                            <SelectItem value="Van">Van</SelectItem>
                                            <SelectItem value="Furgon">Furgón</SelectItem>
                                            <SelectItem value="Camion Ligero">Camión Ligero</SelectItem>
                                            <SelectItem value="Camion Pesado">Camión Pesado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Estado Inicial</Label>
                                    <Select onValueChange={(v) => setNewVehicle({...newVehicle, status: v})} defaultValue={newVehicle.status}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Activo</SelectItem>
                                            <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                            <SelectItem value="inactive">Inactivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="driver">Asignar Conductor (Opcional)</Label>
                                <Select onValueChange={(v) => setNewVehicle({...newVehicle, driverId: v})} defaultValue={newVehicle.driverId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un conductor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin asignar</SelectItem>
                                        {driversList.map(driver => (
                                            <SelectItem key={driver.id} value={driver.id}>
                                                {driver.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddVehicle}>Guardar Vehículo</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6">
                {isLoadingVehicles ? (
                    <div className="flex justify-center py-12">
                        <p className="text-muted-foreground animate-pulse">Cargando flota...</p>
                    </div>
                ) : vehicles?.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Truck className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                            <h3 className="text-lg font-medium">No hay vehículos</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                                Registre los vehículos de su empresa para asignarlos a sus conductores.
                            </p>
                            <Button variant="outline" className="mt-6" onClick={() => setIsAddDialogOpen(true)}>
                                Agregar mi primer vehículo
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {vehicles?.map((vehicle) => (
                            <VehicleCard 
                                key={vehicle.id} 
                                vehicle={vehicle} 
                                drivers={driversList}
                                onDelete={() => handleDeleteVehicle(vehicle.id)}
                                onUpdate={(updates) => handleUpdateVehicle(vehicle.id, updates)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function VehicleCard({ vehicle, drivers, onDelete, onUpdate }: { vehicle: any, drivers: any[], onDelete: () => void, onUpdate: (updates: any) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({...vehicle, driverId: vehicle.driverId || "none"});

    const handleSave = () => {
        onUpdate({
            ...editData,
            driverId: editData.driverId === "none" ? null : editData.driverId
        });
        setIsEditing(false);
    };

    const assignedDriver = useMemo(() => {
        if (!vehicle.driverId) return null;
        return drivers.find(d => d.id === vehicle.driverId);
    }, [vehicle.driverId, drivers]);

    const statusColors: { [key: string]: string } = {
        active: "bg-green-500/10 text-green-500",
        maintenance: "bg-yellow-500/10 text-yellow-500",
        inactive: "bg-red-500/10 text-red-500"
    };

    const statusLabels: { [key: string]: string } = {
        active: "Activo",
        maintenance: "Mantenimiento",
        inactive: "Inactivo"
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{vehicle.make} {vehicle.model}</CardTitle>
                        <CardDescription>{vehicle.year}</CardDescription>
                    </div>
                </div>
                {!isEditing && (
                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[vehicle.status]}`}>
                        {statusLabels[vehicle.status]}
                    </div>
                )}
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase font-bold">
                                <Hash className="h-3 w-3" /> Patente
                            </p>
                            {isEditing ? (
                                <Input 
                                    className="h-8 uppercase" 
                                    value={editData.licensePlate} 
                                    onChange={(e) => setEditData({...editData, licensePlate: e.target.value})} 
                                />
                            ) : (
                                <p className="font-medium uppercase">{vehicle.licensePlate}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase font-bold">
                                <Car className="h-3 w-3" /> Tipo
                            </p>
                            {isEditing ? (
                                <Select onValueChange={(v) => setEditData({...editData, type: v})} defaultValue={editData.type}>
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Auto">Auto</SelectItem>
                                        <SelectItem value="Motocicleta">Motocicleta</SelectItem>
                                        <SelectItem value="Van">Van</SelectItem>
                                        <SelectItem value="Furgon">Furgón</SelectItem>
                                        <SelectItem value="Camion Ligero">Camión Ligero</SelectItem>
                                        <SelectItem value="Camion Pesado">Camión Pesado</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="font-medium">{vehicle.type}</p>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="space-y-1">
                            <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase font-bold">
                                Estado
                            </p>
                            <Select onValueChange={(v) => setEditData({...editData, status: v})} defaultValue={editData.status}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase font-bold">
                            <User className="h-3 w-3" /> Conductor
                        </p>
                        {isEditing ? (
                            <Select onValueChange={(v) => setEditData({...editData, driverId: v})} defaultValue={editData.driverId}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Asignar conductor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin asignar</SelectItem>
                                    {drivers.map(driver => (
                                        <SelectItem key={driver.id} value={driver.id}>
                                            {driver.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="font-medium">
                                {assignedDriver ? assignedDriver.name : "Sin asignar"}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        {isEditing ? (
                            <>
                                <Button size="sm" className="flex-1" onClick={handleSave}>Guardar</Button>
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            </>
                        ) : (
                            <>
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsEditing(true)}>Editar</Button>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
