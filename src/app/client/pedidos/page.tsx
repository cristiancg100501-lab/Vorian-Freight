"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useUser,
  useCollection,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Map from "@/components/map";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Copy, XCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: { [key: string]: { text: string; className: string } } = {
    pending: { text: "Pendiente", className: "bg-muted text-muted-foreground" },
    assigned: { text: "Asignado", className: "bg-accent text-accent-foreground" },
    in_progress: {
      text: "En Tránsito",
      className: "bg-secondary text-secondary-foreground",
    },
    completed: {
      text: "Completado",
      className: "bg-foreground text-background",
    },
    cancelled: {
      text: "Cancelado",
      className: "bg-destructive/80 text-destructive-foreground",
    },
  };

  const style = statusStyles[status] || {
    text: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn("px-2 py-1 text-xs font-medium rounded-full", style.className)}
    >
      {style.text}
    </span>
  );
};

export default function ClientPedidosPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);

  const clientPedidosQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "pedidos"),
      where("clientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user]);
  const { data: clientPedidos, isLoading } = useCollection(clientPedidosQuery);

  useEffect(() => {
    if (!selectedPedido && clientPedidos && clientPedidos.length > 0) {
      setSelectedPedido(clientPedidos[0]);
    }
  }, [clientPedidos, selectedPedido]);

  const handleDuplicatePedido = (pedido: any) => {
    if (!pedido) return;
    const p = pedido;

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

  const handleCancelPedido = (pedido: any) => {
    if (!firestore || !pedido || pedido.status !== "pending") return;

    const pedidoRef = doc(firestore, "pedidos", pedido.id);

    updateDoc(pedidoRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    }).catch(() => {
      const permissionError = new FirestorePermissionError({
        path: pedidoRef.path,
        operation: "update",
        requestResourceData: {
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
        },
      });
      errorEmitter.emit("permission-error", permissionError);
    });
  };

  const pedidoOrigin = useMemo(() => {
    const p = selectedPedido;
    return p && p.originLongitude != null && p.originLatitude != null
      ? ([p.originLongitude, p.originLatitude] as [number, number])
      : null;
  }, [selectedPedido]);

  const pedidoDestination = useMemo(() => {
    const p = selectedPedido;
    return p && p.destinationLongitude != null && p.destinationLatitude != null
      ? ([p.destinationLongitude, p.destinationLatitude] as [number, number])
      : null;
  }, [selectedPedido]);

  const driverForMap = useMemo(() => {
    const p = selectedPedido;
    return p &&
      (p.status === "assigned" || p.status === "in_progress") &&
      p.driverLatitude &&
      p.driverLongitude
      ? [
          {
            id: p.driverId,
            currentLatitude: p.driverLatitude,
            currentLongitude: p.driverLongitude,
          },
        ]
      : [];
  }, [selectedPedido]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
      {/* Left Panel: Order List */}
      <div className="md:col-span-5 lg:col-span-4 h-full flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/client">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mis Pedidos</h1>
            <p className="text-muted-foreground mt-1">
              Vea el estado de sus solicitudes de flete.
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {isLoading && <p className="text-muted-foreground">Cargando pedidos...</p>}
          {!isLoading && (!clientPedidos || clientPedidos.length === 0) && (
            <p className="text-muted-foreground py-10 text-center">
              No tiene pedidos.
            </p>
          )}
          {clientPedidos?.map((pedido) => (
            <Card
              key={pedido.id}
              className={cn(
                "bg-card border cursor-pointer hover:border-primary/50 transition-colors",
                selectedPedido?.id === pedido.id && "border-primary"
              )}
              onClick={() => setSelectedPedido(pedido)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-card-foreground pr-2">
                    ID {pedido.id.substring(0, 8)}...
                  </h3>
                  <StatusBadge status={pedido.status} />
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-foreground">{pedido.originAddress}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-foreground">{pedido.destinationAddress}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 text-sm">
                  <p className="text-muted-foreground">
                    {pedido.distanceKm.toFixed(1)} km
                  </p>
                  <p className="font-bold text-foreground">
                    ${pedido.totalPrice.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Right Panel: Map and Details */}
      <div className="md:col-span-7 lg:col-span-8 h-full grid grid-rows-2 gap-6">
        <div className="row-span-1 h-full min-h-[300px]">
          <Map
            drivers={driverForMap}
            origin={pedidoOrigin}
            destination={pedidoDestination}
          />
        </div>
        <div className="row-span-1">
          <Card className="bg-card border h-full">
            {selectedPedido ? (
              <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold">Detalles del Pedido</h2>
                  <StatusBadge status={selectedPedido.status} />
                </div>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  ID: {selectedPedido.id}
                </p>

                <div className="mt-4 flex-1 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Origen</p>
                    <p className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />{" "}
                      {selectedPedido.originAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Destino
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />{" "}
                      {selectedPedido.destinationAddress}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleDuplicatePedido(selectedPedido)}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar Pedido
                  </Button>
                  {selectedPedido.status === "pending" && (
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelPedido(selectedPedido)}
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar Pedido
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  Seleccione un pedido para ver los detalles
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
