"use client";

import { useUser, useSupabase } from "@/components/providers/supabase-provider";
import { useSupabaseDoc, useSupabaseCollection } from "@/hooks/supabase-hooks";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
    MapPin, 
    ArrowLeft, 
    Loader2, 
    Calendar, 
    DollarSign, 
    Truck, 
    Weight, 
    Package, 
    Ruler, 
    Thermometer, 
    Flame, 
    ShieldAlert, 
    Wind, 
    Building,
    User as UserIcon,
    ClipboardList,
    Pencil,
    Layers,
} from "lucide-react";
import ShipmentMap from "@/components/map";
import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";

const statusStyles: { [key: string]: string } = {
  "In transit": "bg-muted text-muted-foreground",
  "Delivered": "bg-foreground text-background",
  "Pending": "bg-secondary text-secondary-foreground",
  "Booked": "bg-accent text-accent-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground",
};

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-base font-semibold text-foreground">{value || 'No especificado'}</p>
        </div>
    </div>
);

export default function ShipmentDetailPage() {
    const params = useParams();
    const shipmentId = params.shipmentId as string;
    const { user } = useUser();
    const { supabase } = useSupabase();
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState<string>("");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const [isAssigning, setIsAssigning] = useState(false);
    
    const { data: shipment, isLoading } = useSupabaseDoc("shipments", shipmentId);

    // 1. Get driver profiles
    const filterDrivers = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: driverProfiles } = useSupabaseCollection("driverProfiles", filterDrivers);

    const driverIds = useMemo(() => {
        const ids = driverProfiles?.map(d => d.id) || [];
        const s = shipment as any;
        if (s?.clientId && !ids.includes(s.clientId)) {
            ids.push(s.clientId);
        }
        if (s?.driverId && !ids.includes(s.driverId)) {
            ids.push(s.driverId);
        }
        return ids;
    }, [driverProfiles, shipment]);

    // 2. Get user profiles for names
    const filterUsers = useCallback((q: any) => {
        if (driverIds.length === 0) return q.none();
        return q.in('id', driverIds.slice(0, 30));
    }, [driverIds]);
    const { data: userProfiles } = useSupabaseCollection("userProfiles", filterUsers);

    // 3. Get vehicles
    const filterVehicles = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: vehiclesData } = useSupabaseCollection("vehicles", filterVehicles);

    const userMap = useMemo(() => {
        if (!userProfiles) return new Map();
        return new Map(userProfiles.map(u => [u.id, u]));
    }, [userProfiles]);

    const driversList = useMemo(() => {
        if (!driverProfiles || !userProfiles) return [];
        return driverProfiles.map(d => {
            const up = userMap.get(d.id);
            return {
                id: d.id,
                name: up ? `${up.firstName} ${up.lastName}` : "Conductor Desconocido"
            };
        });
    }, [driverProfiles, userProfiles, userMap]);

    const currentClientName = useMemo(() => {
        const s = shipment as any;
        if (!s?.clientId || !userMap) return "No especificado";
        const up = userMap.get(s.clientId);
        return up ? `${up.firstName} ${up.lastName}` : s.clientId;
    }, [shipment, userMap]);

    const currentDriverName = useMemo(() => {
        const s = shipment as any;
        if (!s?.driverId || !userMap) return "No asignado";
        const up = userMap.get(s.driverId);
        return up ? `${up.firstName} ${up.lastName}` : s.driverId;
    }, [shipment, userMap]);

    const currentVehicleDetails = useMemo(() => {
        const s = shipment as any;
        if (!s?.vehicleId || !vehiclesData) return "No asignado";
        const v = vehiclesData.find((v: any) => v.id === s.vehicleId);
        return v ? `${v.make} ${v.model} (${v.licensePlate})` : s.vehicleId;
    }, [shipment, vehiclesData]);

    const handleAssignDriver = async () => {
        if (!shipmentId) return;
        setIsAssigning(true);
        try {
            const { error } = await supabase.from("shipments").update({
                driverId: selectedDriverId === "none" ? null : selectedDriverId,
                vehicleId: selectedVehicleId === "none" ? null : selectedVehicleId,
                updatedAt: new Date().toISOString()
            }).eq("id", shipmentId);
            if (error) throw error;
            setIsAssignDialogOpen(false);
        } catch (error) {
            console.error("Error assigning driver:", error);
            alert("Error al asignar el conductor.");
        } finally {
            setIsAssigning(false);
        }
    };

    const shipmentOrigin = useMemo(() => {
        const s = shipment as any;
        return (s && s.pickup_longitude != null && s.pickup_latitude != null)
        ? [s.pickup_longitude, s.pickup_latitude] as [number, number]
        : null;
    }, [shipment]);

    const shipmentDestination = useMemo(() => {
        const s = shipment as any;
        return (s && s.delivery_longitude != null && s.delivery_latitude != null)
        ? [s.delivery_longitude, s.delivery_latitude] as [number, number]
        : null;
    }, [shipment]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!shipment) {
        return (
            <div className="text-center">
                <h1 className="text-xl font-bold">Envío no encontrado</h1>
                <p className="text-muted-foreground">El envío que busca no existe o no tiene permiso para verlo.</p>
                <Link href="/company/envios">
                    <Button variant="outline" className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Envíos
                    </Button>
                </Link>
            </div>
        );
    }

    if ((shipment as any).carrierId !== user?.id) {
         return (
            <div className="text-center">
              <h1 className="text-xl font-bold">Acceso Denegado</h1>
              <p className="text-muted-foreground">No tiene permiso para ver los detalles de este envío.</p>
               <Link href="/company/envios">
                <Button variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Envíos
                </Button>
            </Link>
            </div>
        );
    }
    
    const s = shipment as any;

    const specialHandling = [
        { label: 'Temp. Controlada', value: s.tempControlled, icon: Thermometer },
        { label: 'Peligroso', value: s.hazardous, icon: Flame },
        { label: 'Requiere Permiso', value: s.requiresPermit, icon: ShieldAlert },
        { label: 'Sobredimensionado', value: s.oversize, icon: Ruler },
        { label: 'Requiere Lona', value: s.requiresTarping, icon: Wind, details: s.tarpType },
    ];
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/company/envios">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Detalles del Envío</h1>
                        <p className="font-mono text-sm text-muted-foreground">{s.id}</p>
                    </div>
                </div>
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${statusStyles[s.status] || 'bg-muted text-muted-foreground'}`}>{s.status}</span>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Ruta y Horarios</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="h-80 w-full rounded-lg overflow-hidden border">
                                <ShipmentMap origin={shipmentOrigin} destination={shipmentDestination} drivers={null} route={null} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-green-500" />Recogida</p>
                                    <p className="text-muted-foreground">{s.pickup_address}</p>
                                    <p className="font-semibold">{format(new Date(s.pickup_date), "dd MMM, yyyy")} <span className="text-muted-foreground font-normal">({s.pickup_window})</span></p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" />Entrega</p>
                                    <p className="text-muted-foreground">{s.delivery_address}</p>
                                    <p className="font-semibold">{format(new Date(s.delivery_date), "dd MMM, yyyy")} <span className="text-muted-foreground font-normal">({s.delivery_window})</span></p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Detalles de la Carga</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <DetailItem icon={Truck} label="Equipamiento" value={s.equipment} />
                            <DetailItem icon={Package} label="Mercancía" value={s.commodity} />
                            <DetailItem icon={Weight} label="Peso" value={`${s.weight_lbs.toLocaleString()} lbs`} />
                            {s.pallets > 0 && <DetailItem icon={Layers} label="Pallets" value={s.pallets} />}
                            {s.dimensions && <DetailItem icon={Ruler} label="Dimensiones" value={s.dimensions} />}
                            {s.itemDescription && <DetailItem icon={ClipboardList} label="Descripción Item" value={s.itemDescription} />}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Requerimientos Especiales</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {specialHandling.map(item => item.value && (
                                <div key={item.label} className="flex items-center gap-2 text-sm font-medium">
                                    <item.icon className="h-5 w-5 text-primary" />
                                    <div>
                                        <span>{item.label}</span>
                                        {item.details && <p className="text-xs text-muted-foreground">{item.details}</p>}
                                    </div>
                                </div>
                            ))}
                            {specialHandling.every(item => !item.value) && <p className="text-muted-foreground text-sm col-span-full">No hay requerimientos especiales.</p>}
                        </CardContent>
                    </Card>
                </div>
                <div className="xl:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Información de Reserva</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <DetailItem icon={DollarSign} label="Tu Pago" value={`$${s.estimated_price.toLocaleString('es-CL')}`} />
                            <DetailItem icon={Building} label="Cliente" value={currentClientName} />
                            <DetailItem icon={UserIcon} label="Conductor" value={currentDriverName} />
                             <DetailItem icon={Truck} label="Vehículo" value={currentVehicleDetails} />
                             <Button className="w-full" disabled={s.status !== 'Booked'} onClick={() => { 
                                 setSelectedDriverId(s.driverId || "none"); 
                                 setSelectedVehicleId(s.vehicleId || "none");
                                 setIsAssignDialogOpen(true); 
                             }}>
                                 <Pencil className="h-4 w-4 mr-2"/>
                                 Asignar / Cambiar Conductor
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Notas Adicionales</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{s.cargoNotes || "No hay notas adicionales."}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Asignar Operación</DialogTitle>
                        <DialogDescription>
                            Seleccione el conductor y el vehículo para esta operación.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Conductor</Label>
                            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un conductor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin asignar</SelectItem>
                                    {driversList.map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id}>
                                            {driver.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vehículo</Label>
                            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un vehículo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin asignar</SelectItem>
                                    {vehiclesData?.map((vehicle: any) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                            {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAssignDriver} disabled={isAssigning}>
                            {isAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Guardar Asignación
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
