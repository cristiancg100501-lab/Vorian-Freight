"use client";

import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, XCircle, Copy, ArrowLeft, Loader2, Calendar, DollarSign, Clock, Truck } from "lucide-react";
import Map from "@/components/map";
import Link from "next/link";
import { useMemo } from "react";

const PedidoStatusBadge = ({ status }: { status: string }) => {
  let text = status.charAt(0).toUpperCase() + status.slice(1);
  let className = "bg-muted text-muted-foreground";

  switch (status) {
    case "pending":
      text = "Buscando conductor";
      className = "bg-muted text-muted-foreground animate-pulse";
      break;
    case "assigned":
      text = "Conductor asignado";
      className = "bg-accent text-accent-foreground";
      break;
    case "in_progress":
      text = "En camino";
      className = "bg-secondary text-secondary-foreground";
      break;
    case "completed":
      text = "Completado";
      className = "bg-foreground text-background";
      break;
    case "cancelled":
      text = "Cancelado";
      className = "bg-destructive/80 text-destructive-foreground";
      break;
  }

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${className}`}>
      {text}
    </span>
  );
};


export default function PedidoDetailPage({ params }: { params: { pedidoId: string } }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const pedidoRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "pedidos", params.pedidoId);
  }, [firestore, params.pedidoId]);

  const { data: pedido, isLoading } = useDoc(pedidoRef);

  const handleCancelPedido = () => {
    if (!pedidoRef || !pedido) return;
    if ((pedido as any).status !== "pending") return;

    updateDoc(pedidoRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    }).catch(() => {
      const permissionError = new FirestorePermissionError({
        path: pedidoRef.path,
        operation: "update",
        requestResourceData: { status: "cancelled" },
      });
      errorEmitter.emit("permission-error", permissionError);
    });
  };

  const handleDuplicatePedido = () => {
    if (!pedido) return;

    const p = pedido as any;

    const origin = {
      address: p.originAddress,
      coords:
        p.originLongitude != null && p.originLatitude != null
          ? [p.originLongitude, p.originLatitude]
          : null,
    };
    const destination = {
      address: p.destinationAddress,
      coords:
        p.destinationLongitude != null && p.destinationLatitude != null
          ? [p.destinationLongitude, p.destinationLatitude]
          : null,
    };

    const queryParams = new URLSearchParams();
    if (origin.address && origin.coords) {
      queryParams.set("origin_address", origin.address);
      queryParams.set("origin_coords", origin.coords.join(","));
    }
    if (destination.address && destination.coords) {
      queryParams.set("destination_address", destination.address);
      queryParams.set("destination_coords", destination.coords.join(","));
    }
    router.push(`/client?${queryParams.toString()}`);
  };

  const pedidoDriver = useMemo(() => {
     const p = pedido as any;
     return (p && (p.status === "assigned" || p.status === "in_progress") && p.driverLatitude && p.driverLongitude)
      ? [{
          id: p.driverId,
          currentLatitude: p.driverLatitude,
          currentLongitude: p.driverLongitude,
        }]
      : [];
  }, [pedido]);

  const pedidoOrigin = useMemo(() => {
    const p = pedido as any;
    return (p && p.originLongitude != null && p.originLatitude != null)
      ? [p.originLongitude, p.originLatitude] as [number, number]
      : null;
  }, [pedido]);

  const pedidoDestination = useMemo(() => {
    const p = pedido as any;
    return (p && p.destinationLongitude != null && p.destinationLatitude != null)
      ? [p.destinationLongitude, p.destinationLatitude] as [number, number]
      : null;
  }, [pedido]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold">Pedido no encontrado</h1>
        <p className="text-muted-foreground">El pedido que busca no existe o no tiene permiso para verlo.</p>
        <Link href="/client/pedidos">
            <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Pedidos
            </Button>
        </Link>
      </div>
    );
  }

  // Verify ownership
  if ((pedido as any).clientId !== user?.uid) {
    return (
        <div className="text-center">
          <h1 className="text-xl font-bold">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tiene permiso para ver este pedido.</p>
           <Link href="/client/pedidos">
            <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Pedidos
            </Button>
        </Link>
        </div>
      );
  }
  
  const p = pedido as any;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 h-full min-h-[400px] lg:min-h-0">
         <Map
            drivers={pedidoDriver}
            origin={pedidoOrigin}
            destination={pedidoDestination}
          />
      </div>
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card className="bg-card border text-card-foreground">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Seguimiento del Pedido</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">ID: {p.id}</CardDescription>
                    </div>
                    <PedidoStatusBadge status={p.status} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Origen</p>
                        <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" /> {p.originAddress}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Destino</p>
                        <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" /> {p.destinationAddress}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/> <div><p className="text-muted-foreground">Fecha</p><p>{new Date(p.createdAt).toLocaleDateString()}</p></div></div>
                    <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground"/> <div><p className="text-muted-foreground">Precio</p><p>${p.totalPrice.toLocaleString("es-CL")}</p></div></div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/> <div><p className="text-muted-foreground">Distancia</p><p>{p.distanceKm.toFixed(1)} km</p></div></div>
                    <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground"/> <div><p className="text-muted-foreground">Vehículo</p><p>{p.vehicleType || 'N/A'}</p></div></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                     <Button
                        variant="outline"
                        onClick={handleDuplicatePedido}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar Pedido
                      </Button>
                      {p.status === "pending" && (
                        <Button
                          variant="destructive"
                          onClick={handleCancelPedido}
                          className="w-full"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar Pedido
                        </Button>
                      )}
                </div>

            </CardContent>
        </Card>
         <Link href="/client/pedidos">
            <Button variant="ghost" className="w-full text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Pedidos
            </Button>
        </Link>
      </div>
    </div>
  );
}
