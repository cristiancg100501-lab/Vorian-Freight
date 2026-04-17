"use client";

import { useSupabaseDoc, useSupabaseCollection } from "@/hooks/supabase-hooks";
import ShipmentAuditMap from "@/components/shipment-audit-map";
import { useParams, useRouter } from "next/navigation";
import { LocationHistoryPoint, MOCK_PLANNED_ROUTE } from "@/lib/mock-audit-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Navigation, Truck, PackageCheck } from "lucide-react";
import { useCallback, useMemo } from "react";

// Re-forcing build to ensure useMemo is recognized by Vercel

export default function ShipmentAuditPlayerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: shipment, isLoading: isShipmentLoading } = useSupabaseDoc("shipments", id);

  // Traer la subcolección de historial GPS (en Supabase es una tabla plana con shipment_id)
  const filterHistory = useCallback((q: any) => {
    return q.eq("shipment_id", id).order("timestamp", { ascending: true });
  }, [id]);

  const { data: historyData, isLoading: isHistoryLoading } = useSupabaseCollection("location_history", filterHistory);

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

  // Parsear coordenadas reales del origen
  const s = shipment as any;
  let originCoords: [number, number] | undefined;
  if (s.originCoords && typeof s.originCoords.lng === 'number') {
    originCoords = [s.originCoords.lng, s.originCoords.lat];
  } else if (typeof s.originLongitude === 'number') {
    originCoords = [s.originLongitude, s.originLatitude];
  } else if (typeof s.pickup_longitude === 'number') {
    originCoords = [s.pickup_longitude, s.pickup_latitude];
  }

  // Parsear coordenadas reales del destino
  let destCoords: [number, number] | undefined;
  if (s.destinationCoords && typeof s.destinationCoords.lng === 'number') {
    destCoords = [s.destinationCoords.lng, s.destinationCoords.lat];
  } else if (typeof s.destinationLongitude === 'number') {
    destCoords = [s.destinationLongitude, s.destinationLatitude];
  } else if (typeof s.delivery_longitude === 'number') {
    destCoords = [s.delivery_longitude, s.delivery_latitude];
  }

  // Parsear la data de historyData
  let parsedHistory: LocationHistoryPoint[] = (historyData || []).map((doc: any) => ({
    latitude: doc.latitude,
    longitude: doc.longitude,
    timestamp: doc.timestamp,
    speed: doc.speed || 0,
    heading: doc.heading || 0
  }));

  // FORZAR EL RECORRIDO DESDE EL ORIGEN HASTA EL DESTINO
  // Si tenemos origen y es distinto al primer punto reportado, lo agregamos
  if (originCoords) {
    const firstPoint = parsedHistory[0];
    const isSame = firstPoint && Math.abs(firstPoint.longitude - originCoords[0]) < 0.0001 && Math.abs(firstPoint.latitude - originCoords[1]) < 0.0001;
    
    if (!isSame) {
      const firstTime = parsedHistory.length > 0 ? parsedHistory[0].timestamp : Date.now();
      parsedHistory.unshift({
        longitude: originCoords[0],
        latitude: originCoords[1],
        timestamp: firstTime - 600000, // 10 minutos virtuales antes
        speed: 0,
        heading: 0
      });
    }
  }

  // Si tenemos destino y es distinto al último punto reportado, lo agregamos
  if (destCoords) {
    const lastPoint = parsedHistory[parsedHistory.length - 1];
    const isSame = lastPoint && Math.abs(lastPoint.longitude - destCoords[0]) < 0.0001 && Math.abs(lastPoint.latitude - destCoords[1]) < 0.0001;

    if (!isSame) {
      const lastTime = parsedHistory.length > 0 ? parsedHistory[parsedHistory.length - 1].timestamp : Date.now();
      parsedHistory.push({
        longitude: destCoords[0],
        latitude: destCoords[1],
        timestamp: lastTime + 600000, // 10 minutos virtuales después
        speed: 0,
        heading: 0
      });
    }
  }

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
          <div className="flex-1 w-full rounded-xl overflow-hidden shadow border border-border bg-card flex flex-col items-center justify-center p-8 text-center">
             <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Navigation className="h-8 w-8 text-red-500" />
             </div>
             <h3 className="text-xl font-bold mb-2">Envío Sin Coordenadas</h3>
             <p className="max-w-md text-muted-foreground mx-auto text-sm">
                 Este envío no tiene coordenadas de origen ni destino guardadas, y tampoco cuenta con datos de telemetría del chofer.
             </p>
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
