"use client";

import { useMemo, useState } from "react";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ListFilter,
  Users,
  DollarSign,
  Activity,
  Search,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Map as MapIcon,
  Plus,
} from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import Link from "next/link";

import dynamic from 'next/dynamic';
const ChileDottedMap = dynamic(() => import('@/components/chile-dotted-map'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa de Chile...</span></div>
});
import { CountUp } from "@/components/count-up";

const statusStyles: { [key: string]: string } = {
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse",
  "In transit": "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  Delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse",
  Pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse",
  assigned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Booked: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  Cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  delayed: "bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.4)] animate-vibrate",
  Delayed: "bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.4)] animate-vibrate",
};

const PIE_COLORS = ["#fa788e", "#4a1d80", "#22c55e", "#f59e0b", "#ef4444"];

const Trend = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </div>
  );
};

export default function AdminDashboard() {
  const { data: allShipments, isLoading: isLoadingShipments } = useSupabaseCollection("shipments", undefined, { realtime: false });
  const { data: driverProfiles, isLoading: isLoadingDrivers } = useSupabaseCollection("driverProfiles", undefined, { realtime: false });
  const { data: userProfiles } = useSupabaseCollection("userProfiles", undefined, { realtime: false });

  const isLoading = isLoadingShipments || isLoadingDrivers;

  // --- Procesamiento de Datos ---
  const stats = useMemo(() => {
    const shipments = allShipments || [];
    const drivers = driverProfiles || [];
    const users = userProfiles || [];

    const totalRevenue = shipments.reduce((acc, s) => acc + (s.estimated_price || 0), 0);
    const pending = shipments.filter(s => ['Pending', 'pending'].includes(s.status)).length;
    const active = shipments.filter(s => ['In transit', 'Booked', 'In Transit'].includes(s.status)).length;
    const completed = shipments.filter(s => ['Completed', 'Delivered', 'completed'].includes(s.status)).length;
    
    const driversOnline = drivers.filter(d => d.isAvailable).length;
    const totalDrivers = users.filter(u => u.role === 'driver').length;

    // Data para el gráfico de volumen (últimos 7 días)
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    const chartData = last7Days.map(date => {
      const dayShipments = shipments.filter(s => isSameDay(new Date(s.createdAt), date));
      return {
        name: format(date, "EEE", { locale: es }),
        total: dayShipments.length,
        revenue: dayShipments.reduce((acc, s) => acc + (s.estimated_price || 0), 0),
      };
    });

    // Data para el gráfico circular
    const statusCounts = shipments.reduce((acc: any, s) => {
      const status = s.status === 'In transit' ? 'En Ruta' : 
                     s.status === 'Pending' ? 'Pendiente' : 
                     s.status === 'Delivered' ? 'Entregado' : 
                     s.status === 'Cancelled' ? 'Cancelado' : 'Otros';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Calcular comunas más pedidas
    const comunaCounts = shipments.reduce((acc: any, s) => {
      const deliveryAddress = s.delivery_address || "";
      const parts = deliveryAddress.split(',');
      const comuna = parts.length > 1 ? parts[1].trim() : "Santiago";
      acc[comuna] = (acc[comuna] || 0) + 1;
      return acc;
    }, {});

    const topComunas = Object.entries(comunaCounts)
      .map(([name, count]: [string, any]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Actividad reciente
    const recentActivity = shipments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        title: `Nuevo envío #${s.id.substring(0, 6).toUpperCase()}`,
        description: `${(s.pickup_address || "").split(',')[0]} → ${(s.delivery_address || "").split(',')[0]}`,
        time: format(new Date(s.createdAt), "HH:mm"),
        status: s.status,
      }));

    return {
      totalRevenue,
      pending,
      active,
      completed,
      driversOnline,
      totalDrivers,
      chartData,
      pieData,
      recentActivity,
      topComunas,
      shipmentsCount: shipments.length
    };
  }, [allShipments, driverProfiles, userProfiles]);

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: { opacity: 1 }
  };

  const itemVariants = {
    hidden: { y: 0, opacity: 1 },
    visible: { y: 0, opacity: 1, transition: { duration: 0 } }
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Torre de Control</h1>
          <p className="text-muted-foreground">Vista global de la red logística en tiempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Sistema Activo
          </Badge>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Envío
          </Button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* KPI Cards */}
        {[
          { title: "Ingresos Estimados", value: <CountUp end={stats.totalRevenue} prefix="$" />, icon: DollarSign, trend: 12.5, color: "text-green-500" },
          { title: "Envíos en Ruta", value: <CountUp end={stats.active} />, icon: Truck, trend: 8.2, color: "text-blue-500" },
          { title: "Flota Online", value: <><CountUp end={stats.driversOnline} />/<CountUp end={stats.totalDrivers} /></>, icon: Users, trend: -2.4, color: "text-purple-500" },
          { title: "Pendientes", value: <CountUp end={stats.pending} />, icon: Clock, trend: 5.1, color: "text-orange-500" },
        ].map((kpi, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="overflow-hidden border-none shadow-md bg-card/95 group hover:bg-card transition-colors duration-300 cursor-default">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-background shadow-sm border border-border/50 group-hover:bg-primary/10 transition-colors`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color} group-hover:scale-110 transition-transform duration-300`} />
                  </div>
                  <Trend value={kpi.trend} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                  {isLoading ? (
                    <div className="h-8 w-24 bg-muted/50 rounded-md animate-pulse mt-1" />
                  ) : (
                    <h3 className="text-2xl font-black mt-1">{kpi.value}</h3>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="lg:col-span-2">
          <Card className="h-full border-none shadow-md overflow-hidden bg-card/95">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Volumen de Envíos
                  </CardTitle>
                  <CardDescription>Crecimiento en los últimos 7 días</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Semanal</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fa788e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fa788e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <ChartTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#fa788e" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-full border-none shadow-md bg-card/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#4a1d80]" />
                Estado de la Red
              </CardTitle>
              <CardDescription>Distribución actual de envíos</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-4">
              <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black">{stats.shipmentsCount}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                {stats.pieData.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-bold ml-auto">{String(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Demand Distribution Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-[500px] border-none shadow-md overflow-hidden bg-card/95">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-primary" />
                    Distribución de Demanda
                  </CardTitle>
                  <CardDescription>Mapa de puntos estratégico Chile</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[400px] p-4">
               <ChileDottedMap shipments={allShipments || []} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="lg:col-span-2">
          <div className="grid gap-6 h-full">
            <Card className="border-none shadow-md bg-card/95">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListFilter className="h-5 w-5 text-primary" />
                  Top Comunas con mayor Demanda
                </CardTitle>
                <CardDescription>Destinos más frecuentes procesados por el sistema</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.topComunas.map((comuna, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border/50 group hover:border-primary/30 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm group-hover:bg-primary/20 transition-colors">
                          {i + 1}
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest">{comuna.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-primary">{comuna.count}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">pedidos</span>
                      </div>
                    </div>
                  ))}
                  {stats.topComunas.length === 0 && (
                    <div className="col-span-2 py-10 text-center text-muted-foreground text-xs italic">
                      Sin datos de ubicación disponibles
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Summary / Pulse */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-primary text-white border-none shadow-lg">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <Activity className="h-6 w-6 opacity-50" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Crecimiento Regional</p>
                    <h4 className="text-xl font-black">+14.2%</h4>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#fa788e] text-white border-none shadow-lg">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <TrendingUp className="h-6 w-6 opacity-50" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Eficiencia Logística</p>
                    <h4 className="text-xl font-black">94.8%</h4>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Activity & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="flex flex-col">
          <Card className="flex-1 border-none shadow-md bg-card/95">
            <CardHeader>
              <CardTitle>Actividad del Sistema</CardTitle>
              <CardDescription>Eventos críticos registrados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700">Sin Ofertas</p>
                  <p className="text-[10px] text-red-600/70 leading-tight">3 envíos por cotización llevan más de 4 horas sin ofertas de conductores.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <Activity className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-700">Pico de Demanda</p>
                  <p className="text-[10px] text-blue-600/70 leading-tight">El volumen de hoy es un 15% superior al promedio de la semana pasada.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-4">
          <Link href="/admin/mission-control" prefetch={false} className="group">
            <Card className="h-full border-none shadow-md bg-[#4a1d80] text-white overflow-hidden relative cursor-pointer hover:brightness-110 hover:shadow-xl transition-all duration-300">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                <MapIcon size={100} />
              </div>
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <MapIcon className="h-6 w-6" />
                <div className="mt-8">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Control</p>
                  <h4 className="font-bold text-sm">Mission Control</h4>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/users" className="group">
            <Card className="h-full border-none shadow-md bg-primary text-white overflow-hidden relative cursor-pointer hover:brightness-110 hover:shadow-xl transition-all duration-300">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                <Users size={100} />
              </div>
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <Users className="h-6 w-6" />
                <div className="mt-8">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Flota</p>
                  <h4 className="font-bold text-sm">Gestión Usuarios</h4>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

