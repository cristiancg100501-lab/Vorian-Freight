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
import { Truck, MapPin, Lock } from "lucide-react";
import { format } from "date-fns";
import { useCallback } from "react";

const statusLabels: { [key: string]: string } = {
  "PENDING": "Pendiente",
  "ACCEPTED": "Aceptado",
  "EN_ROUTE_TO_PICKUP": "En ruta a recogida",
  "ARRIVED_AT_PICKUP": "En punto de recogida",
  "IN_TRANSIT": "En tránsito",
  "ARRIVED_AT_DROPOFF": "Entregado",
  "DELIVERED": "Entregado",
  "CANCELLED": "Cancelado",
};

const statusStyles: { [key: string]: string } = {
  "PENDING": "bg-orange-500/10 text-orange-500",
  "ACCEPTED": "bg-blue-500/10 text-blue-600",
  "EN_ROUTE_TO_PICKUP": "bg-blue-500/10 text-blue-600",
  "ARRIVED_AT_PICKUP": "bg-indigo-500/10 text-indigo-600",
  "IN_TRANSIT": "bg-sky-500/10 text-sky-700",
  "ARRIVED_AT_DROPOFF": "bg-teal-500/10 text-teal-700",
  "DELIVERED": "bg-green-500/10 text-green-700",
  "CANCELLED": "bg-destructive/10 text-destructive",
};

export default function ClientShipmentsPage() {
  const { user } = useUser();

  const filterShipments = useCallback((q: any) => {
    if (!user) return q;
    return q.eq("clientId", user.id).order("createdAt", { ascending: false });
  }, [user]);

  const { data: shipments, isLoading } = useSupabaseCollection("shipments", filterShipments);

  return (
    <Card className="bg-card border text-card-foreground">
      <CardHeader>
        <div>
          <CardTitle>Mis Envíos</CardTitle>
          <CardDescription className="mt-1">
            Historial de todos los envíos de carga asignados a tu empresa.
          </CardDescription>
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
                <th scope="col" className="px-6 py-3">Precio Final</th>
                <th scope="col" className="px-6 py-3">Código PIN</th>
                <th scope="col" className="px-6 py-3">Estado</th>
                <th scope="col" className="px-6 py-3">Acciones</th>
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
              {!isLoading && (!shipments || shipments.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    No tiene envíos de carga.
                  </td>
                </tr>
              ) : (
                shipments?.map((shipment: any) => (
                  <tr key={shipment.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {shipment.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{shipment.originAddress || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{shipment.destinationAddress || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {shipment.pickup_date
                        ? format(new Date(shipment.pickup_date), "dd MMM, yyyy")
                        : '—'}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {shipment.bookingMethod === 'quote' ? 'Cotización' : 'Gestionado'}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {shipment.client_price
                        ? `$${Number(shipment.client_price).toLocaleString('es-CL')}`
                        : shipment.estimatedPrice
                        ? `$${Number(shipment.estimatedPrice).toLocaleString('es-CL')}`
                        : '—'}
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[shipment.status] || "bg-muted text-muted-foreground"}`}>
                        {statusLabels[shipment.status] || shipment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/client/shipments/${shipment.id}`}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        Ver detalle →
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
  );
}
