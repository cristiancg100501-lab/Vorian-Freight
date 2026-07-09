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
    X,
} from "lucide-react";
import dynamic from 'next/dynamic';
const ShipmentMap = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});
import Link from "next/link";
import { useMemo, useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { ShipmentChat } from "@/components/shipment-chat";

const statusStyles: { [key: string]: string } = {
  "PENDING": "bg-secondary text-secondary-foreground border-secondary",
  "ACCEPTED": "bg-accent/20 text-accent-foreground border-accent",
  "EN_ROUTE_TO_PICKUP": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "ARRIVED_AT_PICKUP": "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
  "IN_TRANSIT": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "ARRIVED_AT_DROPOFF": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "COMPLETED": "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  "CANCELLED": "bg-destructive/20 text-destructive border-destructive",
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
    const { user, isUserLoading } = useUser();
    const { supabase } = useSupabase();
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState<string>("");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const [isAssigning, setIsAssigning] = useState(false);

    const { data: shipment, isLoading: isShipmentLoading } = useSupabaseDoc("shipments", shipmentId);
    const isLoading = isShipmentLoading || isUserLoading;

    // 1. Get driver profiles
    const filterDrivers = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: driverProfiles } = useSupabaseCollection("driverProfiles", filterDrivers);



    // 2. Direct fetch via RPC — userProfiles is blocked by RLS for anon/authenticated roles.
    //    The RPC function has SECURITY DEFINER and returns only safe fields.
    const [userProfiles, setUserProfiles] = useState<any[] | null>(null);

    useEffect(() => {
        const s = shipment as any;
        const clientId = s?.clientId || s?.customer_id;
        const driverId = s?.driverId || s?.driver_id;
        const profileIds = [...new Set([
            clientId,
            driverId,
            ...(driverProfiles?.map((d: any) => d.id) || [])
        ])].filter(Boolean) as string[];

        if (profileIds.length === 0) return;

        supabase
            .rpc('get_user_profiles_by_ids', { user_ids: profileIds })
            .then(({ data }) => {
                if (data) setUserProfiles(data);
            });
    }, [shipment, driverProfiles, supabase]);

    // 3. Get vehicles
    const filterVehicles = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: vehiclesData } = useSupabaseCollection("vehicles", filterVehicles);

    const userMap = useMemo(() => {
        if (!userProfiles) return new Map();
        // RPC returns { id, full_name, email }
        return new Map(userProfiles.map((u: any) => [u.id, u]));
    }, [userProfiles]);

    const driversList = useMemo(() => {
        if (!driverProfiles) return [];
        return driverProfiles.map((d: any) => {
            const up = userMap.get(d.id);
            return { id: d.id, name: up?.full_name || up?.email || 'Conductor' };
        });
    }, [driverProfiles, userMap]);

    const currentClientName = useMemo(() => {
        const s = shipment as any;
        const clientId = s?.clientId || s?.customer_id;
        if (!clientId) return "No especificado";
        const up = userMap.get(clientId);
        if (!up) return clientId;
        return up.full_name || up.email || clientId;
    }, [shipment, userMap]);

    const currentDriverName = useMemo(() => {
        const s = shipment as any;
        const driverId = s?.driverId || s?.driver_id;
        if (!driverId) return "No asignado";
        const up = userMap.get(driverId);
        if (!up) return driverId;
        return up.full_name || up.email || driverId;
    }, [shipment, userMap]);

    const currentVehicleDetails = useMemo(() => {
        const s = shipment as any;
        const vehicleId = s?.vehicleId || s?.vehicle_id || s?.details?.vehicleId;
        if (!vehicleId || !vehiclesData) return "No asignado";
        const v = vehiclesData.find((v: any) => v.id === vehicleId);
        return v ? `${v.make} ${v.model} (${v.licensePlate})` : vehicleId;
    }, [shipment, vehiclesData]);

    const handleAssignDriver = async () => {
        if (!shipmentId) return;
        setIsAssigning(true);
        try {
            const s = shipment as any;
            const updatedDetails = {
                ...(s.details || {}),
                vehicleId: selectedVehicleId === "none" ? null : selectedVehicleId
            };

            const { error } = await supabase.from("shipments").update({
                driverId: selectedDriverId === "none" ? null : selectedDriverId,
                status: selectedDriverId === "none" ? "PENDING" : "ACCEPTED",
                details: updatedDetails,
                updatedAt: new Date().toISOString()
            }).eq("id", shipmentId);
            if (error) throw error;

            // Enviar notificación Push al conductor asignado
            if (selectedDriverId && selectedDriverId !== "none") {
                fetch('/api/notifications/notify-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: selectedDriverId,
                        title: '🚚 Nueva Carga Asignada',
                        body: 'Tu empresa te ha asignado una nueva carga. Abre la app para ver los detalles.',
                        data: { shipmentId }
                    })
                }).catch(err => console.error("Error trigger push:", err));
            }

            setIsAssignDialogOpen(false);
        } catch (error) {
            console.error("Error assigning driver:", error);
            alert("Error al asignar el conductor.");
        } finally {
            setIsAssigning(false);
        }
    };

    const handleReturnLoad = async () => {
        if (!shipmentId || !user) return;
        if (!confirm("⚠️ ¿Estás seguro de devolver esta carga al mercado?\n\nEsto añadirá 1 Strike a tu perfil de empresa por cancelación, lo que podría afectar tu reputación y nivel de socio.")) {
            return;
        }

        try {
            const { data, error } = await supabase.rpc('return_load', {
                p_shipment_id: shipmentId,
                p_company_id: user.id
            });

            if (error) throw error;
            
            if (data && data.success) {
                alert(data.message || "Carga devuelta al mercado exitosamente.");
                // Redirect back to the loads list or refresh
                window.location.href = "/company/envios";
            } else {
                alert(data?.message || "No se pudo devolver la carga.");
            }
        } catch (error) {
            console.error("Error returning load:", error);
            alert("Ocurrió un error al intentar devolver la carga.");
        }
    };

    const parsePoint = (pt: string | null | undefined) => {
        if (!pt) return null;
        const match = pt.match(/POINT\(([-.\d]+)\s+([-.\d]+)\)/i);
        if (match) return [parseFloat(match[1]), parseFloat(match[2])] as [number, number];
        return null;
    };

    // Parse PostGIS WKB hex (EWKB little-endian) to [lng, lat]
    const parseWKBHex = (hex: string): [number, number] | null => {
        if (!hex || hex.length < 42) return null;
        try {
            if (hex.substring(0, 2).toLowerCase() !== '01') return null;
            // Read type (4 bytes LE) to detect SRID flag
            const typeBytes = hex.substring(2, 10).match(/.{2}/g)!.map(b => parseInt(b, 16));
            const typeVal = typeBytes[0] | (typeBytes[1] << 8) | (typeBytes[2] << 16) | (typeBytes[3] << 24);
            const hasSRID = (typeVal & 0x20000000) !== 0;
            const startHex = hasSRID ? 18 : 10; // skip byte order(2) + type(8) + optional SRID(8)
            const hexToDouble = (h: string): number => {
                const bytes = h.match(/.{2}/g)!.map(b => parseInt(b, 16));
                const buf = new ArrayBuffer(8);
                const view = new DataView(buf);
                bytes.forEach((b, i) => view.setUint8(i, b));
                return view.getFloat64(0, true); // little-endian
            };
            const lng = hexToDouble(hex.substring(startHex, startHex + 16));
            const lat = hexToDouble(hex.substring(startHex + 16, startHex + 32));
            if (isNaN(lng) || isNaN(lat)) return null;
            return [lng, lat];
        } catch { return null; }
    };

    const shipmentOrigin = useMemo(() => {
        const s = shipment as any;
        return parseWKBHex(s?.origin) || parsePoint(s?.origin) || 
               (s?.pickup_longitude != null && s?.pickup_latitude != null ? [s.pickup_longitude, s.pickup_latitude] as [number, number] : null);
    }, [shipment]);

    const shipmentDestination = useMemo(() => {
        const s = shipment as any;
        return parseWKBHex(s?.destination) || parsePoint(s?.destination) ||
               (s?.delivery_longitude != null && s?.delivery_latitude != null ? [s.delivery_longitude, s.delivery_latitude] as [number, number] : null);
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

    const shipmentCarrierId = (shipment as any).carrierId || (shipment as any).carrier_id;
    if (shipmentCarrierId !== user?.id) {
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
        { label: 'Temp. Controlada', value: s.tempControlled || s?.details?.specialHandling?.tempControlled, icon: Thermometer },
        { label: 'Peligroso', value: s.hazardous || s?.details?.specialHandling?.hazardous, icon: Flame },
        { label: 'Requiere Permiso', value: s.requiresPermit || s?.details?.specialHandling?.requiresPermit, icon: ShieldAlert },
        { label: 'Sobredimensionado', value: s.oversize || s?.details?.specialHandling?.oversize, icon: Ruler },
        { label: 'Requiere Lona', value: s.requiresTarping || s?.details?.specialHandling?.requiresTarping, icon: Wind, details: s.tarpType || s?.details?.specialHandling?.tarpType },
    ];
    
    const pickupAddress = s?.originAddress || s?.details?.originAddress || s?.pickup_address || "No especificada";
    const deliveryAddress = s?.destinationAddress || s?.details?.destinationAddress || s?.delivery_address || "No especificada";
    const pickupDate = s?.details?.pickupDate || s?.pickup_date || s?.pickupDate;
    const deliveryDate = s?.details?.deliveryDate || s?.delivery_date || s?.deliveryDate;
    const pickupWindow = s?.details?.pickupWindow || s?.pickup_window || s?.pickupWindow;
    const deliveryWindow = s?.details?.deliveryWindow || s?.delivery_window || s?.deliveryWindow;

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
                <div className="flex items-center gap-3">
                    <ShipmentChat shipmentId={shipmentId} isCompanyRole={true} />
                    <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${statusStyles[s.status] || 'bg-muted text-muted-foreground'}`}>{s.status}</span>
                </div>
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
                                    <p className="text-muted-foreground">{pickupAddress}</p>
                                     <p className="font-semibold">{pickupDate ? format(new Date(pickupDate), "dd MMM, yyyy") : "Por definir"}{pickupWindow ? <span className="text-muted-foreground font-normal"> ({pickupWindow})</span> : null}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" />Entrega</p>
                                    <p className="text-muted-foreground">{deliveryAddress}</p>
                                    <p className="font-semibold">{deliveryDate ? format(new Date(deliveryDate), "dd MMM, yyyy") : "Por definir"}{deliveryWindow ? <span className="text-muted-foreground font-normal"> ({deliveryWindow})</span> : null}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Detalles de la Carga</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <DetailItem icon={Truck} label="Equipamiento" value={s.equipment} />
                            <DetailItem icon={Package} label="Mercancía" value={s.commodity} />
                            <DetailItem icon={Weight} label="Peso" value={`${(s.weight_lbs || 0).toLocaleString()} lbs`} />
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
                            <DetailItem icon={DollarSign} label="Tu Pago" value={`$${(s.estimatedPrice || s.estimated_price || s.price || 0).toLocaleString('es-CL')}`} />
                            <DetailItem icon={Building} label="Cliente" value={currentClientName} />
                            <DetailItem icon={UserIcon} label="Conductor" value={currentDriverName} />
                             <DetailItem icon={Truck} label="Vehículo" value={currentVehicleDetails} />
                             <Button className="w-full" disabled={s.status !== 'ACCEPTED'} onClick={() => { 
                                 setSelectedDriverId(s.driverId || s.driver_id || "none"); 
                                 setSelectedVehicleId(s.vehicleId || s.vehicle_id || s.details?.vehicleId || "none");
                                 setIsAssignDialogOpen(true); 
                             }}>
                                 <Pencil className="h-4 w-4 mr-2"/>
                                 Asignar / Cambiar Conductor
                            </Button>
                            {s.status === 'ACCEPTED' && (
                                <Button 
                                    variant="destructive" 
                                    className="w-full" 
                                    onClick={handleReturnLoad}
                                >
                                    <X className="h-4 w-4 mr-2"/>
                                    Devolver Carga al Mercado
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Notas Adicionales</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{s.cargoNotes || "No hay notas adicionales."}</p>
                        </CardContent>
                    </Card>
                    
                    {(s.pickup_photo || s.delivery_photo || s.delivery_signature) && (
                        <Card>
                            <CardHeader><CardTitle>Evidencias (POD)</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {s.pickup_photo && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold">Foto de Recogida</p>
                                        <img src={s.pickup_photo} alt="Recogida" className="w-full rounded-md border" />
                                    </div>
                                )}
                                {s.delivery_photo && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold">Foto de Entrega</p>
                                        <img src={s.delivery_photo} alt="Entrega" className="w-full rounded-md border" />
                                    </div>
                                )}
                                {s.delivery_signature && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold">Firma del Cliente</p>
                                        <div className="bg-white rounded-md border p-2">
                                            <img src={s.delivery_signature} alt="Firma" className="w-full" />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
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
