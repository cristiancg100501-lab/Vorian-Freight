"use client";

import { useUser, useSupabase } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignalIndicator } from "@/components/signal-indicator";
import { 
  ArrowLeft, Package, MapPin, Truck, User, Calendar, DollarSign, 
  Navigation, Phone, MessageSquare, ChevronRight, Clock, 
  FileText, Info, Zap, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBoostModal } from "@/components/priority-boost-modal";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { ShipmentAuditTimeline } from "@/components/audit/shipment-audit-timeline";
import { GpsReplayControls } from "@/components/audit/gps-replay-map";
// ─── Inline Chat ──────────────────────────────────────────────────────────────
function InlineChat({ shipmentId }: { shipmentId: string }) {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any;
    const init = async () => {
      const { data } = await supabase.from("shipment_messages").select("*")
        .eq("shipment_id", shipmentId).order("created_at", { ascending: true });
      if (data) setMessages(data);
      channel = supabase.channel(`chat_${shipmentId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "shipment_messages", filter: `shipment_id=eq.${shipmentId}` },
          (payload) => setMessages(prev => [...prev, payload.new]))
        .subscribe();
    };
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [shipmentId, supabase]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    await supabase.from("shipment_messages").insert({
      shipment_id: shipmentId, sender_id: user.id,
      content: text.trim(), role: "customer"
    });
    setText("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-[11px] text-muted-foreground py-8">Sin mensajes aún</div>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === user?.id || m.role === "customer";
          return (
            <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] px-3 py-2 rounded-xl text-xs",
                isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
              )}>
                <p>{m.content}</p>
                <p className={cn("text-[9px] mt-1 opacity-60", isMe ? "text-right" : "text-left")}>
                  {m.created_at ? format(parseISO(m.created_at), "HH:mm") : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Escribe un mensaje..."
          className="text-xs h-8"
        />
        <Button size="sm" className="h-8 px-3" onClick={send} disabled={sending || !text.trim()}>
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "Pending":             { label: "Buscando Chofer",        color: "text-orange-500", bg: "bg-orange-500/10" },
  "PENDING":             { label: "Buscando Chofer",        color: "text-orange-500", bg: "bg-orange-500/10" },
  "ACCEPTED":            { label: "Chofer Asignado",        color: "text-blue-500", bg: "bg-blue-500/10" },
  "EN_ROUTE_TO_PICKUP":  { label: "Chofer en Camino",       color: "text-blue-500",   bg: "bg-blue-500/10"   },
  "ARRIVED_AT_PICKUP":   { label: "Chofer en Origen",       color: "text-indigo-500", bg: "bg-indigo-500/10" },
  "IN_TRANSIT":          { label: "En Tránsito",            color: "text-sky-500",    bg: "bg-sky-500/10"    },
  "ARRIVED_AT_DROPOFF":  { label: "Chofer en Destino",      color: "text-teal-500",   bg: "bg-teal-500/10"   },
  "COMPLETED":           { label: "Entregado",              color: "text-green-500",  bg: "bg-green-500/10"  },
  "CANCELLED":           { label: "Cancelado",              color: "text-red-500",    bg: "bg-red-500/10"    },
};

const getStatus = (s: string) => STATUS[s] ?? { label: s, color: "text-muted-foreground", bg: "bg-muted" };

// ─── Tracking Map (Inline Mapbox — always visible) ──────────────────────────────────
function TrackingMap({ shipment, auditPoint, auditHistory }: { shipment: any | null, auditPoint?: any | null, auditHistory?: any[] }) {
  const { resolvedTheme } = useTheme();
  const { supabase } = useSupabase();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const currentStyleRef = useRef<string>("light"); // track applied style without calling getStyle()


  const parsedRoute = useMemo(() => {
    if (!shipment) return null;
    try {
      const geom = shipment.routeGeometry || shipment.details?.route;
      if (!geom) return null;
      return typeof geom === 'string' ? JSON.parse(geom) : geom;
    } catch (e) {
      return null;
    }
  }, [shipment]);

  const origin: [number, number] | null = useMemo(() => {
    if (shipment?.pickup_longitude && shipment?.pickup_latitude) {
      return [Number(shipment.pickup_longitude), Number(shipment.pickup_latitude)];
    }
    if (parsedRoute?.coordinates?.length > 0) {
      return parsedRoute.coordinates[0] as [number, number];
    }
    const c = shipment?.originCoords ?? shipment?.details?.originCoords;
    if (!c) return null;
    const arr = Array.isArray(c) ? c : [c.lng ?? c.longitude, c.lat ?? c.latitude];
    return arr.length === 2 ? arr as [number, number] : null;
  }, [shipment, parsedRoute]);

  const destination: [number, number] | null = useMemo(() => {
    if (shipment?.delivery_longitude && shipment?.delivery_latitude) {
      return [Number(shipment.delivery_longitude), Number(shipment.delivery_latitude)];
    }
    if (parsedRoute?.coordinates?.length > 0) {
      return parsedRoute.coordinates[parsedRoute.coordinates.length - 1] as [number, number];
    }
    const c = shipment?.destinationCoords ?? shipment?.details?.destinationCoords;
    if (!c) return null;
    const arr = Array.isArray(c) ? c : [c.lng ?? c.longitude, c.lat ?? c.latitude];
    return arr.length === 2 ? arr as [number, number] : null;
  }, [shipment, parsedRoute]);

  const routeGeometry = parsedRoute;


  // Keep theme in a ref to avoid stale closures in Mapbox callbacks
  const [styleReloadCounter, setStyleReloadCounter] = useState(0);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const isDark = resolvedTheme === "dark";
    const styleUrl = isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
    currentStyleRef.current = isDark ? "dark" : "light";
    const center: [number, number] = origin ?? destination ?? [-70.6506, -33.4372];
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center,
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = m;
    
    m.on('style.load', () => {
      setStyleReloadCounter(c => c + 1);
    });

    return () => { m.remove(); mapRef.current = null; };
  }, []);

  // Update style when theme changes
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const isDark = resolvedTheme === "dark";
    const targetStyle = isDark ? "dark" : "light";
    if (currentStyleRef.current !== targetStyle) {
      currentStyleRef.current = targetStyle;
      m.setStyle(isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11");
    }
  }, [resolvedTheme]);

  // Fit bounds to origin and destination without drawing route line
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const coords: [number, number][] = [];
    if (origin) coords.push(origin);
    if (destination) coords.push(destination);

    if (coords.length >= 2) {
      const bounds = coords.reduce(
        (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      m.fitBounds(bounds, { padding: 100, duration: 1000 });
    }
  }, [shipment?.id, origin, destination]);


  // Clear route and markers when no shipment selected
  useEffect(() => {
    if (!shipment) {
      originMarkerRef.current?.remove();
      destMarkerRef.current?.remove();
      driverMarkerRef.current?.remove();
      const m = mapRef.current;
      if (!m || !m.isStyleLoaded()) return;
      const src = m.getSource("route-full") as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
    }
  }, [shipment]);

  // Real-time driver location subscription
  const driverId = shipment?.driverId ?? shipment?.driver_id ?? shipment?.carrierId ?? shipment?.carrier_id;
  useEffect(() => {
    setDriverLocation(null);
    if (!driverId || !supabase) return;

    const fetchInitialLoc = async () => {
      const { data } = await supabase
        .from("driverProfiles")
        .select("currentLatitude, currentLongitude")
        .eq("id", driverId)
        .single();
      if (data?.currentLatitude && data?.currentLongitude) {
        setDriverLocation([Number(data.currentLongitude), Number(data.currentLatitude)]);
      }
    };
    fetchInitialLoc();

    const channel = supabase
      .channel(`driver-location-tracking-${driverId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "driverProfiles", filter: `id=eq.${driverId}` },
        (payload) => {
          if (payload.new.currentLatitude && payload.new.currentLongitude) {
            setDriverLocation([Number(payload.new.currentLongitude), Number(payload.new.currentLatitude)]);
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, supabase]);


  const displayLocation = auditPoint ? [Number(auditPoint.longitude), Number(auditPoint.latitude)] as [number, number] : driverLocation;

  // Bouncing truck marker (driver)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !displayLocation) return;
    
    let animationFrameId: number;

    if (!driverMarkerRef.current) {
      const el = document.createElement("div");
      
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-[60px] h-[60px] bg-black/20 dark:bg-white/20 rounded-full animate-ping"></div>
          <div class="absolute w-[40px] h-[40px] bg-black/30 dark:bg-white/30 rounded-full animate-pulse"></div>
          <div class="relative w-[20px] h-[20px] bg-black dark:bg-white rounded-full border-[3px] border-white dark:border-black shadow-[0_0_15px_rgba(0,0,0,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.4)] z-10"></div>
        </div>`;
      
      driverMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(displayLocation)
        .addTo(m);
    } else {
      // Smooth interpolation using requestAnimationFrame to avoid panning lag
      const currentLngLat = driverMarkerRef.current.getLngLat();
      const start = performance.now();
      const duration = 800; // ms
      
      const animateMarker = (time: number) => {
        const progress = Math.min((time - start) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        
        const lng = currentLngLat.lng + (displayLocation[0] - currentLngLat.lng) * easeProgress;
        const lat = currentLngLat.lat + (displayLocation[1] - currentLngLat.lat) * easeProgress;
        
        driverMarkerRef.current?.setLngLat([lng, lat]);
        
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animateMarker);
        }
      };
      
      animationFrameId = requestAnimationFrame(animateMarker);
    }
    
    // Auto-pan to follow audit replay
    if (auditPoint) {
      m.panTo(displayLocation, { animate: true });
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [displayLocation, auditPoint]);

  const [snappedAuditRoute, setSnappedAuditRoute] = useState<any[]>([]);

  // Fetch optimal snapped route via Mapbox Map Matching API
  useEffect(() => {
    if (!auditHistory || auditHistory.length < 2) {
      setSnappedAuditRoute([]);
      return;
    }
    const fetchSnappedRoute = async () => {
      try {
        const sampled = auditHistory.length > 100 ? auditHistory.filter((_, i) => i % Math.ceil(auditHistory.length / 100) === 0) : auditHistory;
        const points = sampled.map((p: any) => `${p.longitude},${p.latitude}`).join(';');
        const radiuses = sampled.map(() => 25).join(';');
        
        const res = await fetch(
          `https://api.mapbox.com/matching/v5/mapbox/driving/${points}?geometries=geojson&radiuses=${radiuses}&access_token=${mapboxgl.accessToken}`
        );
        const data = await res.json();
        
        if (data.matchings && data.matchings[0]) {
          setSnappedAuditRoute(data.matchings[0].geometry.coordinates);
        } else {
          setSnappedAuditRoute(auditHistory.map(p => [Number(p.longitude), Number(p.latitude)]));
        }
      } catch (e) {
        setSnappedAuditRoute(auditHistory.map(p => [Number(p.longitude), Number(p.latitude)]));
      }
    };
    fetchSnappedRoute();
  }, [auditHistory]);

  // Draw Audit History Route
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    
    // Only attempt to add/update layer if style is loaded
    if (!m.isStyleLoaded()) {
      m.once('styledata', updateAuditLine);
    } else {
      updateAuditLine();
    }
    
    function updateAuditLine() {
      if (!m) return;
      const coords = snappedAuditRoute.length > 0 ? snappedAuditRoute : (auditHistory || []).map(p => [Number(p.longitude), Number(p.latitude)]);
      if (m.getSource("audit-route")) {
        const src = m.getSource("audit-route") as mapboxgl.GeoJSONSource;
        if (coords.length > 0) {
          src.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coords
            }
          });
        } else {
          src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
        }
      } else if (coords.length > 0) {
        m.addSource("audit-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coords
            }
          }
        });
        m.addLayer({
          id: "audit-route-line",
          type: "line",
          source: "audit-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": resolvedTheme === "dark" ? "#ffffff" : "#000000",
            "line-width": 6,
            "line-opacity": 0.8
          }
        });
      }
    }
  }, [snappedAuditRoute, auditHistory, styleReloadCounter, resolvedTheme]);

  // Bouncing origin marker (3D Floating Box Badge 📦)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !origin) return;
    originMarkerRef.current?.remove();
    const el = document.createElement("div");
    el.innerHTML = `
      <div class="relative flex flex-col items-center justify-center">
        <div class="w-[28px] h-[28px] bg-black dark:bg-white rounded-full shadow-lg flex items-center justify-center z-10">
          <div class="w-[10px] h-[10px] bg-white dark:bg-black rounded-full"></div>
        </div>
        <div class="w-[2px] h-[16px] bg-black dark:bg-white z-0"></div>
        <div class="w-[8px] h-[2px] bg-black dark:bg-white rounded-full -mt-[1px] z-0"></div>
      </div>
    `;
    originMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(origin)
      .addTo(m);
    return () => { originMarkerRef.current?.remove(); };
  }, [shipment?.id, origin]);

  // Bouncing destination marker (3D Floating Forklift Badge 🏗️/🚜)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !destination) return;
    destMarkerRef.current?.remove();
    const el = document.createElement("div");
    el.innerHTML = `
      <div class="relative flex flex-col items-center justify-center">
        <div class="w-[28px] h-[28px] bg-black dark:bg-white rounded-[4px] shadow-lg flex items-center justify-center z-10">
          <div class="w-[10px] h-[10px] bg-white dark:bg-black rounded-[2px]"></div>
        </div>
        <div class="w-[2px] h-[16px] bg-black dark:bg-white z-0"></div>
        <div class="w-[8px] h-[2px] bg-black dark:bg-white rounded-full -mt-[1px] z-0"></div>
      </div>
    `;
    destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(destination)
      .addTo(m);
    return () => { destMarkerRef.current?.remove(); };
  }, [shipment?.id, destination]);

  return <div ref={mapContainer} className="w-full h-full" />;
}

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ─── Main page ─────────────────────────────────────────────────────────────────
function CustomerTrackingContent() {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();
  const auditParamId = searchParams.get("audit");

  const [view, setView] = useState<"list" | "detail">(auditParamId ? "detail" : "list");
  const [selected, setSelected] = useState<any>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "chat" | "audit">(auditParamId ? "audit" : "info");
  const [auditPoint, setAuditPoint] = useState<any | null>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  const filterShipments = useCallback((q: any) => {
    if (!user) return q;
    let query = q.or(`clientId.eq.${user.id},customer_id.eq.${user.id}`);
    if (auditParamId) {
      query = query.in("status", ["Pending", "PENDING", "ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF", "COMPLETED", "CANCELLED", "Completed", "Cancelled"]);
    } else {
      query = query.in("status", ["Pending", "PENDING", "ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"]);
    }
    return query.order("createdAt", { ascending: false });
  }, [user, auditParamId]);

  const { data: shipments, isLoading } = useSupabaseCollection("shipments", filterShipments);

  // Auto-select audit shipment on load
  useEffect(() => {
    if (auditParamId && shipments && !selected) {
      const match = shipments.find((s: any) => s.id === auditParamId);
      if (match) {
        setSelected(match);
      }
    }
  }, [auditParamId, shipments, selected]);

  // Fetch driver name and initial GPS update when shipment selected
  const driverId = selected?.driverId || selected?.driver_id || selected?.carrierId || selected?.carrier_id;
  useEffect(() => {
    setDriverName(null);
    setLastGpsUpdate(null);
    if (!selected || !driverId) return;

    supabase.rpc("get_user_profiles_by_ids", { user_ids: [driverId] })
      .then(({ data }) => {
        if (data?.[0]) setDriverName(data[0].full_name || data[0].email || "Conductor");
      });

    // Subscribirse a las actualizaciones de señal GPS del chofer
    supabase.from("driverProfiles").select("currentLatitude, currentLongitude, lastLocationUpdate, updatedAt").eq("id", driverId).maybeSingle().then(({ data }) => {
      const ts = data?.lastLocationUpdate || data?.updatedAt;
      if (ts) {
        setLastGpsUpdate(new Date(ts).getTime());
      } else if (data?.currentLatitude && data?.currentLongitude) {
        setLastGpsUpdate(Date.now());
      }
    });

    const channel = supabase
      .channel(`cust-driver-signal-${driverId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "driverProfiles", filter: `id=eq.${driverId}` },
        () => setLastGpsUpdate(Date.now())
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selected?.id, driverId, supabase]);

  const handleSelect = (s: any) => {
    setSelected(s);
    setView("detail");
    setActiveTab("info");
  };

  const handleBack = () => {
    setView("list");
    setSelected(null);
  };

  const st = selected ? getStatus(selected.status) : null;
  const price = selected ? (selected.client_price || selected.clientPrice || selected.estimatedPrice || selected.price || 0) : 0;
  const isPending = selected?.status === "Pending" || selected?.status === "PENDING";

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-6 overflow-hidden relative">
      {/* Background Map */}
      <div className="absolute inset-0 z-0 bg-muted">
        <TrackingMap 
            shipment={selected} 
            auditPoint={auditPoint}
            auditHistory={auditHistory}
        />
      </div>

      {/* Left floating panel */}
      <div 
        className={cn(
          "absolute top-6 left-6 bottom-6 z-20 overflow-hidden rounded-2xl shadow-2xl transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          view === "detail" && activeTab === "audit" ? "w-[450px]" : "w-[340px]"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {view === "list" ? (
            <motion.div
              key="list"
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 bg-card/90 backdrop-blur-xl border flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b bg-muted/20 shrink-0">
                <h1 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary animate-pulse" />
                  Seguimiento Real
                </h1>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isLoading ? "Cargando..." : `${shipments?.length ?? 0} envío${(shipments?.length ?? 0) !== 1 ? "s" : ""} activo${(shipments?.length ?? 0) !== 1 ? "s" : ""}`}
                </p>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {isLoading && [1,2,3].map(i => (
                  <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />
                ))}

                {!isLoading && (!shipments || shipments.length === 0) && (
                  <div className="p-8 text-center">
                    <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">Sin envíos activos</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Tus cargas en curso aparecerán aquí.</p>
                  </div>
                )}

                {shipments?.map((s: any) => {
                  const st = getStatus(s.status);
                  const origin = (s.originAddress || s.pickup_address || "").split(",")[0];
                  const dest = (s.destinationAddress || s.delivery_address || "").split(",")[0];
                  return (
                    <motion.div
                      key={s.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelect(s)}
                      className="p-3 rounded-xl cursor-pointer border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border", st.bg, st.color)}>
                          {st.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground/60 mb-1.5">#{s.id}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          <p className="text-[11px] truncate font-medium">{origin || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <p className="text-[11px] truncate font-medium">{dest || "—"}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 bg-card/95 backdrop-blur-xl border flex flex-col"
            >
              {/* Detail Header */}
              <div className="p-3 border-b bg-muted/20 shrink-0">
                <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver a mis envíos
                </button>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground/60">#{selected?.id}</p>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border inline-block mt-1", st?.bg, st?.color)}>
                      {st?.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Precio</p>
                    <p className="font-black text-primary text-sm">CLP {Number(price).toLocaleString("es-CL")}</p>
                    {Number(selected?.priorityBoost) > 0 && (
                      <p className="text-[9px] text-orange-500 font-bold">🔥 +{Number(selected?.priorityBoost).toLocaleString("es-CL")}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b shrink-0">
                <button
                  onClick={() => setActiveTab("info")}
                  className={cn("flex-1 text-xs py-2.5 font-semibold transition-colors border-b-2",
                    activeTab === "info" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Info className="h-3.5 w-3.5 inline mr-1" /> Detalle
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={cn("flex-1 text-xs py-2.5 font-semibold transition-colors border-b-2",
                    activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 inline mr-1" /> Chat
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={cn("flex-1 text-xs py-2.5 font-semibold transition-colors border-b-2",
                    activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 inline mr-1" /> Auditoría
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === "info" ? (
                  <div className="p-3 space-y-3">
                    {/* Route */}
                    <div className="rounded-xl bg-muted/20 border p-3 space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Ruta</p>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 shadow shadow-green-400/50 shrink-0" />
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Origen</p>
                          <p className="text-xs font-semibold leading-tight">{selected?.originAddress || selected?.pickup_address || "—"}</p>
                        </div>
                      </div>
                      <div className="ml-[5px] h-4 border-l border-dashed border-muted-foreground/30" />
                      <div className="flex items-start gap-2.5">
                        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 shadow shadow-red-400/50 shrink-0" />
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Destino</p>
                          <p className="text-xs font-semibold leading-tight">{selected?.destinationAddress || selected?.delivery_address || "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Truck, label: "Vehículo", val: selected?.details?.vehicleType || selected?.details?.equipment || "Estándar" },
                        { icon: User, label: "Conductor", val: driverName || (isPending ? "Buscando..." : "No asignado") },
                        { icon: DollarSign, label: "Precio base", val: `CLP ${Number(selected?.estimatedPrice || selected?.client_price || 0).toLocaleString("es-CL")}` },
                        { icon: FileText, label: "PIN", val: ["Pending","PENDING","ACCEPTED","EN_ROUTE_TO_PICKUP","ARRIVED_AT_PICKUP"].includes(selected?.status) ? (selected?.pickup_code || "----") : ["IN_TRANSIT","ARRIVED_AT_DROPOFF"].includes(selected?.status) ? (selected?.delivery_code || "----") : "----" },
                      ].map(({ icon: Icon, label, val }) => (
                        <div key={label} className="rounded-xl border p-2.5 bg-muted/10">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                            <Icon className="h-2.5 w-2.5" /> {label}
                          </p>
                          <p className="text-xs font-semibold truncate">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Signal Status Badge */}
                    <div className="rounded-xl border p-3 bg-muted/10 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Estado del GPS del Conductor</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Cobertura en tiempo real</p>
                      </div>
                      <SignalIndicator lastUpdatedMs={lastGpsUpdate} />
                    </div>

                    {/* Extras / Observations */}
                    {selected?.details?.extraServices?.length > 0 && (
                      <div className="rounded-xl border p-3 bg-muted/10">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Servicios Adicionales</p>
                        {selected.details.extraServices.map((ex: string, i: number) => (
                          <p key={i} className="text-xs flex items-center gap-1.5 py-0.5">
                            <span className="w-1 h-1 rounded-full bg-primary shrink-0" /> {ex}
                          </p>
                        ))}
                      </div>
                    )}

                    {selected?.details?.observations && (
                      <div className="rounded-xl border p-3 bg-muted/10">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Observaciones</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{selected.details.observations}</p>
                      </div>
                    )}

                    {/* Conductor & Signal Indicator */}
                    {driverId && (
                      <div className="rounded-xl bg-muted/20 border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Conductor</p>
                          <SignalIndicator lastUpdatedMs={lastGpsUpdate} />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{driverName || "Transportista Vorian"}</p>
                            <p className="text-[10px] text-muted-foreground">Conductor asignado</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Date */}
                    {selected?.createdAt && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Creado: {format(parseISO(selected.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2 pt-1">
                      {isPending && (
                        <PriorityBoostModal
                          shipmentId={selected.id}
                          basePrice={Number(selected.estimatedPrice || selected.client_price || 0)}
                          currentBoost={Number(selected.priorityBoost || 0)}
                          onBoostApplied={() => window.location.reload()}
                        />
                      )}
                    </div>
                  </div>
                ) : activeTab === "chat" ? (
                  <div className="h-full">
                    {selected && <InlineChat shipmentId={selected.id} />}
                  </div>
                ) : (
                  <div className="p-4 space-y-8">
                    {selected && (
                      <>
                        <div>
                          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Registro Inmutable
                          </h3>
                          <ShipmentAuditTimeline shipmentId={selected.id} />
                        </div>
                          <div className="pt-4 border-t">
                          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Auditoría de Ruta (GPS Replay)
                          </h3>
                          <GpsReplayControls 
                            shipmentId={selected.id} 
                            onUpdate={(p, h) => {
                                setAuditPoint(p);
                                setAuditHistory(h);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom pill when in list mode with a hovered item */}
      {view === "list" && selected && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-card/90 backdrop-blur-xl border px-5 py-2.5 rounded-full shadow-lg flex gap-4 pointer-events-none">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[11px] font-medium truncate max-w-[140px]">{selected.originAddress?.split(",")[0]}</span>
          </div>
          <span className="text-muted-foreground text-[11px]">→</span>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[11px] font-medium truncate max-w-[140px]">{selected.destinationAddress?.split(",")[0]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerTrackingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <CustomerTrackingContent />
    </Suspense>
  );
}
