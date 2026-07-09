"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
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
import { MapPin, User, Truck, Calendar, DollarSign, PlusCircle, ExternalLink, Package, ImageIcon, Eye, Zap, Clock, Navigation, ArrowRight, Phone } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ShipmentChat } from "@/components/shipment-chat";
import { PriorityBoostModal } from "@/components/priority-boost-modal";
const statusStyles: { [key: string]: { bg: string, text: string, label: string } } = {
  "PENDING":           { bg: "bg-orange-500/10", text: "text-orange-500", label: "Pendiente" },
  "Pending":           { bg: "bg-orange-500/10", text: "text-orange-500", label: "Pendiente" },
  "ACCEPTED":          { bg: "bg-blue-500/10", text: "text-blue-500", label: "Aceptado" },
  "EN_ROUTE_TO_PICKUP":{ bg: "bg-blue-500/10", text: "text-blue-600", label: "En Camino a Origen" },
  "ARRIVED_AT_PICKUP": { bg: "bg-indigo-500/10", text: "text-indigo-500", label: "En Punto de Recogida" },
  "IN_TRANSIT":        { bg: "bg-sky-500/10", text: "text-sky-600", label: "En Tránsito" },
  "ARRIVED_AT_DROPOFF":{ bg: "bg-teal-500/10", text: "text-teal-600", label: "En Punto de Entrega" },
  "COMPLETED":         { bg: "bg-green-500/10", text: "text-green-600", label: "Completado" },
  "CANCELLED":         { bg: "bg-red-500/10", text: "text-red-500", label: "Cancelado" },
};

