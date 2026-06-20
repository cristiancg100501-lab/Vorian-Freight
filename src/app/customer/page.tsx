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
import dynamic from 'next/dynamic';
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

const Map = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted/50 rounded-xl animate-pulse backdrop-blur-md"><span className="text-muted-foreground font-medium text-sm flex items-center gap-2"><Navigation className="w-4 h-4 animate-spin"/> Conectando satélite...</span></div>
});

const statusStyles: { [key: string]: string } = {
  "In transit": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Delivered": "bg-green-500/10 text-green-500 border-green-500/20",
  "Completed": "bg-green-500/10 text-green-500 border-green-500/20",
  "Pending": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Booked": "bg-primary/10 text-primary border-primary/20",
  "Cancelled": "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: { [key: string]: string } = {
  "In transit": "En Ruta",
  "Delivered": "Entregado",
  "Completed": "Completado",
  "Pending": "Pendiente",
  "Booked": "Reservado",
  "Cancelled": "Cancelado",
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
      // Auto select the first active shipment if possible
      const active = shipments.find((s:any) => s.status === 'In transit' || s.status === 'Booked');
      setSelectedShipment(active || shipments[0]);
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
      if (['In transit', 'Pending', 'Booked'].includes(s.status)) active++;
      if (['Delivered', 'Completed'].includes(s.status)) delivered++;
      
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
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
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Efectividad</p>
                <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
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

        {/* MAP */}
        <Card className="xl:col-span-2 bg-card border overflow-hidden shadow-sm relative min-h-[400px]">
            {selectedShipment ? (
                <>
                    <Map 
                        route={selectedShipment.details?.route} 
                        origin={selectedShipment.originCoords || selectedShipment.details?.originCoords} 
                        destination={selectedShipment.destinationCoords || selectedShipment.details?.destinationCoords} 
                        drivers={selectedShipment.current_location ? [{
                            id: selectedShipment.id,
                            coords: [selectedShipment.current_longitude, selectedShipment.current_latitude],
                            vehicleType: selectedShipment.details?.vehicleType || 'camion_3_4'
                        }] : null}
                    />
                    <div className="absolute top-4 left-4 right-4 pointer-events-none">
                        <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-full border", statusStyles[selectedShipment.status] || "bg-muted")}>
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rastreo Activo</p>
                                    <p className="text-sm font-black flex items-center gap-2">
                                        ID: {selectedShipment.id.substring(0,8)} 
                                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", statusStyles[selectedShipment.status])}>
                                            {statusLabels[selectedShipment.status] || selectedShipment.status}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-4 text-xs">
                                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                                    <MapPin className="w-3 h-3 text-green-500" />
                                    <span className="truncate max-w-[120px]">{selectedShipment.originAddress?.split(',')[0]}</span>
                                </div>
                                <ArrowRight className="w-3 h-3 text-muted-foreground hidden md:block" />
                                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                                    <MapPin className="w-3 h-3 text-red-500" />
                                    <span className="truncate max-w-[120px]">{selectedShipment.destinationAddress?.split(',')[0]}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
             ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 border-dashed border-2 border-muted-foreground/20 m-4 rounded-xl w-[calc(100%-2rem)] h-[calc(100%-2rem)]">
                    <div className="p-4 bg-background rounded-full shadow-sm mb-4">
                        <Navigation className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium">Selecciona un envío de la lista para rastrearlo.</p>
                </div>
             )}
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
                                <span className="text-xs font-mono font-bold text-muted-foreground">#{shipment.id.substring(0,8)}</span>
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
