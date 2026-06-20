"use client";

import { useSupabaseDoc, useSupabaseCollection } from "@/hooks/supabase-hooks";
import dynamic from 'next/dynamic';
const ShipmentAuditMap = dynamic(() => import('@/components/shipment-audit-map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});
import { useParams, useRouter } from "next/navigation";
import { LocationHistoryPoint, MOCK_PLANNED_ROUTE } from "@/lib/mock-audit-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Navigation, Truck, PackageCheck } from "lucide-react";
import { useCallback, useMemo } from "react";

// FÓRMULA HAVERSINE PARA CÁLCULO DE KILOMETRAJE
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function ShipmentAuditPlayerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: shipment, isLoading: isShipmentLoading } = useSupabaseDoc("shipments", id);

  // Traer la subcolección de historial GPS (en Supabase es una tabla plana con shipment_id)
  const filterHistory = useCallback((q: any) => {
    return q.eq("shipment_id", id).order("timestamp", { ascending: true });
  }, [id]);

  const { data: historyData, isLoading: isHistoryLoading } = useSupabaseCollection("location_history", filterHistory);

  // Coordenadas procesadas
  const { originCoords, destCoords } = useMemo(() => {
    if (!shipment) return { originCoords: undefined, destCoords: undefined };
    const s = shipment as any;
    
    let origin: [number, number] | undefined;
    if (s.originCoords && typeof s.originCoords.lng === 'number') {
      origin = [s.originCoords.lng, s.originCoords.lat];
    } else if (typeof s.originLongitude === 'number') {
      origin = [s.originLongitude, s.originLatitude];
    } else if (typeof s.pickup_longitude === 'number') {
      origin = [s.pickup_longitude, s.pickup_latitude];
    }

    let dest: [number, number] | undefined;
    if (s.destinationCoords && typeof s.destinationCoords.lng === 'number') {
      dest = [s.destinationCoords.lng, s.destinationCoords.lat];
    } else if (typeof s.destinationLongitude === 'number') {
      dest = [s.destinationLongitude, s.destinationLatitude];
    } else if (typeof s.delivery_longitude === 'number') {
      dest = [s.delivery_longitude, s.delivery_latitude];
    }

    return { originCoords: origin, destCoords: dest };
  }, [shipment]);

  // Historial procesado
  const parsedHistory = useMemo(() => {
    if (!shipment) return [];
    
    let history: LocationHistoryPoint[] = (historyData || []).map((doc: any) => ({
      latitude: doc.latitude,
      longitude: doc.longitude,
      timestamp: new Date(doc.timestamp).getTime(),
      speed: doc.speed || 0,
      heading: doc.heading || 0
    }));

    // FORZAR EL RECORRIDO DESDE EL ORIGEN HASTA EL DESTINO
    if (originCoords) {
      const firstPoint = history[0];
      const isSame = firstPoint && Math.abs(firstPoint.longitude - originCoords[0]) < 0.0001 && Math.abs(firstPoint.latitude - originCoords[1]) < 0.0001;
      
      if (!isSame) {
        const firstTime = history.length > 0 ? history[0].timestamp : Date.now();
        history.unshift({
          longitude: originCoords[0],
          latitude: originCoords[1],
          timestamp: firstTime - 600000,
          speed: 0,
          heading: 0
        });
      }
    }

    if (destCoords) {
      const lastPoint = history[history.length - 1];
      const isSame = lastPoint && Math.abs(lastPoint.longitude - destCoords[0]) < 0.0001 && Math.abs(lastPoint.latitude - destCoords[1]) < 0.0001;

      if (!isSame) {
        const lastTime = history.length > 0 ? history[history.length - 1].timestamp : Date.now();
        history.push({
          longitude: destCoords[0],
          latitude: destCoords[1],
          timestamp: lastTime + 600000,
          speed: 0,
          heading: 0
        });
      }
    }

    return history;
  }, [shipment, historyData, originCoords, destCoords]);

  const totalKms = useMemo(() => {
    if (parsedHistory.length < 2) return 0;
    let distance = 0;
    for (let i = 0; i < parsedHistory.length - 1; i++) {
      distance += calculateDistance(
        parsedHistory[i].latitude, parsedHistory[i].longitude,
        parsedHistory[i+1].latitude, parsedHistory[i+1].longitude
      );
    }
    return Math.round(distance * 10) / 10;
  }, [parsedHistory]);

  if (isShipmentLoading || isHistoryLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] w-full items-center justify-center bg-background">
         <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
         <p className="text-muted-foreground animate-pulse font-mono tracking-widest text-sm uppercase">Descargando telemetría del vehículo...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] w-full items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Envío no encontrado</h2>
        <p className="text-muted-foreground mb-6">El envío seleccionado no existe o fue eliminado.</p>
        <Button onClick={() => router.push('/admin/audit')} variant="outline">Volver a Envíos</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-muted/20 pb-4 pr-4 pl-4 pt-1 w-full max-w-7xl mx-auto">
      {/* Header Compacto tipo Mission Control */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/50 border p-3 rounded-lg backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.push('/admin/audit')}>
               <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none mb-1 flex items-center gap-2">
                 <Navigation className="h-4 w-4 text-primary" />
                 Auditoría GSP: <span className="font-mono text-primary">{(shipment as any).id.substring(0,8).toUpperCase()}</span>
              </h1>
              <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
                Modo Reproducción Telemetría Activo
              </p>
            </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-sm bg-card p-1 rounded-md border shadow-inner">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded border border-primary/10">
                <Navigation className="h-4 w-4 text-primary" />
                <div className="flex flex-col leading-none">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Kms Totales</span>
                    <span className="font-mono font-bold text-primary">{totalKms} km</span>
                </div>
            </div>

            <div className="w-px h-6 bg-border" />

            <div className="flex items-center gap-2 px-2">
                <Truck className="h-4 w-4 text-orange-500" />
                <div className="flex flex-col leading-none">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Flota/Conductor</span>
                    <span className="font-semibold truncate max-w-[100px]">{(shipment as any).carrierId || 'Asignado'}</span>
                </div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2 px-2">
                <PackageCheck className="h-4 w-4 text-green-500" />
                <div className="flex flex-col leading-none">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Estado Actual</span>
                    <span className="font-semibold uppercase truncate max-w-[100px]">{(shipment as any).status || 'Completado'}</span>
                </div>
            </div>
        </div>
      </div>

      {parsedHistory.length < 2 ? (
          <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-2xl border border-dashed border-border/50 bg-card/30 flex flex-col items-center justify-center p-12 text-center relative group">
             {/* Decorative scanning line animation */}
             <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none animate-pulse" />
             <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/20 animate-[scan_3s_linear_infinite]" />
             
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="w-24 h-24 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center mb-8 relative shadow-inner">
                   <Navigation className="h-10 w-10 text-primary animate-bounce" />
                </div>
             </div>
             
             <div className="max-w-md relative">
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">Telemetría no detectada</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                    El sistema de monitoreo satelital no ha reportado coordenadas para esta operación. 
                    <span className="block mt-2 font-mono text-[10px] opacity-50">ERROR_CODE: SIG_LOST_OR_UNINITIALIZED</span>
                </p>
                <div className="flex gap-4 justify-center">
                    <Button variant="outline" size="sm" onClick={() => router.push('/admin/audit')} className="rounded-full px-6">
                        Ver otros envíos
                    </Button>
                </div>
             </div>
          </div>
      ) : (
          <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-2xl border border-primary/20 bg-background flex flex-col min-h-[500px] relative">
            <ShipmentAuditMap 
              history={parsedHistory} 
              originCoords={originCoords}
              destinationCoords={destCoords}
            />
          </div>
      )}
    </div>
  );
}
