"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Navigation, Package, Clock, DollarSign, CheckCircle2, ChevronRight, Activity, Plus } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useCallback, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PriorityBoostModal } from "@/components/priority-boost-modal";
import { ChatWidget } from "@/components/chat-widget";

const statusStyles: { [key: string]: string } = {
  "PENDING": "bg-secondary text-secondary-foreground border-secondary",
  "Pending": "bg-secondary text-secondary-foreground border-secondary",
  "ACCEPTED": "bg-accent/20 text-accent-foreground border-accent",
  "EN_ROUTE_TO_PICKUP": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "ARRIVED_AT_PICKUP": "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
  "IN_TRANSIT": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "ARRIVED_AT_DROPOFF": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "COMPLETED": "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  "CANCELLED": "bg-destructive/20 text-destructive border-destructive",
};

const statusLabels: { [key: string]: string } = {
  "PENDING": "Buscando Chofer",
  "Pending": "Buscando Chofer",
  "ACCEPTED": "Chofer Asignado",
  "EN_ROUTE_TO_PICKUP": "Chofer en Camino",
  "ARRIVED_AT_PICKUP": "Chofer en Origen",
  "IN_TRANSIT": "En Tránsito",
  "ARRIVED_AT_DROPOFF": "Chofer en Destino",
  "COMPLETED": "Entregado",
  "CANCELLED": "Cancelado",
};

