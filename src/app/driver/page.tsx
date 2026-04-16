"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSupabase, useUser } from "@/components/providers/supabase-provider";
import { useSupabaseDoc, useSupabaseCollection } from "@/hooks/supabase-hooks";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, 
  Power, 
  PowerOff, 
  Search, 
  Package,
  DollarSign,
  ArrowRight,
  Activity,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";


export default function DriverPage() {
  const { user, isUserLoading } = useUser();
  const { supabase } = useSupabase();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [key: string]: maplibregl.Marker }>({});
  const driverMarker = useRef<maplibregl.Marker | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const watchId = useRef<number | null>(null);

  const { data: driverProfile } = useSupabaseDoc("driverProfiles", user?.id);

  // 1. Fetch active shipment for this driver
  const activeShipmentFilter = useCallback((q: any) => 
    q.eq("driverId", user?.id).eq("status", "In transit").limit(1), 
  [user?.id]);
  const { data: activeShipments } = useSupabaseCollection("shipments", activeShipmentFilter);
  const activeJob = activeShipments?.[0];

  // 2. Fetch recommended backhauls (Pending loads near activeJob destination)
  const recommendedFilter = useCallback((q: any) => 
    q.eq("status", "Pending").limit(5), 
  []);
  const { data: allPending } = useSupabaseCollection("shipments", isOnline ? recommendedFilter : undefined);

  const recommendedLoads = useMemo(() => {
    if (!activeJob || !allPending) return [];
    
    // Simple proximity simulation for demo (in production we use PostGIS RPC)
    // Here we just filter for loads that are NOT the current one and could be in the same region
    return allPending.filter((l: any) => l.id !== activeJob.id);
  }, [activeJob, allPending]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapStyle = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle as any,
      center: [-70.6483, -33.4489], // Santiago, Chile
      zoom: 12,
      pitch: 45,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Sync Online Status
  useEffect(() => {
    if (driverProfile) {
      setIsOnline((driverProfile as any).isAvailable || false);
    }
  }, [driverProfile]);

  // Handle Location Tracking
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation([longitude, latitude]);

          // Update Supabase
          if (user?.id) {
            await supabase
              .from("driverProfiles")
              .update({
                currentLatitude: latitude,
                currentLongitude: longitude,
                lastLocationUpdate: new Date().toISOString(),
              })
              .eq("id", user.id);
          }

          // Update Map
          if (map.current) {
            // Update Driver Marker
            if (!driverMarker.current) {
              const el = document.createElement('div');
              el.className = 'w-6 h-6 bg-primary rounded-full border-4 border-background shadow-lg flex items-center justify-center';
              el.innerHTML = '<div class="w-2 h-2 bg-background rounded-full animate-ping"></div>';
              
              driverMarker.current = new maplibregl.Marker(el)
                .setLngLat([longitude, latitude])
                .addTo(map.current);
            } else {
              driverMarker.current.setLngLat([longitude, latitude]);
            }

            // Center map on first location fix
            if (!location) {
              map.current.flyTo({ center: [longitude, latitude], zoom: 14 });
            }
          }
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    } else {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (driverMarker.current) {
        driverMarker.current.remove();
        driverMarker.current = null;
      }
    }

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isOnline, user?.id, location, supabase]);

  // No available loads markers needed for now

  const handleToggleOnline = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from("driverProfiles")
        .update({
          isAvailable: !isOnline
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Error toggling online status:", err);
    }
  };

  // Accepting loads handled elsewhere for Freight

  if (isUserLoading) return <div className="h-screen flex items-center justify-center font-mono text-xs uppercase tracking-widest animate-pulse">Iniciando Sistemas...</div>;

  return (
    <div className="relative h-screen w-full bg-background overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 grayscale-[0.5] contrast-[1.1]" />

      {/* Overlay Gradients */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/20 via-transparent to-background/40" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />

      {/* No Search Widget needed for Express removal */}

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
        <AnimatePresence>
          {location && isOnline && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="px-4 py-2 bg-background/80 backdrop-blur-md border border-primary/20 rounded-full flex items-center gap-3 shadow-xl"
            >
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-[10px] font-mono tracking-tighter uppercase">
                GPS ACTIVE: {location[1].toFixed(5)}, {location[0].toFixed(5)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommended Backhauls (Uber Freight Style) */}
        <AnimatePresence>
          {activeJob && recommendedLoads.length > 0 && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-md px-4 mb-4"
            >
              <Card className="bg-background/90 backdrop-blur-xl border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
                <div className="p-3 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Backhaul Sugerido</span>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-primary/20 text-[8px] font-bold uppercase tracking-tighter">Próximo Match</div>
                </div>
                <CardContent className="p-4">
                  {recommendedLoads.slice(0, 1).map((load: any) => (
                    <div key={load.id} className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">Desde tu punto de entrega</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <p className="text-sm font-bold truncate max-w-[200px]">{load.originAddress || load.origin}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">Pago Estimado</p>
                          <p className="text-lg font-black text-primary">${load.estimatedPrice?.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-primary/10">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Truck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none mb-1">Destino Final</p>
                          <p className="text-xs font-medium truncate">{load.destinationAddress || load.destination}</p>
                        </div>
                        <Button size="sm" className="h-8 rounded-full font-bold px-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                          RESERVAR
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleToggleOnline}
          size="lg"
          className={cn(
            "h-16 px-10 rounded-full font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500",
            isOnline 
              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
        >
          {isOnline ? (
            <>
              <PowerOff className="mr-3 w-5 h-5" />
              Finalizar Turno
            </>
          ) : (
            <>
              <Power className="mr-3 w-5 h-5" />
              Iniciar Turno
            </>
          )}
        </Button>
      </div>

      {/* Mapbox Attribution Fix */}
      <style jsx global>{`
        .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

    