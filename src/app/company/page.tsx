"use client";

import { useMemo, useCallback } from "react";
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
import Link from "next/link";
import {
    Users,
    Power,
    Truck,
    DollarSign,
    MapPin,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Activity
} from "lucide-react";
import { RevenueChart } from "@/components/revenue-chart";

const statusStyles: { [key: string]: string } = {
  "PENDING": "bg-secondary text-secondary-foreground border-secondary",
  "ACCEPTED": "bg-accent/20 text-accent-foreground border-accent",
  "EN_ROUTE_TO_PICKUP": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "ARRIVED_AT_PICKUP": "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
  "IN_TRANSIT": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  "ARRIVED_AT_DROPOFF": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "COMPLETED": "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  "CANCELLED": "bg-destructive/20 text-destructive border-destructive",
};

const driverStatusStyles: { [key: string]: string } = {
    available_free: "bg-green-500/20 text-green-500", // Disponible
    available_busy: "bg-yellow-500/20 text-yellow-500", // Ocupado
    unavailable: "bg-red-500/20 text-red-500", // Desconectado
};

const KPI_CARDS = [
    { title: "Ingresos (Mes)", icon: DollarSign, key: "monthlyRevenue", isCurrency: true },
    { title: "Viajes Completados", icon: Activity, key: "completedTripsThisMonth" },
    { title: "Conductores Activos", icon: Power, key: "activeDrivers" },
    { title: "Envíos en Curso", icon: Truck, key: "activeJobs" },
];