export default function CustomerDashboard() {
  const { user } = useUser();
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const filterShipments = useCallback((q: any) => {
    if (!user) return q;
    return q.eq("customer_id", user.id).order("createdAt", { ascending: false });
  }, [user]);

  const { data: shipments, isLoading } = useSupabaseCollection("shipments", filterShipments);

  useEffect(() => {
    if (shipments && shipments.length > 0 && !selectedShipment) {
      // First try to find a shipment that is already in progress
      const active = shipments.find((s:any) => ['ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF'].includes(s.status));
      if (active) {
        setSelectedShipment(active);
        return;
      }
      
      // If none in progress, check if there's any pending
      const pending = shipments.find((s:any) => s.status === 'PENDING');
      if (pending) {
        setSelectedShipment(pending);
        return;
      }
      
      setSelectedShipment(shipments[0]);
    }
  }, [shipments, selectedShipment]);

  // --- Metrics Calculations ---
  const metrics = useMemo(() => {
    if (!shipments) return { total: 0, active: 0, spent: 0, delivered: 0, chartData: [] };
    
    let active = 0;
    let delivered = 0;
    let spent = 0;
    
    // For the chart, aggregate cost by day for the last 7 days
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return {
        dateStr: format(d, 'yyyy-MM-dd'),
        display: format(d, 'dd MMM', { locale: es }),
        cost: 0,
        volume: 0
      };
    });

    shipments.forEach((s: any) => {
      // Counters
      if (['ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF'].includes(s.status)) active++;
      if (['COMPLETED'].includes(s.status)) delivered++;
      
      const price = parseFloat(s.estimatedPrice) || parseFloat(s.client_price) || 0;
      spent += price;

      // Chart aggregation
      if (s.createdAt) {
        const sDate = format(parseISO(s.createdAt), 'yyyy-MM-dd');
        const day = last7Days.find(d => d.dateStr === sDate);
        if (day) {
          day.cost += price;
          day.volume += 1;
        }
      }
    });

    // If there's no real data for the chart, inject a dummy trend to keep it looking premium
    const hasData = last7Days.some(d => d.cost > 0 || d.volume > 0);
    const chartData = hasData ? last7Days : last7Days.map((d, i) => ({
       ...d, 
       cost: [120000, 150000, 90000, 210000, 180000, 320000, 250000][i] * (Math.random() * 0.4 + 0.8), // simulated
       dummy: true
    }));

    return { total: shipments.length, active, spent, delivered, chartData, isDummy: !hasData };
  }, [shipments]);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Bienvenido, {user?.user_metadata?.first_name || 'Cliente'}
          </h1>
          <p className="text-muted-foreground mt-1">Este es tu centro de control logístico.</p>
        </div>
        <Link href="/customer/new">
          <Button size="lg" className="rounded-full shadow-lg hover:shadow-primary/25 transition-all">
            <Plus className="w-5 h-5 mr-2" />
            Cotizar Nuevo Envío
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-xl border-white/10 shadow-sm overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Envíos Activos</p>
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">{isLoading ? '-' : metrics.active}</h2>
                <span className="text-xs text-muted-foreground">en tránsito</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-xl border-white/10 shadow-sm overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Envíos</p>
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">{isLoading ? '-' : metrics.total}</h2>
                <span className="text-xs text-muted-foreground">histórico</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-xl border-white/10 shadow-sm overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Gasto Acumulado</p>
                <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">
                  {isLoading ? '-' : `$${(metrics.spent / 1000).toFixed(0)}k`}
                </h2>
                <span className="text-xs text-muted-foreground">CLP</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-xl border-white/10 shadow-sm overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Efectividad</p>
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">
                  {metrics.total > 0 ? Math.round((metrics.delivered / metrics.total) * 100) : 100}%
                </h2>
                <span className="text-xs text-muted-foreground">entregados</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* CENTRAL AREA: CHARTS & MAP */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto xl:h-[450px]">
        {/* CHART */}
        <Card className="xl:col-span-1 bg-card border flex flex-col overflow-hidden shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Proyección de Gastos</CardTitle>
            <CardDescription>
              {metrics.isDummy ? "Ejemplo de análisis de gasto (Sin historial suficiente)" : "Evolución de gasto en fletes (últimos 7 días)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 mt-4 p-0 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="display" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis hide domain={['dataMin - 10000', 'dataMax + 50000']} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                    formatter={(value: number) => [`$${value.toLocaleString('es-CL')} CLP`, 'Gasto']}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCost)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROUTE PREVIEW - lightweight, no WebGL */}
        <Card className="xl:col-span-2 bg-card border overflow-hidden shadow-sm relative min-h-[400px] flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Envío Seleccionado
              </CardTitle>
              {selectedShipment && (
                <CardDescription className="mt-1">
                  ID #{selectedShipment.id} &bull; <span className={cn("font-semibold", statusStyles[selectedShipment.status]?.split(' ')[1])}>{statusLabels[selectedShipment.status] || selectedShipment.status}</span>
                </CardDescription>
              )}
            </div>
            {selectedShipment && (
              <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                <span className="text-xs font-bold uppercase">PIN</span>
                <span className="font-mono font-bold text-lg">
                  {['PENDING', 'Pending', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(selectedShipment.status) 
                    ? selectedShipment.pickup_code || '----'
                    : ['IN_TRANSIT', 'ARRIVED_AT_DROPOFF'].includes(selectedShipment.status)
                    ? selectedShipment.delivery_code || '----'
                    : '----'}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {selectedShipment ? (
              <>
                {/* Route visual */}
                <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 ring-4 ring-green-500/20" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Origen</p>
                      <p className="text-sm font-semibold">{selectedShipment.originAddress || '—'}</p>
                    </div>
                  </div>
                  <div className="ml-[5px] h-8 border-l-2 border-dashed border-muted-foreground/30" />
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 ring-4 ring-red-500/20" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Destino</p>
                      <p className="text-sm font-semibold">{selectedShipment.destinationAddress || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Estado', value: statusLabels[selectedShipment.status] || selectedShipment.status, style: statusStyles[selectedShipment.status] },
                    { label: 'Precio', value: `$${(parseFloat(selectedShipment.client_price) || parseFloat(selectedShipment.estimatedPrice) || 0).toLocaleString('es-CL')}`, style: '' },
                    { label: 'Equipo', value: selectedShipment.details?.equipment || 'Estándar', style: '' },
                  ].map((item, i) => (
                    <div key={i} className="p-3 bg-muted/20 rounded-xl border">
                      <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">{item.label}</p>
                      <p className={cn("text-xs font-bold", item.style?.split(' ')[1])}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* CTA to tracking page */}
                <div className="mt-auto pt-2 flex gap-2">
                  <Link href={`/customer/shipments/${selectedShipment.id}`} className="flex-1">
                    <Button className="w-full gap-2 h-11">
                      <Navigation className="w-4 h-4" />
                      Ver en Mapa
                    </Button>
                  </Link>
                  {(selectedShipment.status === "Pending" || selectedShipment.status === "PENDING") && (
                    <PriorityBoostModal 
                      shipmentId={selectedShipment.id}
                      basePrice={Number(selectedShipment.estimatedPrice || selectedShipment.client_price || 0)}
                      currentBoost={Number(selectedShipment.priorityBoost || 0)}
                      onBoostApplied={() => {
                        window.location.reload();
                      }}
                    />
                  )}
                </div>

                {/* Chat Integration */}
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3">Mensajes (Conductor / Soporte)</h3>
                  <ChatWidget shipmentId={selectedShipment.id} currentUserType="customer" />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
                <div className="p-4 bg-muted rounded-full">
                  <Navigation className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Sin envíos activos</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Crea tu primer envío para empezar a rastrear.</p>
                </div>
                <Link href="/customer/new">
                  <Button variant="outline" size="sm">Crear Envío</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM AREA: RECENT SHIPMENTS */}
      <div>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Actividad Reciente</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Ver Todo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && (
                [1,2,3].map(i => (
                    <Card key={i} className="animate-pulse bg-muted/50 border-none h-32" />
                ))
            )}
            {!isLoading && (!shipments || shipments.length === 0) && (
                <div className="col-span-full p-8 text-center border rounded-xl bg-card border-dashed">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold mb-1">Sin Actividad</h3>
                    <p className="text-sm text-muted-foreground">Aún no has creado ningún envío. Empieza cotizando tu primera carga.</p>
                </div>
            )}
            {shipments?.slice(0, 6).map((shipment: any) => (
                <Card 
                    key={shipment.id} 
                    className={cn(
                        "bg-card hover:bg-muted/30 transition-colors cursor-pointer border group overflow-hidden relative",
                        selectedShipment?.id === shipment.id ? "ring-2 ring-primary border-primary" : ""
                    )}
                    onClick={() => setSelectedShipment(shipment)}
                >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Navigation className="w-4 h-4 text-primary" />
                    </div>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-xs font-mono font-bold text-muted-foreground">#{shipment.id}</span>
                                <p className="font-bold mt-0.5">${(parseFloat(shipment.client_price) || parseFloat(shipment.estimatedPrice) || 0).toLocaleString('es-CL')} <span className="text-[10px] font-normal text-muted-foreground">CLP</span></p>
                            </div>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border", statusStyles[shipment.status] || "bg-muted")}>
                                {statusLabels[shipment.status] || shipment.status}
                            </span>
                        </div>
                        
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <p className="text-xs truncate text-muted-foreground">{shipment.originAddress}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <p className="text-xs truncate text-muted-foreground">{shipment.destinationAddress}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{shipment.createdAt ? format(parseISO(shipment.createdAt), "dd MMM, HH:mm", {locale: es}) : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                <span className="truncate max-w-[80px]">{shipment.details?.equipment || 'Estándar'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