export default function CustomerMyShipmentsPage() {
    const { user } = useUser();
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");

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
                    <div className="flex bg-muted p-1 rounded-lg">
                        <Button 
                            variant={viewMode === "list" ? "default" : "ghost"} 
                            size="sm" 
                            className="h-8"
                            onClick={() => setViewMode("list")}
                        >
                            Lista
                        </Button>
                        <Button 
                            variant={viewMode === "grid" ? "default" : "ghost"} 
                            size="sm"
                            className="h-8"
                            onClick={() => setViewMode("grid")}
                        >
                            Cuadrícula
                        </Button>
                    </div>
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
                <AnimatePresence mode="wait">
                    {viewMode === "list" ? (
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
                                            <th scope="col" className="px-6 py-4 font-semibold">Ruta</th>
                                            <th scope="col" className="px-6 py-4 font-semibold">Fecha</th>
                                            <th scope="col" className="px-6 py-4 font-semibold">Conductor</th>
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
                                                <motion.tr 
                                                    key={shipment.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="hover:bg-muted/30 transition-colors group"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("p-2 rounded-xl bg-background border shadow-sm group-hover:scale-110 transition-transform", status.text)}>
                                                                <Package className="h-4 w-4" />
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
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                                                <span className="font-medium truncate max-w-[120px]">{origin}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                                <span className="font-medium truncate max-w-[120px]">{destination}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium">
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(date, "dd MMM, yyyy")}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                                <User className="h-3 w-3 text-muted-foreground" />
                                                            </div>
                                                            <span className="text-xs font-medium truncate max-w-[100px]">
                                                                {driverId ? (driverNameMap.get(driverId) || <span className="text-orange-500 animate-pulse">Asignando...</span>) : <span className="text-muted-foreground">Pendiente</span>}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-bold text-primary mb-2">
                                                            CLP {price.toLocaleString('es-CL')}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <ShipmentChat 
                                                                shipmentId={shipment.id} 
                                                                isCompanyRole={false} 
                                                                triggerButton={
                                                                    <Button variant="outline" size="sm" className="text-xs">
                                                                        Chat Transporte 💬
                                                                    </Button>
                                                                }
                                                            />
                                                            <Button 
                                                                size="sm" 
                                                                className="text-xs gap-1"
                                                                onClick={(e) => { e.stopPropagation(); setSelectedShipmentDetail(shipment); }}
                                                            >
                                                                <Eye className="h-3 w-3" /> Ver Detalle
                                                            </Button>
                                                            {(shipment.status === "Pending" || shipment.status === "PENDING") && (
                                                                <PriorityBoostModal 
                                                                    shipmentId={shipment.id}
                                                                    basePrice={Number(shipment.estimatedPrice || shipment.client_price || 0)}
                                                                    currentBoost={Number(shipment.priorityBoost || 0)}
                                                                    onBoostApplied={() => {
                                                                        window.location.reload();
                                                                    }}
                                                                />
                                                            )}
                                                            {(shipment.pickup_photo || shipment.delivery_photo || shipment.delivery_signature) && (
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm"
                                                                    className="text-xs"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedShipmentPOD(shipment);
                                                                    }}
                                                                >
                                                                    <ImageIcon className="h-3 w-3 mr-1" />
                                                                    Evidencias
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                        >
                            {customerShipments.map((shipment: any, idx: number) => {
                                const driverId = shipment.driverId || shipment.driver_id;
                                const origin = (shipment.originAddress || shipment.pickup_address || '').split(',')[0] || 'Desconocido';
                                const destination = (shipment.destinationAddress || shipment.delivery_address || '').split(',')[0] || 'Desconocido';
                                const price = shipment.client_price || shipment.clientPrice || shipment.estimatedPrice || shipment.price || 0;
                                const date = shipment.pickup_date ? new Date(shipment.pickup_date) : new Date(shipment.createdAt);
                                const status = statusStyles[shipment.status] || { bg: "bg-muted", text: "text-muted-foreground", label: shipment.status };
                                
                                return (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={shipment.id}
                                    >
                                        <Card className="hover:shadow-lg transition-all border group h-full flex flex-col overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                                            <CardHeader className="pb-4 border-b bg-muted/20">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold mb-2 uppercase tracking-wider", status.bg, status.text)}>
                                                            {status.label}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                                                                <Package className="h-3 w-3" />
                                                                #{shipment.id}
                                                            </p>
                                                            <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">
                                                                PIN: {['PENDING', 'Pending', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(shipment.status) ? shipment.pickup_code || '----' : ['IN_TRANSIT', 'ARRIVED_AT_DROPOFF'].includes(shipment.status) ? shipment.delivery_code || '----' : '----'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-primary">CLP {price.toLocaleString('es-CL')}</p>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 flex-1 space-y-4">
                                                <div className="space-y-3 relative before:absolute before:inset-y-3 before:left-[5px] before:w-0.5 before:bg-muted-foreground/20">
                                                    <div className="flex items-start gap-3 relative z-10">
                                                        <div className="mt-0.5 w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/30 shrink-0" />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Origen</p>
                                                            <p className="text-sm font-medium line-clamp-1">{origin}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 relative z-10">
                                                        <div className="mt-0.5 w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/30 shrink-0" />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Destino</p>
                                                            <p className="text-sm font-medium line-clamp-1">{destination}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-4 border-t border-dashed">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                            <User className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Conductor</p>
                                                            <p className="text-xs font-semibold truncate max-w-[100px]">
                                                                {driverId ? (driverNameMap.get(driverId) || <span className="text-orange-500">Asignando...</span>) : 'Pendiente'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Fecha</p>
                                                        <p className="text-xs font-semibold">{format(date, "dd MMM")}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <div className="px-6 pb-4 pt-0 space-y-2">
                                                <ShipmentChat 
                                                    shipmentId={shipment.id} 
                                                    isCompanyRole={false} 
                                                    triggerButton={
                                                        <Button variant="outline" className="w-full">
                                                            Chat Transporte 💬
                                                        </Button>
                                                    }
                                                />
                                                <div className="flex gap-2">
                                                    <Button 
                                                        className="flex-1 gap-2"
                                                        onClick={() => setSelectedShipmentDetail(shipment)}
                                                    >
                                                        <Eye className="h-4 w-4" /> Ver Detalle
                                                    </Button>
                                                    {(shipment.status === "Pending" || shipment.status === "PENDING") && (
                                                        <PriorityBoostModal 
                                                            shipmentId={shipment.id}
                                                            basePrice={Number(shipment.estimatedPrice || shipment.client_price || 0)}
                                                            currentBoost={Number(shipment.priorityBoost || 0)}
                                                            onBoostApplied={() => {
                                                                window.location.reload();
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                {(shipment.pickup_photo || shipment.delivery_photo || shipment.delivery_signature) && (
                                                    <Button 
                                                        variant="outline" 
                                                        className="w-full"
                                                        onClick={() => setSelectedShipmentPOD(shipment)}
                                                    >
                                                        <ImageIcon className="h-4 w-4 mr-2" />
                                                        Ver Evidencias (POD)
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
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

            {/* Shipment Detail Dialog */}
            <Dialog open={!!selectedShipmentDetail} onOpenChange={(open) => !open && setSelectedShipmentDetail(null)}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Package className="h-5 w-5 text-primary" />
                            Detalle del Envío
                        </DialogTitle>
                    </DialogHeader>
                    {selectedShipmentDetail && (() => {
                        const s = selectedShipmentDetail;
                        const st = statusStyles[s.status] || { bg: "bg-muted", text: "text-muted-foreground", label: s.status };
                        const dId = s.driverId || s.driver_id;
                        const driverName = dId ? (driverNameMap.get(dId) || "Asignando...") : "Sin conductor aún";
                        const price = s.client_price || s.clientPrice || s.estimatedPrice || s.price || 0;
                        const activeStatuses = ["Pending", "PENDING", "ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"];
                        const isActive = activeStatuses.includes(s.status);
                        return (
                            <div className="space-y-5 py-2">
                                {/* ID + Status */}
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs text-muted-foreground">#{s.id}</span>
                                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold", st.bg, st.text)}>{st.label}</span>
                                </div>

                                {/* Route */}
                                <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-3 h-3 rounded-full bg-green-500 shrink-0 shadow shadow-green-400/40" />
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Origen</p>
                                            <p className="text-sm font-semibold">{s.originAddress || s.pickup_address || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="ml-[5px] h-6 border-l-2 border-dashed border-muted-foreground/30" />
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-3 h-3 rounded-full bg-red-500 shrink-0 shadow shadow-red-400/40" />
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Destino</p>
                                            <p className="text-sm font-semibold">{s.destinationAddress || s.delivery_address || "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Grid info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border p-3 bg-muted/10">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Vehículo</p>
                                        <p className="text-sm font-semibold flex items-center gap-1.5">
                                            <Truck className="h-3.5 w-3.5 text-primary" />
                                            {s.details?.vehicleType || s.details?.equipment || "Estándar"}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3 bg-muted/10">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Conductor</p>
                                        <p className="text-sm font-semibold flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-primary" />
                                            {driverName}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3 bg-muted/10">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">PIN de Recogida</p>
                                        <p className="text-lg font-mono font-black text-primary">
                                            {["Pending","PENDING","ACCEPTED","EN_ROUTE_TO_PICKUP","ARRIVED_AT_PICKUP"].includes(s.status) 
                                                ? s.pickup_code || "----"
                                                : ["IN_TRANSIT","ARRIVED_AT_DROPOFF"].includes(s.status) 
                                                ? s.delivery_code || "----" 
                                                : "----"}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3 bg-muted/10">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Precio</p>
                                        <p className="text-sm font-bold text-primary">
                                            CLP {Number(price).toLocaleString("es-CL")}
                                        </p>
                                        {Number(s.priorityBoost) > 0 && (
                                            <p className="text-[10px] text-orange-500 font-bold mt-0.5">
                                                🔥 +{Number(s.priorityBoost).toLocaleString("es-CL")} bono
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 pt-1">
                                    {isActive && (
                                        <Link href={`/customer/shipments/${s.id}`} className="flex-1">
                                            <Button className="w-full gap-2">
                                                <Navigation className="h-4 w-4" /> Ver en Mapa
                                            </Button>
                                        </Link>
                                    )}
                                    {(s.status === "Pending" || s.status === "PENDING") && (
                                        <PriorityBoostModal
                                            shipmentId={s.id}
                                            basePrice={Number(s.estimatedPrice || s.client_price || 0)}
                                            currentBoost={Number(s.priorityBoost || 0)}
                                            onBoostApplied={() => { setSelectedShipmentDetail(null); window.location.reload(); }}
                                        />
                                    )}
                                    <ShipmentChat
                                        shipmentId={s.id}
                                        isCompanyRole={false}
                                        triggerButton={
                                            <Button variant="outline" className="gap-2">
                                                Chat 💬
                                            </Button>
                                        }
                                    />
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
