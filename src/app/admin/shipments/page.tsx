"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Truck, MapPin } from "lucide-react";
import { format } from "date-fns";
import Map from "@/components/map";
import { useMemo } from "react";

const statusStyles: { [key: string]: string } = {
  "In transit": "bg-secondary text-secondary-foreground",
  "Delivered": "bg-foreground text-background",
  "Pending": "bg-muted text-muted-foreground",
  "Booked": "bg-accent text-accent-foreground",
  "Cancelled": "bg-destructive/80 text-destructive-foreground",
};


export default function AdminShipmentsPage() {
  const firestore = useFirestore();

  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "shipments"), orderBy("createdAt", "desc"));
  }, [firestore]);
  const { data: allShipments, isLoading: isLoadingShipments } = useCollection(shipmentsQuery);
  
  const driverProfilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "driverProfiles");
  }, [firestore]);
  const { data: driverProfiles, isLoading: isLoadingDrivers } = useCollection(driverProfilesQuery);

  const activeDrivers = useMemo(() => {
    if (!driverProfiles) return [];
    return driverProfiles.filter(d => d.isAvailable && d.currentLatitude && d.currentLongitude);
  }, [driverProfiles]);


  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <CardTitle>Mapa de Conductores Activos</CardTitle>
            <CardDescription>Ubicación en tiempo real de los conductores que están en servicio.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 rounded-b-lg overflow-hidden">
            <div className="h-[350px] w-full">
                <Map drivers={activeDrivers} route={null} origin={null} destination={null} />
            </div>
        </CardContent>
      </Card>

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
                </tr>
              </thead>
              <tbody>
                {isLoadingShipments && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                      Cargando envíos...
                    </td>
                  </tr>
                )}
                {!isLoadingShipments && (!allShipments || allShipments.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                      No hay envíos en el sistema.
                    </td>
                  </tr>
                ) : (
                  allShipments?.map((shipment: any) => (
                    <tr key={shipment.id} className="border-b hover:bg-muted/50">
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {shipment.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {shipment.clientId.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <MapPin className="h-3 w-3 inline-block mr-1 text-green-500" />{" "}
                          {shipment.pickup_address}
                        </div>
                        <div>
                          <MapPin className="h-3 w-3 inline-block mr-1 text-red-500" />{" "}
                          {shipment.delivery_address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {format(new Date(shipment.pickup_date), "dd MMM, yyyy")}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {shipment.bookingMethod === 'quote' ? 'Cotización' : 'Instantáneo'}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {shipment.bookingMethod === 'quote' ? 'Por cotizar' : `$${shipment.estimated_price.toLocaleString('es-CL')}`}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            statusStyles[shipment.status] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {shipment.bookingMethod === 'quote' && shipment.status === 'Pending' ? 'Esperando Ofertas' : shipment.status}
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
  );
}
