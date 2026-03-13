"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ListFilter,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, subDays } from "date-fns";

const statusStyles: { [key: string]: string } = {
  "in_progress": "bg-secondary text-secondary-foreground",
  "In transit": "bg-secondary text-secondary-foreground",
  "completed": "bg-foreground text-background",
  "Delivered": "bg-foreground text-background",
  "pending": "bg-muted text-muted-foreground",
  "Pending": "bg-muted text-muted-foreground",
  "assigned": "bg-accent text-accent-foreground",
  "Booked": "bg-accent text-accent-foreground",
  "cancelled": "bg-destructive text-destructive-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground",
};

const Trend = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  const trendIcon = isPositive ? <ArrowUp className="h-3 w-3 text-green-500" /> : <ArrowDown className="h-3 w-3 text-red-500" />;
  const trendColor = isPositive ? 'text-green-500' : 'text-red-500';
  const trendPrefix = isPositive ? '+' : '';

  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      {trendIcon}
      <span className={trendColor}>{trendPrefix}{value.toFixed(1)}%</span>
      vs la semana pasada
    </p>
  );
};


export default function AdminDashboard() {
  const firestore = useFirestore();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const ITEMS_PER_PAGE = 10;

  // Data fetching
  const pedidosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "pedidos"), orderBy("createdAt", "desc"));
  }, [firestore]);
  const { data: allPedidos, isLoading: isLoadingPedidos } = useCollection(pedidosQuery);

  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "shipments"), orderBy("createdAt", "desc"));
  }, [firestore]);
  const { data: allShipments, isLoading: isLoadingShipments } = useCollection(shipmentsQuery);
  
  const isLoading = isLoadingPedidos || isLoadingShipments;

  // --- Data Processing ---
  const { kpiData, shipmentsData } = useMemo(() => {
    const pedidos = allPedidos || [];
    const shipments = allShipments || [];
    const combined = [
      ...pedidos.map(p => ({ ...p, type: 'pedido', date: new Date(p.createdAt), route: `${p.originAddress.split(',')[0]} -> ${p.destinationAddress.split(',')[0]}` })),
      ...shipments.map(s => ({ ...s, type: 'shipment', date: new Date(s.createdAt), route: `${s.pickup_address.split(',')[0]} -> ${s.delivery_address.split(',')[0]}` }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    // KPI data
    const total = combined.length;
    const pending = combined.filter(i => i.status === 'pending' || i.status === 'Pending').length;
    const inTransit = combined.filter(i => ['in_progress', 'assigned', 'In transit', 'Booked'].includes(i.status)).length;
    const delivered = combined.filter(i => i.status === 'completed' || i.status === 'Delivered').length;
    
    // Trend data
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);
    
    const lastWeekItems = combined.filter(s => s.date >= sevenDaysAgo);
    const previousWeekItems = combined.filter(s => s.date < sevenDaysAgo && s.date >= fourteenDaysAgo);
    
    const calculateTrend = (currentPeriodItems: any[], previousPeriodItems: any[], status: string[]) => {
      const currentCount = status.length > 0 ? currentPeriodItems.filter(i => status.includes(i.status)).length : currentPeriodItems.length;
      const previousCount = status.length > 0 ? previousPeriodItems.filter(i => status.includes(i.status)).length : previousPeriodItems.length;
      if (previousCount === 0) return currentCount > 0 ? 100 : 0;
      return ((currentCount - previousCount) / previousCount) * 100;
    };

    const kpiTrends = {
      total: calculateTrend(lastWeekItems, previousWeekItems, []),
      pending: calculateTrend(lastWeekItems, previousWeekItems, ['pending', 'Pending']),
      inTransit: calculateTrend(lastWeekItems, previousWeekItems, ['in_progress', 'assigned', 'In transit', 'Booked']),
      delivered: calculateTrend(lastWeekItems, previousWeekItems, ['completed', 'Delivered']),
    };

    // Table data
    const combinedForTable = [
      ...(allPedidos || []).map(p => ({ id: `#${p.id.substring(0, 7).toUpperCase()}`, company: "Cliente Express", category: "Express", weight: 'N/A', route: `${p.originAddress.split(',')[0]} -> ${p.destinationAddress.split(',')[0]}`, date: new Date(p.createdAt), status: p.status, })),
      ...(allShipments || []).map(s => ({ id: `#${s.id.substring(0, 7).toUpperCase()}`, company: "Cliente Freight", category: s.commodity, weight: `${s.weight_lbs} lbs`, route: `${s.pickup_address.split(',')[0]} -> ${s.delivery_address.split(',')[0]}`, date: new Date(s.createdAt), status: s.status, }))
    ];
    
    return { 
      kpiData: { total, pending, inTransit, delivered, trends: kpiTrends },
      shipmentsData: combinedForTable.sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  }, [allPedidos, allShipments]);

  const filteredShipments = useMemo(() => {
    if (!searchTerm) return shipmentsData;
    return shipmentsData.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }, [shipmentsData, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredShipments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredShipments, currentPage]);
  
  const totalPages = Math.ceil(filteredShipments.length / ITEMS_PER_PAGE);

  const KPI_CARDS = [
    { title: "Total Envíos", icon: Package, key: "total", trend: kpiData.trends.total },
    { title: "Pendientes", icon: Clock, key: "pending", trend: kpiData.trends.pending },
    { title: "En Entrega", icon: Truck, key: "inTransit", trend: kpiData.trends.inTransit },
    { title: "Completados", icon: CheckCircle, key: "delivered", trend: kpiData.trends.delivered },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => (
          <Card key={kpi.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : (kpiData as any)[kpi.key]}</div>
              {!isLoading && <Trend value={kpi.trend} />}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
               <div><CardTitle>Resumen de Actividad Reciente</CardTitle></div>
               <div className="flex items-center gap-2">
                 <Input placeholder="Buscar ID, compañía, etc." className="w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 <Button variant="outline"><ListFilter className="h-4 w-4 mr-2"/> Filtrar</Button>
               </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-3">ID de Envío</th>
                  <th scope="col" className="px-4 py-3">Compañía</th>
                  <th scope="col" className="px-4 py-3">Categoría</th>
                  <th scope="col" className="px-4 py-3">Peso</th>
                  <th scope="col" className="px-4 py-3">Ruta</th>
                  <th scope="col" className="px-4 py-3">Fecha</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Cargando envíos...</td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No hay envíos para mostrar.</td></tr>
                ) : (
                  paginatedData.map((item) => (
                    <tr key={item.id + item.date} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{item.id}</td>
                      <td className="px-4 py-3">{item.company}</td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">{item.weight}</td>
                      <td className="px-4 py-3">{item.route}</td>
                      <td className="px-4 py-3">{format(item.date, "dd MMM, yyyy")}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[item.status] || 'bg-muted text-muted-foreground'}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Mostrando {paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredShipments.length)} de {filteredShipments.length} resultados
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1 || totalPages === 0}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{totalPages > 0 ? currentPage : 0} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
