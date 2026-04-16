"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Waypoints, Activity, Truck, RefreshCw, AlertTriangle } from "lucide-react";
import { useState, useCallback } from "react";
import { MOCK_LOCATION_HISTORY } from "@/lib/mock-audit-data";

export default function AuditIndexPage() {
  const { supabase } = useSupabase();
  const [isInjecting, setIsInjecting] = useState(false);

  // Obtener los envíos más recientes
  const filterShipments = useCallback((q: any) => {
    return q.limit(10);
  }, []);
  const { data: shipments, isLoading } = useSupabaseCollection("shipments", filterShipments);

  const handleInjectMockData = async (shipmentId: string) => {
    setIsInjecting(true);
    try {
      // Create location_history records
      const historyData = MOCK_LOCATION_HISTORY.map((pt, index) => ({
        shipment_id: shipmentId,
        latitude: pt.latitude,
        longitude: pt.longitude,
        timestamp: pt.timestamp,
        speed: pt.speed,
        heading: pt.heading,
        orderIndex: index
      }));

      const { error: historyError } = await supabase.from("location_history").insert(historyData);
      if (historyError) throw historyError;

      // Update the main shipment
      const { error: shipmentError } = await supabase
        .from("shipments")
        .update({ hasAuditData: true })
        .eq("id", shipmentId);
      if (shipmentError) throw shipmentError;

      alert("¡Datos GPS inyectados con éxito! Ahora entra a este envío para ver su auditoría.");
    } catch (error) {
       console.error("Error al inyectar datos falsos: ", error);
       alert("Error inyectando datos falsos.");
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 md:p-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seleccionar Envío</h1>
          <p className="text-muted-foreground mt-1">
            Elige un envío para auditar su trayectoria GPS real y telemetría.
          </p>
        </div>
      </div>

      {/* Development Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3 items-start">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-amber-500">Modo Pruebas (Beta)</p>
          <p className="text-muted-foreground">
            Como la App Móvil no está inyectando coordenadas reales todavía, puedes hacer clic en <b>"Inyectar Demo"</b> en cualquiera de tus envíos abajo. Esto simulará un viaje GPS de 10 minutos y lo guardará en Firebase para que puedas probar el panel interactivo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
            <div className="col-span-full py-20 flex justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )}
        
        {!isLoading && shipments && shipments.length === 0 && (
            <div className="col-span-full py-20 text-center">
                <p className="text-muted-foreground">No se encontraron envíos (Shipments) en tu base de datos.</p>
            </div>
        )}

        {shipments?.map((shipment) => {
          const origin = shipment.origin || shipment.pickup_address || shipment.pickup_location || 'N/A';
          const dest = shipment.destination || shipment.delivery_address || shipment.delivery_location || 'N/A';
          const status = shipment.status || 'Completado';

          return (
            <Card key={shipment.id} className="hover:border-primary/50 transition-all flex flex-col justify-between overflow-hidden shadow-sm group">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    #{shipment.id.substring(0, 8).toUpperCase()}
                  </span>
                  <span className="text-[10px] uppercase bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">
                    {status}
                  </span>
                </CardTitle>
                <CardDescription className="flex justify-between items-center text-xs">
                  <span>Transportista: <b>{shipment.carrierId || shipment.driverId || 'Por Asignar'}</b></span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-4">
                <div className="text-xs space-y-2">
                    <div className="flex gap-2">
                       <Waypoints className="h-4 w-4 text-green-500 shrink-0" />
                       <span className="truncate">{origin}</span>
                    </div>
                    <div className="flex gap-2">
                       <Waypoints className="h-4 w-4 text-red-500 shrink-0" />
                       <span className="truncate">{dest}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-border">
                  <Link href={`/admin/audit/${shipment.id}`} className="w-full">
                    <Button className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                      <Activity className="h-4 w-4 mr-2" />
                      Auditar Telemetría
                    </Button>
                  </Link>
                  <Button 
                     variant="ghost" 
                     size="sm"
                     className="w-full text-[10px] text-muted-foreground hover:text-foreground" 
                     disabled={isInjecting} 
                     onClick={() => handleInjectMockData(shipment.id)}
                  >
                     + Generar Ruta Simulada de Prueba
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
