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

const statusStyles: { [key: string]: string } = {
  "in_progress": "bg-secondary text-secondary-foreground",
  "completed": "bg-foreground text-background",
  "pending": "bg-muted text-muted-foreground",
  "assigned": "bg-accent text-accent-foreground",
  "cancelled": "bg-destructive/80 text-destructive-foreground",
};

export default function AdminPedidosPage() {
  const firestore = useFirestore();

  const pedidosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "pedidos"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: allPedidos, isLoading } = useCollection(pedidosQuery);

  return (
    <Card className="bg-card border text-card-foreground">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <CardTitle>Gestión de Pedidos</CardTitle>
            <CardDescription className="mt-1">
              Vea y gestione todos los pedidos de la plataforma.
            </CardDescription>
          </div>
          <Link href="/admin/pedidos/nuevo">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Crear Nuevo Pedido
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase border-b">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Pedido ID
                </th>
                 <th scope="col" className="px-6 py-3">
                  Cliente ID
                </th>
                <th scope="col" className="px-6 py-3">
                  Ruta
                </th>
                <th scope="col" className="px-6 py-3">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3">
                  Vehículo
                </th>
                <th scope="col" className="px-6 py-3">
                  Conductor ID
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    Cargando pedidos...
                  </td>
                </tr>
              )}
              {!isLoading && (!allPedidos || allPedidos.length === 0) ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No hay pedidos en el sistema.
                  </td>
                </tr>
              ) : (
                allPedidos?.map((pedido: any) => (
                  <tr
                    key={pedido.id}
                    className="border-b hover:bg-muted/50"
                  >
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {pedido.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {pedido.clientId.substring(0, 12)}...
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <MapPin className="h-3 w-3 inline-block mr-1 text-muted-foreground" />{" "}
                        {pedido.originAddress}
                      </div>
                      <div>
                        <MapPin className="h-3 w-3 inline-block mr-1 text-muted-foreground" />{" "}
                        {pedido.destinationAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          statusStyles[pedido.status] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pedido.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {pedido.vehicleType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {pedido.driverId ? `${pedido.driverId.substring(0, 12)}...` : 'N/A'}
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

    