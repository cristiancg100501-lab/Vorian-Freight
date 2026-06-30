"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

const VorianMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted animate-pulse rounded-xl">
      <Navigation className="w-6 h-6 text-muted-foreground animate-spin" />
    </div>
  ),
});

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

const statusLabels: { [key: string]: string } = {
  "PENDING": "Buscando Chofer",
  "ACCEPTED": "Chofer Asignado",
  "EN_ROUTE_TO_PICKUP": "Chofer en Camino al Origen",
  "ARRIVED_AT_PICKUP": "Chofer en Origen",
  "IN_TRANSIT": "En Tránsito a Destino",
  "ARRIVED_AT_DROPOFF": "Chofer en Destino",
  "COMPLETED": "Entregado",
  "CANCELLED": "Cancelado",
};

export default function CustomerTrackingPage() {
  const { user } = useUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filterShipments = useCallback((q: any) => {
    if (!user) return q;
    return q
        .eq("clientId", user.id)
        .in("status", ["ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF", "PENDING"])
        .order("created_at", { ascending: false });
  }, [user]);

  const { data: shipments, isLoading } = useSupabaseCollection(
    "shipments",
    filterShipments
  );

  const selected = useMemo(
    () => shipments?.find((s: any) => s.id === selectedId) ?? shipments?.[0],
    [selectedId, shipments]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-6 overflow-hidden relative">
      {/* Full screen map */}
      <div className="absolute inset-0 z-0">
        <VorianMap
          route={selected?.details?.route ?? null}
          origin={
            selected?.originCoords ?? selected?.details?.originCoords ?? null
          }
          destination={
            selected?.destinationCoords ??
            selected?.details?.destinationCoords ??
            null
          }
          drivers={
            selected?.current_latitude
              ? [
                  {
                    id: selected.id,
                    coords: [
                      selected.current_longitude,
                      selected.current_latitude,
                    ],
                    vehicleType: selected.details?.vehicleType ?? "camion_3_4",
                  },
                ]
              : null
          }
        />
      </div>

      {/* Floating panel */}
      <div className="absolute top-6 left-6 bottom-6 w-80 z-20 flex flex-col pointer-events-none">
        <div className="bg-card/85 backdrop-blur-xl border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-full pointer-events-auto">
          <div className="p-4 border-b bg-muted/20">
            <h1 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              Seguimiento Real
            </h1>
            <p className="text-[10px] text-muted-foreground mt-1">
              Envíos activos en tiempo real
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading &&
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 animate-pulse rounded-xl"
                />
              ))}

            {!isLoading && (!shipments || shipments.length === 0) && (
              <div className="p-8 text-center">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Sin envíos activos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No tienes envíos en tránsito actualmente.
                </p>
              </div>
            )}

            {shipments?.map((s: any) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "p-3 rounded-xl cursor-pointer transition-all border group",
                  selected?.id === s.id
                    ? "bg-foreground text-background border-foreground shadow-lg"
                    : "hover:bg-muted/50 border-transparent"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold opacity-60">
                    #{s.id.substring(0, 8).toUpperCase()}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4 font-bold",
                      selected?.id === s.id
                        ? "border-background/30 text-background/80"
                        : statusStyles[s.status]
                    )}
                  >
                    {statusLabels[s.status] ?? s.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <p className="text-[10px] truncate opacity-70">
                      {s.originAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <p className="text-[10px] truncate opacity-70">
                      {s.destinationAddress}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom center status pill */}
      {selected && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-4 bg-card/85 backdrop-blur-xl border px-5 py-2.5 rounded-full shadow-lg">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[11px] font-medium truncate max-w-[140px]">
              {selected.originAddress?.split(",")[0]}
            </span>
          </div>
          <span className="text-muted-foreground text-[11px]">→</span>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[11px] font-medium truncate max-w-[140px]">
              {selected.destinationAddress?.split(",")[0]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