export default function CompanyDashboardPage() {
    const { user } = useUser();

    // 1. Get all drivers belonging to this company
    const filterCompanyDrivers = useCallback((q: any) => {
        if (!user) return q.limit(0);
        return q.eq("companyId", user.id);
    }, [user]);
    const { data: companyDrivers, isLoading: isLoadingDrivers } = useSupabaseCollection("driverProfiles", filterCompanyDrivers);
    
    const driverIds = useMemo(() => companyDrivers?.map(d => d.id) || [], [companyDrivers]);

    // 2. Get user profiles for only this company's drivers
    const filterCompanyUsers = useCallback((q: any) => {
        if (driverIds.length === 0) return q.limit(0); // Trick to return empty if no IDs
        return q.in('id', driverIds.slice(0, 30));
    }, [driverIds]);
    const { data: companyUsers, isLoading: isLoadingUsers } = useSupabaseCollection("userProfiles", filterCompanyUsers);


    // 3. Get all active shipments for those drivers
    const filterActiveJobs = useCallback((q: any) => {
        if (driverIds.length === 0) return q.in("id", []);
        return q.in("driverId", driverIds.slice(0, 30)).in("status", ["ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"]);
    }, [driverIds]);
    const { data: activeShipments, isLoading: isLoadingShipments } = useSupabaseCollection<any>("shipments", filterActiveJobs);

    // 4. Get completed shipments for revenue (Last 6 Months)
    const filterCompletedShipments = useCallback((q: any) => {
        if (!user) return q.limit(0);
        const startOf6MonthsAgo = new Date();
        startOf6MonthsAgo.setMonth(startOf6MonthsAgo.getMonth() - 5);
        startOf6MonthsAgo.setDate(1);
        startOf6MonthsAgo.setHours(0,0,0,0);
        return q.eq("carrierId", user.id)
                .in("status", ["Delivered", "completed"])
                .gte("createdAt", startOf6MonthsAgo.toISOString());
    }, [user]);
    const { data: completedShipments } = useSupabaseCollection<any>("shipments", filterCompletedShipments);

    const isLoading = isLoadingDrivers || isLoadingUsers || isLoadingShipments;

    // 5. Process and merge data
    const { kpiData, driverData, jobData, chartData } = useMemo(() => {
        if (isLoading || !companyDrivers || !companyUsers) {
            return { kpiData: {}, driverData: [], jobData: [], chartData: [] };
        }

        const userMap = new Map(companyUsers.map(u => [u.id, u]));
        const activeJobDriverIds = new Set((activeShipments || []).map(s => s.driverId));

        // Process drivers for table
        const drivers = companyDrivers.map(driver => {
            const userProfile = userMap.get(driver.id);
            let status = 'unavailable';
            if (driver.isAvailable) {
                status = activeJobDriverIds.has(driver.id) ? 'available_busy' : 'available_free';
            }
            return {
                id: driver.id,
                name: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Cargando...",
                vehicle: driver.vehicleType,
                licensePlate: driver.licensePlate,
                status,
            }
        });

        // Process jobs for table
        const jobs = (activeShipments || []).map(s => ({
            id: s.id,
            type: 'Freight',
            route: `${(s.pickup_address || '').split(',')[0]} -> ${(s.delivery_address || '').split(',')[0]}`,
            driverName: userMap.get(s.driverId)?.firstName || 'N/A',
            status: s.status,
        })).sort((a,b) => a.driverName.localeCompare(b.driverName));

        // Aggregate completed shipments into monthly buckets
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const currentDate = new Date();
        const currentMonthIdx = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Initialize last 6 months buckets
        const chartDataMap = new Map();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonthIdx - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
            chartDataMap.set(key, { month: label, revenue: 0, trips: 0 });
        }

        let totalRevenueThisMonth = 0;
        let totalRevenueLastMonth = 0;
        let totalTripsThisMonth = 0;
        let totalTripsLastMonth = 0;

        (completedShipments || []).forEach((s: any) => {
            const date = new Date(s.createdAt);
            const m = date.getMonth();
            const y = date.getFullYear();
            const key = `${y}-${m}`;
            const revenue = s.carrier_cost || s.client_price || s.estimatedPrice || 0;

            if (chartDataMap.has(key)) {
                const bucket = chartDataMap.get(key);
                bucket.revenue += revenue;
                bucket.trips += 1;
            }

            // Trend calculations
            if (m === currentMonthIdx && y === currentYear) {
                totalRevenueThisMonth += revenue;
                totalTripsThisMonth += 1;
            } else if (
                (currentMonthIdx === 0 && m === 11 && y === currentYear - 1) || 
                (m === currentMonthIdx - 1 && y === currentYear)
            ) {
                totalRevenueLastMonth += revenue;
                totalTripsLastMonth += 1;
            }
        });

        const chartData = Array.from(chartDataMap.values());

        // Calculate trends %
        const calcTrend = (current: number, last: number) => {
            if (last === 0 && current === 0) return 0;
            if (last === 0) return 100;
            return Math.round(((current - last) / last) * 100);
        };

        const revenueTrend = calcTrend(totalRevenueThisMonth, totalRevenueLastMonth);
        const tripsTrend = calcTrend(totalTripsThisMonth, totalTripsLastMonth);

        // Process KPIs
        const kpis = {
            totalDrivers: companyDrivers.length,
            activeDrivers: companyDrivers.filter((d: any) => d.isAvailable).length,
            activeJobs: jobs.length,
            monthlyRevenue: `$${totalRevenueThisMonth.toLocaleString('es-CL')}`,
            monthlyRevenueTrend: revenueTrend,
            completedTripsThisMonth: totalTripsThisMonth,
            completedTripsTrend: tripsTrend
        };
        
        return { kpiData: kpis, driverData: drivers, jobData: jobs, chartData };
    }, [isLoading, companyDrivers, companyUsers, activeShipments, completedShipments]);

    const driverStatusLabels: { [key: string]: string } = {
        available_free: "Disponible",
        available_busy: "En Ruta",
        unavailable: "Desconectado",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-semibold">Dashboard de Empresa</h1>
                <Link href="/company/shipments">
                    <Button variant="default" className="shadow-lg">
                        Buscar Cargas <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {KPI_CARDS.map((kpi) => {
                    const value = isLoading ? '...' : (kpiData as any)[kpi.key] ?? '0';
                    const trendKey = `${kpi.key}Trend`;
                    const trendValue = (kpiData as any)[trendKey];
                    const hasTrend = trendValue !== undefined;
                    const isPositive = trendValue >= 0;
                    
                    return (
                        <Card key={kpi.key}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{value}</div>
                                {hasTrend && !isLoading && (
                                    <p className={`text-xs mt-1 flex items-center font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                        {isPositive ? '+' : ''}{trendValue}% vs mes anterior
                                    </p>
                                )}
                                {!hasTrend && !isLoading && (
                                    <p className="text-xs text-muted-foreground mt-1">Activos en plataforma</p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Evolución de Ingresos</CardTitle>
                        <CardDescription>Resumen de los últimos 6 meses (Viajes Completados).</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {isLoading ? (
                            <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">
                                Cargando gráfico...
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">
                                No hay datos de ingresos aún.
                            </div>
                        ) : (
                            <RevenueChart data={chartData} />
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Estado de Conductores</CardTitle>
                        <CardDescription>Lista de los conductores de su flota y su estado actual.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase border-b">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Conductor</th>
                                        <th scope="col" className="px-4 py-3">Vehículo</th>
                                        <th scope="col" className="px-4 py-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Cargando conductores...</td></tr>
                                    ) : driverData.length === 0 ? (
                                        <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No hay conductores en su flota.</td></tr>
                                    ) : (
                                        driverData.map((driver) => (
                                            <tr key={driver.id} className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 font-medium">{driver.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{driver.vehicle} ({driver.licensePlate})</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit ${driverStatusStyles[driver.status]}`}>
                                                    <span className={`w-2 h-2 rounded-full mr-2 ${driver.status === 'unavailable' ? 'bg-red-500' : driver.status === 'available_busy' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                                    {driverStatusLabels[driver.status]}
                                                </span>
                                            </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Envíos Activos de la Flota</CardTitle>
                        <CardDescription>Trabajos que sus conductores están realizando ahora mismo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase border-b">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Ruta</th>
                                        <th scope="col" className="px-4 py-3">Conductor</th>
                                        <th scope="col" className="px-4 py-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {isLoading ? (
                                        <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Cargando envíos...</td></tr>
                                    ) : jobData.length === 0 ? (
                                        <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Ningún conductor está en una ruta.</td></tr>
                                    ) : (
                                        jobData.map((job) => (
                                            <tr key={job.id} className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground"/> {job.route}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{job.driverName}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[job.status] || 'bg-muted'}`}>
                                                    {job.status} ({job.type})
                                                </span>
                                            </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
