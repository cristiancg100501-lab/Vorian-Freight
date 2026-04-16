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
import { PlusCircle, Truck, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useCallback } from "react";

const statusStyles: { [key: string]: string } = {
  "In transit": "bg-muted text-muted-foreground",
  "Delivered": "bg-foreground text-background",
  "Pending": "bg-secondary text-secondary-foreground",
  "Booked": "bg-accent text-accent-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground",
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
            <CardTitle>Mis Envíos</CardTitle>
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
                <th scope="col" className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    Cargando envíos...
                  </td>
                </tr>
              )}
              {!isLoading && (!clientShipments || clientShipments.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
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
  );
}
