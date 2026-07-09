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
import { MapPin, User, Truck, Calendar, DollarSign, PlusCircle, ExternalLink, Package } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const statusStyles: { [key: string]: { bg: string, text: string, label: string } } = {
  "PENDING":           { bg: "bg-orange-500/10", text: "text-orange-500", label: "Pendiente" },
  "ACCEPTED":          { bg: "bg-blue-500/10", text: "text-blue-500", label: "Aceptado" },
  "EN_ROUTE_TO_PICKUP":{ bg: "bg-blue-500/10", text: "text-blue-600", label: "En Camino a Origen" },
  "ARRIVED_AT_PICKUP": { bg: "bg-indigo-500/10", text: "text-indigo-500", label: "En Punto de Recogida" },
  "IN_TRANSIT":        { bg: "bg-sky-500/10", text: "text-sky-600", label: "En Tránsito" },
  "ARRIVED_AT_DROPOFF":{ bg: "bg-teal-500/10", text: "text-teal-600", label: "En Punto de Entrega" },
  "COMPLETED":         { bg: "bg-green-500/10", text: "text-green-600", label: "Completado" },
  "CANCELLED":         { bg: "bg-red-500/10", text: "text-red-500", label: "Cancelado" },
};

export default function CompanyMyShipmentsPage() {
    const { user } = useUser();
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");

    // 1. Get all shipments booked by this company
    const filterCompanyShipments = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("carrierId", user.id).order("createdAt", { ascending: false });
    }, [user]);
    const { data: companyShipments, isLoading: isLoadingShipments } = useSupabaseCollection("shipments", filterCompanyShipments);

    // 2. Get all unique driver IDs from those shipments
    const driverIds = useMemo(() => {
        if (!companyShipments) return [];
        const ids = companyShipments
            .map((s: any) => s.driverId || s.driver_id)
            .filter((id): id is string => !!id);
        return [...new Set(ids)].slice(0, 30);
    }, [companyShipments]);

    // 3. Fetch names via RPC — direct userProfiles query is blocked by RLS.
    const { supabase } = useSupabase();
    const [drivers, setDrivers] = useState<any[] | null>(null);
    useEffect(() => {
        if (driverIds.length === 0) { setDrivers([]); return; }
        supabase
            .rpc('get_user_profiles_by_ids', { user_ids: driverIds })
            .then(({ data }) => { if (data) setDrivers(data); });
    }, [driverIds, supabase]);

    // 4. Create a map of driver IDs to names for easy lookup
    const driverNameMap = useMemo(() => {
        if (!drivers) return new Map();
        // RPC returns { id, full_name, email }
        return new Map(drivers.map((d: any) => [d.id, d.full_name || d.email || 'Conductor']));
    }, [drivers]);

    const isLoading = isLoadingShipments;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 backdrop-blur-md p-6 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Mis Envíos Activos</h1>
                    <p className="text-muted-foreground mt-1">Gestione sus operaciones logísticas y asigne conductores a sus cargas.</p>
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
                    <Link href="/company/shipments" className="w-full md:w-auto">
                        <Button className="w-full md:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Buscar Nuevas Cargas
                        </Button>
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="font-medium animate-pulse">Sincronizando operaciones...</p>
                </div>
            ) : (!companyShipments || companyShipments.length === 0) ? (
                <Card className="border-dashed bg-card/30">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No hay envíos activos</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">Su flota no tiene cargas asignadas en este momento. Busque nuevas oportunidades en el mercado.</p>
                        <Link href="/company/shipments">
                            <Button>Ir al Mercado de Cargas</Button>
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
                                            <th scope="col" className="px-6 py-4 font-semibold">Operación</th>
                                            <th scope="col" className="px-6 py-4 font-semibold">Ruta</th>
                                            <th scope="col" className="px-6 py-4 font-semibold">Fechas</th>
                                            <th scope="col" className="px-6 py-4 font-semibold">Conductor</th>
                                            <th scope="col" className="px-6 py-4 font-semibold">Ingreso</th>
                                            <th scope="col" className="px-6 py-4 font-semibold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {companyShipments.map((shipment: any, idx: number) => {
                                            const driverId = shipment.driverId || shipment.driver_id;
                                            const origin = (shipment.originAddress || shipment.pickup_address || '').split(',')[0] || 'Desconocido';
                                            const destination = (shipment.destinationAddress || shipment.delivery_address || '').split(',')[0] || 'Desconocido';
                                            const price = shipment.estimatedPrice || shipment.estimated_price || shipment.price || 0;
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
                                                                <Truck className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className="font-mono text-xs font-semibold">{shipment.id}</p>
                                                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1", status.bg, status.text)}>
                                                                    {status.label}
                                                                </span>
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
                                                                {driverId ? (driverNameMap.get(driverId) || <span className="text-orange-500 animate-pulse">Asignando...</span>) : <span className="text-muted-foreground">No asignado</span>}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-primary">
                                                            CLP {price.toLocaleString('es-CL')}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link href={`/company/envios/${shipment.id}`}>
                                                            <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                Ver Detalles
                                                                <ExternalLink className="h-3 w-3 ml-2" />
                                                            </Button>
                                                        </Link>
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
                            {companyShipments.map((shipment: any, idx: number) => {
                                const driverId = shipment.driverId || shipment.driver_id;
                                const origin = (shipment.originAddress || shipment.pickup_address || '').split(',')[0] || 'Desconocido';
                                const destination = (shipment.destinationAddress || shipment.delivery_address || '').split(',')[0] || 'Desconocido';
                                const price = shipment.estimatedPrice || shipment.estimated_price || shipment.price || 0;
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
                                                        <p className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                                                            <Package className="h-3 w-3" />
                                                            #{shipment.id}
                                                        </p>
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
                                            <div className="p-4 pt-0">
                                                <Link href={`/company/envios/${shipment.id}`}>
                                                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                                                        Gestionar Operación
                                                    </Button>
                                                </Link>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}
