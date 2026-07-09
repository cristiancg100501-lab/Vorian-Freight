"use client";

import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Truck, MapPin, Activity } from "lucide-react";
import { format } from "date-fns";
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});
import { useMemo, useCallback } from "react";

const statusStyles: { [key: string]: string } = {
  "PENDING": "bg-secondary text-secondary-foreground",
  "ACCEPTED": "bg-accent text-accent-foreground",
  "EN_ROUTE_TO_PICKUP": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "ARRIVED_AT_PICKUP": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "IN_TRANSIT": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "ARRIVED_AT_DROPOFF": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "COMPLETED": "bg-foreground text-background",
  "CANCELLED": "bg-destructive text-destructive-foreground",
};


export default function AdminShipmentsPage() {
  const { data: allShipments, isLoading: isLoadingShipments } = useSupabaseCollection("shipments");
  const { data: driverProfiles, isLoading: isLoadingDrivers } = useSupabaseCollection("driverProfiles");

  const isLoading = isLoadingShipments || isLoadingDrivers;

  const activeDrivers = useMemo(() => {
    if (!driverProfiles) return [];
    return driverProfiles.filter((d: any) => {
      return d.isAvailable && d.currentLatitude && d.currentLongitude;
    });
  }, [driverProfiles]);

  const activeOperations = useMemo(() => {
    return (allShipments || [])
        .filter((s: any) => ["ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"].includes(s.status))
        .map((s: any) => ({
            id: s.id,
            type: 'Envío',
            driverId: s.driverId || 'No asignado',
            route: `${(s.pickup_address || s.origin || '').split(',')[0]} -> ${(s.delivery_address || s.destination || '').split(',')[0]}`,
            status: s.status,
        }));
  }, [allShipments]);


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Operaciones en Curso
                    </CardTitle>
                    <CardDescription>Envíos activos en este momento.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4">
                    {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
                    {!isLoading && activeOperations.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-muted-foreground text-center py-8">No hay operaciones activas.</p>
                        </div>
                    )}
                    {activeOperations.map(op => (
                        <div key={op.id} className="p-3 bg-muted/50 rounded-lg border">
                            <div className="flex justify-between items-start gap-2">
                                <p className="font-bold text-sm truncate">{op.type} #{op.id.substring(0,7)}</p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyles[op.status] || 'bg-muted text-muted-foreground'}`}>{op.status}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate" title={op.route}>{op.route}</p>
                            <p className="text-xs text-muted-foreground mt-2">Conductor: <span className="font-mono">{op.driverId !== 'No asignado' ? op.driverId.substring(0,10) + '...' : 'No asignado'}</span></p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
        <div className="xl:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Mapa de Conductores Activos</CardTitle>
                    <CardDescription>Ubicación en tiempo real de los conductores que están en servicio.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 rounded-b-lg overflow-hidden">
                    <div className="h-[420px] w-full">
                        <Map drivers={activeDrivers} route={null} origin={null} destination={null} />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>

      <Card className="bg-card border text-card-foreground">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <CardTitle>Gestión de Envíos (Freight)</CardTitle>
              <CardDescription className="mt-1">
                Vea y gestione todos los envíos de carga de la plataforma.
              </CardDescription>
            </div>
            <Link href="/admin/shipments/new">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Crear Nuevo Envío
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th scope="col" className="px-6 py-3">Envío ID</th>
                  <th scope="col" className="px-6 py-3">Cliente ID</th>
                  <th scope="col" className="px-6 py-3">Ruta</th>
                  <th scope="col" className="px-6 py-3">Fecha Recogida</th>
                  <th scope="col" className="px-6 py-3">Tipo de Reserva</th>
                  <th scope="col" className="px-6 py-3">Precio Est.</th>
                  <th scope="col" className="px-6 py-3">Estado</th>
                  <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingShipments && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                      Cargando envíos...
                    </td>
                  </tr>
                )}
                {!isLoadingShipments && (!allShipments || allShipments.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                      No hay envíos en el sistema.
                    </td>
                  </tr>
                ) : (
                  allShipments?.map((shipment: any) => (
                    <tr key={shipment.id} className="border-b hover:bg-muted/50">
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {shipment.id}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {shipment.clientId?.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <MapPin className="h-3 w-3 inline-block mr-1 text-green-500" />{" "}
                          {shipment.originAddress || shipment.pickup_address}
                        </div>
                        <div>
                          <MapPin className="h-3 w-3 inline-block mr-1 text-red-500" />{" "}
                          {shipment.destinationAddress || shipment.delivery_address}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {shipment.pickup_date ? format(new Date(shipment.pickup_date), "dd MMM, yyyy") : 'N/A'}
                      </td>
                      <td className="px-6 py-4 font-medium text-xs">
                        {shipment.bookingMethod === 'quote' ? 'Cotización' : 'Instantáneo'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-xs">
                        {shipment.bookingMethod === 'quote' ? 'Por cotizar' : (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium">Subtotal: ${(shipment.client_price || shipment.estimatedPrice || shipment.estimated_price || 0).toLocaleString('es-CL')}</span>
                            <span className="text-sm font-bold text-foreground">Total: ${Math.round((shipment.client_price || shipment.estimatedPrice || shipment.estimated_price || 0) * 1.19).toLocaleString('es-CL')}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${
                            statusStyles[shipment.status] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {shipment.bookingMethod === 'quote' && shipment.status === 'PENDING' ? 'Esperando Ofertas' : shipment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/shipments/${shipment.id}`}>
                          <Button variant="outline" size="sm">Ver Detalles</Button>
                        </Link>
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
  );
}
