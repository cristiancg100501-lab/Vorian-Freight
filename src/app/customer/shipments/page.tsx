"use client";

import { useUser } from "@/components/providers/supabase-provider";
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
import { PlusCircle, Truck, MapPin, Lock } from "lucide-react";
import { format } from "date-fns";
import { useCallback } from "react";

const statusStyles: { [key: string]: string } = {
  "PENDING": "bg-orange-500/10 text-orange-500",
  "ACCEPTED": "bg-blue-500/10 text-blue-600",
  "EN_ROUTE_TO_PICKUP": "bg-blue-500/10 text-blue-600",
  "ARRIVED_AT_PICKUP": "bg-indigo-500/10 text-indigo-600",
  "IN_TRANSIT": "bg-sky-500/10 text-sky-700",
  "ARRIVED_AT_DROPOFF": "bg-teal-500/10 text-teal-700",
  "CANCELLED": "bg-destructive text-destructive-foreground",
};


export default function ClientShipmentsPage() {
  const { user } = useUser();

  const filterShipments = useCallback((q: any) => {
    if (!user) return q;
    return q.eq("clientId", user.id).order("createdAt", { ascending: false });
  }, [user]);

  const { data: clientShipments, isLoading } = useSupabaseCollection("shipments", filterShipments);

  return (
    <Card className="bg-card border text-card-foreground">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <CardTitle>Mis Envíos (Freight)</CardTitle>
            <CardDescription className="mt-1">
              Vea el historial de todos sus envíos de carga.
            </CardDescription>
          </div>
          <Link href="/client/shipments/new">
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
                <th scope="col" className="px-6 py-3">Ruta</th>
                <th scope="col" className="px-6 py-3">Fecha Recogida</th>
                <th scope="col" className="px-6 py-3">Tipo de Reserva</th>
                <th scope="col" className="px-6 py-3">Precio Est.</th>
                <th scope="col" className="px-6 py-3">Código PIN</th>
                <th scope="col" className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    Cargando envíos...
                  </td>
                </tr>
              )}
              {!isLoading && (!clientShipments || clientShipments.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    No tiene envíos de carga.
                  </td>
                </tr>
              ) : (
                clientShipments?.map((shipment: any) => (
                  <tr key={shipment.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {shipment.id}
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
                      {(() => {
                        const st = shipment.status;
                        const pickupStates = ['PENDING', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'];
                        const deliveryStates = ['IN_TRANSIT', 'ARRIVED_AT_DROPOFF'];
                        const code = pickupStates.includes(st) ? shipment.pickup_code
                                   : deliveryStates.includes(st) ? shipment.delivery_code
                                   : null;
                        if (!code) return <span className="text-muted-foreground text-xs">—</span>;
                        return (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <Lock className="h-3.5 w-3.5 text-primary" />
                            <span className="font-mono text-base font-black tracking-[0.2em] text-primary">{code}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          statusStyles[shipment.status] || "bg-muted text-muted-foreground"
                        }`}
                      >
                         {shipment.status === 'PENDING' ? 'Pendiente' : shipment.status.replace(/_/g, ' ')}
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
  );
}
