"use client";

import { useMemo, useCallback, useState, useEffect, Fragment } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, User, Truck, Calendar, DollarSign, PlusCircle, ExternalLink, Package, ImageIcon, Eye, Zap, Clock, Navigation, ArrowRight, Phone, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ShipmentChat } from "@/components/shipment-chat";
import { PriorityBoostModal } from "@/components/priority-boost-modal";
import ShipmentTrackingMap from "@/components/shipment-tracking-map";

const STATUS_STEPS = [
    { key: "PENDING", label: "Buscando" },
    { key: "ACCEPTED", label: "Asignado" },
    { key: "IN_TRANSIT", label: "En Camino" },
    { key: "COMPLETED", label: "Entregado" }
];

function getStepIndex(status: string) {
    if (status === "PENDING" || status === "Pending") return 0;
    if (status === "ACCEPTED" || status === "EN_ROUTE_TO_PICKUP") return 1;
    if (status === "ARRIVED_AT_PICKUP" || status === "IN_TRANSIT" || status === "ARRIVED_AT_DROPOFF") return 2;
    if (status === "COMPLETED") return 3;
    return -1;
}

const statusStyles: { [key: string]: { bg: string, text: string, label: string } } = {
  "PENDING":           { bg: "bg-primary/10", text: "text-primary", label: "Pendiente" },
  "Pending":           { bg: "bg-primary/10", text: "text-primary", label: "Pendiente" },
  "ACCEPTED":          { bg: "bg-primary/20", text: "text-primary", label: "Aceptado" },
  "EN_ROUTE_TO_PICKUP":{ bg: "bg-accent/20", text: "text-accent-foreground", label: "En Camino a Origen" },
  "ARRIVED_AT_PICKUP": { bg: "bg-accent/30", text: "text-accent-foreground", label: "En Punto de Recogida" },
  "IN_TRANSIT":        { bg: "bg-secondary", text: "text-secondary-foreground", label: "En Tránsito" },
  "ARRIVED_AT_DROPOFF":{ bg: "bg-secondary/80", text: "text-secondary-foreground", label: "En Punto de Entrega" },
  "COMPLETED":         { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Completado" },
  "CANCELLED":         { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Cancelado" },
};

export default function CustomerMyShipmentsPage() {
    const { user } = useUser();
    // View mode is always list for now, we will redesign it.

    // 1. Get all shipments booked by this customer
    const filterCustomerShipments = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("customer_id", user.id).order("createdAt", { ascending: false });
    }, [user]);
    const { data: customerShipments, isLoading: isLoadingShipments } = useSupabaseCollection("shipments", filterCustomerShipments);

    // 2. Get all unique driver IDs from those shipments
    const driverIds = useMemo(() => {
        if (!customerShipments) return [];
        const ids = customerShipments
            .map((s: any) => s.driverId || s.driver_id)
            .filter((id): id is string => !!id);
        return [...new Set(ids)].slice(0, 30);
    }, [customerShipments]);

    // 3. Fetch names via RPC — direct userProfiles query is blocked by RLS.
    const { supabase } = useSupabase();
    const [drivers, setDrivers] = useState<any[] | null>(null);
    const [selectedShipmentPOD, setSelectedShipmentPOD] = useState<any>(null);
    const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<any>(null);
    const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (!selectedShipmentDetail) {
            setDriverLocation(null);
            return;
        }

        const driverId = selectedShipmentDetail.driverId || selectedShipmentDetail.driver_id;
        if (!driverId) {
            setDriverLocation(null);
            return;
        }

        const fetchInitialLocation = async () => {
            const { data } = await supabase
                .from('driverProfiles')
                .select('currentLatitude, currentLongitude')
                .eq('id', driverId)
                .single();
            
            if (data?.currentLatitude && data?.currentLongitude) {
                setDriverLocation([data.currentLongitude, data.currentLatitude]);
            }
        };
        fetchInitialLocation();

        const channel = supabase
            .channel(`driver-location-panel-${driverId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "driverProfiles", filter: `id=eq.${driverId}` },
                (payload) => {
                    if (payload.new.currentLatitude && payload.new.currentLongitude) {
                        setDriverLocation([payload.new.currentLongitude, payload.new.currentLatitude]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedShipmentDetail, supabase]);
    useEffect(() => {
        if (driverIds.length === 0) { setDrivers([]); return; }
        supabase
            .rpc('get_user_profiles_by_ids', { user_ids: driverIds })
            .then(({ data }) => { if (data) setDrivers(data); });
    }, [driverIds, supabase]);

    // 4. Create a map of driver IDs to names for easy lookup
    const driverNameMap = useMemo(() => {
        if (!drivers) return new Map();
        return new Map(drivers.map((d: any) => [d.id, d.full_name || d.email || 'Conductor']));
    }, [drivers]);

    const isLoading = isLoadingShipments;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 backdrop-blur-md p-6 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Mis Envíos Activos</h1>
                    <p className="text-muted-foreground mt-1">Supervisa y gestiona todos los envíos que has solicitado.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Grid/List toggle removed per user request */}
                    <Link href="/customer/new" className="w-full md:w-auto">
                        <Button className="w-full md:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Nuevo Envío
                        </Button>
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="font-medium animate-pulse">Sincronizando tus envíos...</p>
                </div>
            ) : (!customerShipments || customerShipments.length === 0) ? (
                <Card className="border-dashed bg-card/30">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No hay envíos activos</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">No tienes ningún envío en este momento. Puedes crear uno nuevo para empezar a realizar entregas.</p>
                        <Link href="/customer/new">
                            <Button>Crear mi primer envío</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-4">
                        <AnimatePresence mode="wait">
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-card border rounded-2xl overflow-hidden shadow-sm"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 font-semibold">Envío</th>
                                            <th scope="col" className="px-6 py-4 font-semibold">Fecha</th>
                                            <th scope="col" className="px-6 py-4 font-semibold text-right">Precio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {customerShipments.map((shipment: any, idx: number) => {
                                            const driverId = shipment.driverId || shipment.driver_id;
                                            const origin = (shipment.originAddress || shipment.pickup_address || '').split(',')[0] || 'Desconocido';
                                            const destination = (shipment.destinationAddress || shipment.delivery_address || '').split(',')[0] || 'Desconocido';
                                            const price = shipment.client_price || shipment.clientPrice || shipment.estimatedPrice || shipment.price || 0;
                                            const date = shipment.pickup_date ? new Date(shipment.pickup_date) : new Date(shipment.createdAt);
                                            const status = statusStyles[shipment.status] || { bg: "bg-muted", text: "text-muted-foreground", label: shipment.status };
                                            
                                            return (
                                                <Fragment key={shipment.id}>
                                                    <motion.tr 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className={cn(
                                                            "transition-colors group cursor-pointer border-l-2",
                                                            selectedShipmentDetail?.id === shipment.id ? "bg-primary/5 border-primary" : "hover:bg-muted/30 border-transparent"
                                                        )}
                                                        onClick={() => setSelectedShipmentDetail(shipment)}
                                                    >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("p-2 rounded-xl bg-background border shadow-sm group-hover:scale-110 transition-transform", status.text)}>
                                                                {shipment.status === "COMPLETED" ? (
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                ) : shipment.status === "CANCELLED" ? (
                                                                    <XCircle className="h-4 w-4" />
                                                                ) : ["IN_TRANSIT", "ARRIVED_AT_DROPOFF", "ARRIVED_AT_PICKUP", "EN_ROUTE_TO_PICKUP"].includes(shipment.status) ? (
                                                                    <Truck className="h-4 w-4" />
                                                                ) : (
                                                                    <Package className="h-4 w-4" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-mono text-xs font-semibold">{shipment.id}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold", status.bg, status.text)}>
                                                                        {status.label}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">
                                                                        PIN: {['PENDING', 'Pending', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(shipment.status) ? shipment.pickup_code || '----' : ['IN_TRANSIT', 'ARRIVED_AT_DROPOFF'].includes(shipment.status) ? shipment.delivery_code || '----' : '----'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4 text-xs font-medium">
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(date, "dd MMM, yyyy")}
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-bold text-primary">
                                                            CLP {price.toLocaleString('es-CL')}
                                                        </div>
                                                    </td>
                                                    </motion.tr>
                                                    {(shipment.status === "Pending" || shipment.status === "PENDING") && (
                                                        <tr className="bg-transparent">
                                                            <td colSpan={3} className="p-0 h-[2px] bg-transparent overflow-hidden relative">
                                                                <motion.div 
                                                                    className="absolute top-0 bottom-0 bg-gradient-to-r from-transparent via-primary to-transparent opacity-100"
                                                                    initial={{ left: "-30%" }}
                                                                    animate={{ left: "100%" }}
                                                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatType: "mirror" }}
                                                                    style={{ width: "40%", boxShadow: "0 0 10px hsl(var(--primary))" }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                    </div>

                 {/* Right Panel: Details */}
                 <div className="lg:col-span-1 sticky top-6">
                    {selectedShipmentDetail ? (
                            <Card className="border shadow-md overflow-hidden">
                                <CardHeader className="border-b bg-muted/20 pb-4">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Package className="h-5 w-5 text-primary" />
                                        Detalle del Envío
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="h-64 sm:h-96 w-full bg-muted/10 border-b relative">
                                        {(() => {
                                            let originCoords: [number, number] | null = null;
                                            let destCoords: [number, number] | null = null;
                                            let routeGeo: any = null;

                                            if (selectedShipmentDetail) {
                                                // 1. Intentar extraer de detalles si existe la ruta
                                                if (selectedShipmentDetail.details?.route?.coordinates?.length) {
                                                    routeGeo = selectedShipmentDetail.details.route;
                                                    originCoords = routeGeo.coordinates[0];
                                                    destCoords = routeGeo.coordinates[routeGeo.coordinates.length - 1];
                                                }
                                                
                                                // 2. Fallback: extraer coordenadas de campos PostGIS
                                                if (!originCoords && selectedShipmentDetail.origin) {
                                                    if (typeof selectedShipmentDetail.origin === 'string' && selectedShipmentDetail.origin.includes('POINT')) {
                                                        const match = selectedShipmentDetail.origin.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
                                                        if (match) originCoords = [parseFloat(match[1]), parseFloat(match[2])];
                                                    }
                                                }
                                                if (!destCoords && selectedShipmentDetail.destination) {
                                                    if (typeof selectedShipmentDetail.destination === 'string' && selectedShipmentDetail.destination.includes('POINT')) {
                                                        const match = selectedShipmentDetail.destination.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
                                                        if (match) destCoords = [parseFloat(match[1]), parseFloat(match[2])];
                                                    }
                                                }
                                            }
                                            
                                            return (
                                                <ShipmentTrackingMap 
                                                    key={selectedShipmentDetail.id}
                                                    origin={originCoords}
                                                    destination={destCoords}
                                                    routeGeometry={routeGeo}
                                                    driverLocation={driverLocation}
                                                    status={selectedShipmentDetail.status}
                                                />
                                            );
                                        })()}
                                    </div>
                                    <div className="space-y-6 p-5">
                                        {/* ID + Status */}
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs text-muted-foreground">#{selectedShipmentDetail.id}</span>
                                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold", 
                                                (statusStyles[selectedShipmentDetail.status] || { bg: "bg-muted", text: "text-muted-foreground" }).bg, 
                                                (statusStyles[selectedShipmentDetail.status] || { bg: "bg-muted", text: "text-muted-foreground" }).text
                                            )}>
                                                {(statusStyles[selectedShipmentDetail.status] || { label: selectedShipmentDetail.status }).label}
                                            </span>
                                        </div>

                                        {/* Status Stepper */}
                                        {selectedShipmentDetail.status !== "CANCELLED" && (
                                            <div className="py-2">
                                                <div className="flex items-center justify-between relative px-2">
                                                    <div className="absolute left-4 right-4 top-2.5 h-[2px] bg-muted z-0" />
                                                    {STATUS_STEPS.map((step, idx) => {
                                                        const currentIdx = getStepIndex(selectedShipmentDetail.status);
                                                        const isCompleted = idx <= currentIdx;
                                                        const isCurrent = idx === currentIdx;
                                                        return (
                                                            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] transition-colors",
                                                                    isCompleted ? "border-primary bg-primary text-primary-foreground shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "border-muted bg-background text-muted-foreground",
                                                                    isCurrent && "ring-4 ring-primary/20 scale-110"
                                                                )}>
                                                                    {isCompleted ? "✓" : idx + 1}
                                                                </div>
                                                                <span className={cn(
                                                                    "text-[9px] font-bold uppercase tracking-wider",
                                                                    isCompleted ? "text-primary" : "text-muted-foreground"
                                                                )}>{step.label}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Route */}
                                        <div className="rounded-xl border p-4 space-y-3 bg-muted/10">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 w-3 h-3 rounded-full bg-primary shrink-0 shadow shadow-primary/40" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Origen</p>
                                                    <p className="text-sm font-semibold">{selectedShipmentDetail.originAddress || selectedShipmentDetail.pickup_address || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="ml-[5px] h-6 border-l-2 border-dashed border-muted-foreground/30" />
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 w-3 h-3 rounded-full bg-destructive shrink-0 shadow shadow-destructive/40" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Destino</p>
                                                    <p className="text-sm font-semibold">{selectedShipmentDetail.destinationAddress || selectedShipmentDetail.delivery_address || "—"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grid info */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border p-3 bg-muted/5">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Vehículo</p>
                                                <p className="text-sm font-semibold flex items-center gap-1.5">
                                                    <Truck className="h-3.5 w-3.5 text-primary" />
                                                    {selectedShipmentDetail.details?.vehicleType || selectedShipmentDetail.details?.equipment || "Estándar"}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border p-3 bg-muted/5">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Conductor</p>
                                                <p className="text-sm font-semibold flex items-center gap-1.5 truncate">
                                                    <User className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    <span className="truncate">
                                                        {(selectedShipmentDetail.driverId || selectedShipmentDetail.driver_id) 
                                                            ? (driverNameMap.get(selectedShipmentDetail.driverId || selectedShipmentDetail.driver_id) || "Asignando...") 
                                                            : "Sin conductor aún"}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="rounded-xl border p-3 bg-muted/5">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">PIN</p>
                                                <p className="text-lg font-mono font-black text-primary">
                                                    {["Pending","PENDING","ACCEPTED","EN_ROUTE_TO_PICKUP","ARRIVED_AT_PICKUP"].includes(selectedShipmentDetail.status) 
                                                        ? selectedShipmentDetail.pickup_code || "----"
                                                        : ["IN_TRANSIT","ARRIVED_AT_DROPOFF"].includes(selectedShipmentDetail.status) 
                                                        ? selectedShipmentDetail.delivery_code || "----" 
                                                        : "----"}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border p-3 bg-muted/5">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Precio</p>
                                                <p className="text-sm font-bold text-primary">
                                                    ${Number(selectedShipmentDetail.client_price || selectedShipmentDetail.clientPrice || selectedShipmentDetail.estimatedPrice || selectedShipmentDetail.price || 0).toLocaleString("es-CL")}
                                                </p>
                                                {Number(selectedShipmentDetail.priorityBoost) > 0 && (
                                                    <p className="text-[10px] text-primary font-bold mt-0.5">
                                                        🔥 +${Number(selectedShipmentDetail.priorityBoost).toLocaleString("es-CL")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-col gap-2 pt-2">
                                            {["Pending", "PENDING", "ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"].includes(selectedShipmentDetail.status) && (
                                                <Link href={`/customer/shipments/${selectedShipmentDetail.id}`} className="w-full">
                                                    <Button className="w-full gap-2">
                                                        <Navigation className="h-4 w-4" /> Rastreo GPS en Mapa
                                                    </Button>
                                                </Link>
                                            )}
                                            <div className="flex gap-2">
                                                {(selectedShipmentDetail.status === "Pending" || selectedShipmentDetail.status === "PENDING") && (
                                                    <div className="flex-1">
                                                        <PriorityBoostModal
                                                            shipmentId={selectedShipmentDetail.id}
                                                            basePrice={Number(selectedShipmentDetail.estimatedPrice || selectedShipmentDetail.client_price || 0)}
                                                            currentBoost={Number(selectedShipmentDetail.priorityBoost || 0)}
                                                            onBoostApplied={() => { setSelectedShipmentDetail(null); window.location.reload(); }}
                                                        />
                                                    </div>
                                                )}
                                                {(selectedShipmentDetail.driverId || selectedShipmentDetail.driver_id) && (
                                                    <div className="flex-1">
                                                        <ShipmentChat
                                                            shipmentId={selectedShipmentDetail.id}
                                                            isCompanyRole={false}
                                                            triggerButton={
                                                                <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/10">
                                                                    <Phone className="h-4 w-4" /> Hablar
                                                                </Button>
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                    ) : (
                        <Card className="border shadow-sm bg-card/30">
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center h-[500px]">
                                <div className="p-4 rounded-full bg-muted/50 mb-4">
                                    <Package className="h-10 w-10 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Panel de Inspección</h3>
                                <p className="text-sm text-muted-foreground px-6">Selecciona cualquier envío en la tabla para ver sus detalles en tiempo real.</p>
                            </CardContent>
                        </Card>
                    )}
                 </div>
                </div>
            )}

            {/* POD Dialog */}
            <Dialog open={!!selectedShipmentPOD} onOpenChange={(open) => !open && setSelectedShipmentPOD(null)}>
                <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Evidencias de Entrega</DialogTitle>
                    </DialogHeader>
                    {selectedShipmentPOD && (
                        <div className="space-y-6 py-4">
                            {selectedShipmentPOD.pickup_photo && (
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Foto de Recogida</p>
                                    <img src={selectedShipmentPOD.pickup_photo} alt="Recogida" className="w-full rounded-md border" />
                                </div>
                            )}
                            {selectedShipmentPOD.delivery_photo && (
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Foto de Entrega</p>
                                    <img src={selectedShipmentPOD.delivery_photo} alt="Entrega" className="w-full rounded-md border" />
                                </div>
                            )}
                            {selectedShipmentPOD.delivery_signature && (
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Firma del Cliente</p>
                                    <div className="bg-white rounded-md border p-2">
                                        <img src={selectedShipmentPOD.delivery_signature} alt="Firma" className="w-full" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}
