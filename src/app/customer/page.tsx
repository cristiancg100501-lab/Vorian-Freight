"use client";

import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Truck, MapPin, Navigation } from "lucide-react";
import { format } from "date-fns";
import { useCallback, useState, useEffect } from "react";
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});

const statusStyles: { [key: string]: string } = {
  "In transit": "bg-blue-500 text-white",
  "Delivered": "bg-green-600 text-white",
  "Completed": "bg-green-600 text-white",
  "Pending": "bg-amber-500 text-white",
  "Booked": "bg-primary text-primary-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground",
};

export default function CustomerDashboard() {
  const { user } = useUser();
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const filterShipments = useCallback((q: any) => {
    if (!user) return q;
    // Filtrar por customer_id (que agregaremos a la tabla)
    return q.eq("customer_id", user.id).order("createdAt", { ascending: false });
  }, [user]);

  const { data: shipments, isLoading } = useSupabaseCollection("shipments", filterShipments);

  useEffect(() => {
    if (shipments && shipments.length > 0 && !selectedShipment) {
      setSelectedShipment(shipments[0]);
    }
  }, [shipments, selectedShipment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="bg-card border h-[calc(100vh-200px)] flex flex-col">
            <CardHeader>
              <CardTitle>Mis Envíos</CardTitle>
              <CardDescription>
                Siga sus cargas en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {isLoading && <p className="text-center py-10">Cargando envíos...</p>}
              {!isLoading && (!shipments || shipments.length === 0) && (
                <p className="text-center py-10 text-muted-foreground">No tienes envíos activos.</p>
              )}
              {shipments?.map((shipment: any) => (
                <div
                  key={shipment.id}
                  onClick={() => setSelectedShipment(shipment)}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all hover:bg-muted/50",
                    selectedShipment?.id === shipment.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-primary">{shipment.id}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", statusStyles[shipment.status] || "bg-muted")}>
                      {shipment.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-green-500" />
                      <p className="text-xs truncate">{shipment.originAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <p className="text-xs truncate">{shipment.destinationAddress}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-6">
          <Card className="bg-card border h-[400px] lg:h-[calc(100vh-200px)] overflow-hidden relative">
             {selectedShipment ? (
                <>
                    <Map 
                        route={selectedShipment.details?.route} 
                        origin={selectedShipment.origin_coords} 
                        destination={selectedShipment.destination_coords} 
                        drivers={selectedShipment.current_location ? [{
                            id: selectedShipment.id,
                            coords: [selectedShipment.current_longitude, selectedShipment.current_latitude],
                            vehicleType: selectedShipment.details?.vehicleType || 'camion_3_4'
                        }] : null}
                    />
                    <div className="absolute bottom-4 left-4 right-4 p-4 bg-background/80 backdrop-blur-md border rounded-xl shadow-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Truck className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estado Actual</p>
                                <p className="text-sm font-black">{selectedShipment.status === 'In transit' ? 'En Movimiento' : selectedShipment.status}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Última Actualización</p>
                             <p className="text-xs font-bold">{format(new Date(selectedShipment.updatedAt || selectedShipment.createdAt), "HH:mm 'hrs'")}</p>
                        </div>
                    </div>
                </>
             ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted/20">
                    <div className="text-center space-y-2">
                        <Navigation className="w-12 h-12 text-muted-foreground mx-auto animate-pulse" />
                        <p className="text-muted-foreground">Selecciona un envío para ver su ubicación.</p>
                    </div>
                </div>
             )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
