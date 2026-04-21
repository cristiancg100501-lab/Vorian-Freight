import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";
import { LocationHistoryPoint } from "@/lib/mock-audit-data";
import { Play, Pause, FastForward, Info } from "lucide-react";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { format } from "date-fns";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface ShipmentAuditMapProps {
  history: LocationHistoryPoint[];
  originCoords?: [number, number];
  destinationCoords?: [number, number];
}

const ShipmentAuditMap = ({ history, originCoords, destinationCoords }: ShipmentAuditMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const { resolvedTheme } = useTheme();
  const [mapReady, setMapReady] = useState(false);
  
  const [fakeRouteHistory, setFakeRouteHistory] = useState<LocationHistoryPoint[] | null>(null);
  const fakeRouteHistoryRef = useRef<LocationHistoryPoint[] | null>(null);

  const displayHistory = fakeRouteHistory || history;

  // Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const minTime = displayHistory[0]?.timestamp || 0;
  const maxTime = displayHistory[displayHistory.length - 1]?.timestamp || 100;
  const totalDuration = maxTime - minTime;
  
  const [currentTime, setCurrentTime] = useState(minTime);

  const [plannedRoute, setPlannedRoute] = useState<number[][] | null>(null);
  const plannedRouteRef = useRef<number[][] | null>(null);

  // Memoize stable dependencies to prevent infinite render loops
  const originStr = originCoords?.join(',');
  const destStr = destinationCoords?.join(',');
  const historyStr = history.map(p => `${p.longitude},${p.latitude}`).join(';');

  // Fetch optimal snapped route via Mapbox Map Matching API
  useEffect(() => {
    if (!history || history.length < 2) return;
    
    const fetchSnappedRoute = async () => {
      try {
        // Map Matching API supports up to 100 points
        const points = history.slice(0, 100).map(p => `${p.longitude},${p.latitude}`).join(';');
        
        const res = await fetch(
          `https://api.mapbox.com/matching/v5/mapbox/driving/${points}?geometries=geojson&radiuses=${history.slice(0, 100).map(() => 25).join(';')}&access_token=${mapboxgl.accessToken}`
        );
        const data = await res.json();
        
        if (data.matchings && data.matchings[0]) {
          const coords = data.matchings[0].geometry.coordinates;
          setPlannedRoute(coords);
          plannedRouteRef.current = coords;

          // Note: Here we keep the ORIGINAL timestamps from history for playback but use the snapped geometry for visuals
          // We don't overwrite with 'fakeRouteHistory' anymore unless absolutely necessary for a simulation mode.
        }
      } catch (e) {
        console.warn("Failed to fetch Map Matching route", e);
      }
    };

    fetchSnappedRoute();
  }, [historyStr]); // Use stringified history as stable dependency

  // Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c",
      center: [-70.64, -33.44], // Santiago aprox
      zoom: 13,
    });
    
    const mapInstance = map.current;

    // Force a resize after mount so the canvas fits the DOM container
    setTimeout(() => {
      mapInstance.resize();
    }, 200);

    mapInstance.on("load", () => {
        const layers = mapInstance.getStyle()?.layers || [];
        for (const layer of layers) {
            if (
                layer.id.includes('poi') || 
                layer.id.includes('building') || 
                layer.id.includes('park') ||
                layer.id.includes('landuse')
            ) {
                mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        }
      // 1. Add Origin and Destination Markers
      if (originCoords) {
        const el = document.createElement('div');
        el.className = 'w-6 h-6 bg-background rounded-full border-4 border-green-500 shadow-xl flex items-center justify-center';
        el.innerHTML = '<div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>';
        
        new mapboxgl.Marker(el)
          .setLngLat([originCoords[0], originCoords[1]])
          .setPopup(new mapboxgl.Popup({ offset: 25, className: 'audit-popup bg-background border shadow-md' }).setHTML('<div class="p-1 font-mono text-xs font-bold">Origen</div>'))
          .addTo(mapInstance);
      }

      if (destinationCoords) {
        const el = document.createElement('div');
        el.className = 'w-6 h-6 bg-background rounded-full border-4 border-red-500 shadow-xl flex items-center justify-center';
        el.innerHTML = '<div class="w-1.5 h-1.5 bg-red-500 rounded-full"></div>';
        
        new mapboxgl.Marker(el)
          .setLngLat([destinationCoords[0], destinationCoords[1]])
          .setPopup(new mapboxgl.Popup({ offset: 25, className: 'audit-popup bg-background border shadow-md' }).setHTML('<div class="p-1 font-mono text-xs font-bold">Destino</div>'))
          .addTo(mapInstance);
      }

      // 2. Add Actual History Route Layer (Naranja - Real o Simulado)
      // Usamos un placeholder y luego actualizamos vía setData para evitar race conditions
      if (!mapInstance.getSource("actual-route")) {
        mapInstance.addSource("actual-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          },
        });

        mapInstance.addLayer({
          id: "actual-route-layer",
          type: "line",
          source: "actual-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": resolvedTheme === "dark" ? "#3b82f6" : "#2563eb", // Azul Eléctrico (Vorian Audit)
            "line-width": 5,
            "line-opacity": 1,
            "line-blur": 1,
          },
        });
      }

      // 3. Create Truck Marker
      const el = document.createElement("div");
      el.className = "relative transition-transform duration-100 ease-linear";
      el.innerHTML = `
        <div class="truck-icon-container w-8 h-8 flex items-center justify-center transition-transform duration-300">
          <div class="absolute w-6 h-6 bg-blue-500 rounded-full blur-md opacity-50 animate-pulse"></div>
          <div class="relative w-6 h-6 bg-background border-4 border-blue-600 rounded-full shadow-lg flex items-center justify-center">
             <div class="w-2 h-2 bg-foreground rounded-full"></div>
             <div class="absolute -top-1 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      `;
      
      const displayH = fakeRouteHistoryRef.current || history;
      truckMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([displayH[0].longitude, displayH[0].latitude])
        .addTo(mapInstance);

      // Popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15,
        className: 'audit-popup bg-background border shadow-md'
      }).setLngLat([displayH[0].longitude, displayH[0].latitude])
        .setHTML(`<div class="p-1 font-mono text-xs font-bold text-foreground">Inicio de Viaje</div>`)
        .addTo(mapInstance);
      
      popupRef.current = popup;

      setMapReady(true);
      
      // Intentar forzar el renderizado de la ruta planeada si ya existe
      if (plannedRouteRef.current && !mapInstance.getSource("planned-route")) {
        mapInstance.addSource("planned-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: plannedRouteRef.current } },
        });
        mapInstance.addLayer({
          id: "planned-route-layer",
          type: "line",
          source: "planned-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
             "line-color": resolvedTheme === "dark" ? "#ffffff" : "#475569",
             "line-width": 4,
             "line-dasharray": [2, 2],
             "line-opacity": 0.8,
          },
        }, "actual-route-layer");
      }
    });

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Theme Update
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const style = resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c";
    
    const handleStyleLoad = () => {
      const m = map.current;
      if (!m) return;

        const layers = m.getStyle()?.layers || [];
        for (const layer of layers) {
            if (
                layer.id.includes('poi') || 
                layer.id.includes('building') || 
                layer.id.includes('park') ||
                layer.id.includes('landuse')
            ) {
                m.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        }

      const currentDisplayHistory = fakeRouteHistoryRef.current || history;
      const actualCoords = currentDisplayHistory.map((pt) => [pt.longitude, pt.latitude]);
      if (!m.getSource("actual-route")) {
        m.addSource("actual-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: actualCoords } },
        });
        m.addLayer({
          id: "actual-route-layer",
          type: "line",
          source: "actual-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": resolvedTheme === "dark" ? "#3b82f6" : "#2563eb", "line-width": 5, "line-opacity": 1, "line-blur": 1 },
        });
      }

      if (plannedRouteRef.current && !m.getSource("planned-route")) {
        m.addSource("planned-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: plannedRouteRef.current } },
        });
        m.addLayer({
          id: "planned-route-layer",
          type: "line",
          source: "planned-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": resolvedTheme === "dark" ? "#ffffff" : "#475569", // Más oscuro en light mode
            "line-width": 4,
            "line-dasharray": [2, 2],
            "line-opacity": 0.8,
          },
        }, "actual-route-layer"); 
      }

      if (plannedRouteRef.current && !m.getSource("planned-route")) {
        m.addSource("planned-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: plannedRouteRef.current } },
        });
        m.addLayer({
          id: "planned-route-layer",
          type: "line",
          source: "planned-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": resolvedTheme === "dark" ? "#ffffff" : "#64748b",
            "line-width": 3,
            "line-dasharray": [3, 2],
            "line-opacity": resolvedTheme === "dark" ? 0.4 : 0.6,
          },
        }); 
      }
    };
    
    map.current.setStyle(style);
    map.current.once('style.load', handleStyleLoad);
  }, [resolvedTheme]);

  // Render Planned Route dynamically when fetched
  useEffect(() => {
    if (!mapReady || !map.current || !plannedRoute) return;
    const m = map.current;
    if (!m.isStyleLoaded()) return;

    if (!m.getSource("planned-route")) {
      m.addSource("planned-route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: plannedRoute } },
      });
      m.addLayer({
        id: "planned-route-layer",
        type: "line",
        source: "planned-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": resolvedTheme === "dark" ? "#ffffff" : "#1e293b",
          "line-width": 4,
          "line-dasharray": [2, 2],
          "line-opacity": 0.9,
        },
      }, m.getLayer("actual-route-layer") ? "actual-route-layer" : undefined);
    } else {
      (m.getSource("planned-route") as mapboxgl.GeoJSONSource).setData({
        type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: plannedRoute }
      });
    }
  }, [plannedRoute, mapReady, resolvedTheme]);

  // Memoize chart data to avoid recalculations on every frame
  const chartData = useMemo(() => displayHistory.map(pt => ({
    time: pt.timestamp,
    speed: pt.speed,
    timeStr: format(new Date(pt.timestamp), 'HH:mm')
  })), [historyStr, fakeRouteHistory]);

  const maxSpeed = useMemo(() => Math.max(...displayHistory.map(p => p.speed || 0), 1), [displayHistory]);
  const avgSpeed = useMemo(() => (displayHistory.reduce((acc, p) => acc + (p.speed || 0), 0) / displayHistory.length) || 0, [displayHistory]);

  // Interpolation & Update UI Based on 'currentTime'
  useEffect(() => {
    if (!mapReady || !truckMarkerRef.current || !popupRef.current || displayHistory.length === 0) return;
    
    // Find nearest points for interpolation
    let startIndex = 0;
    while (startIndex < displayHistory.length - 1 && displayHistory[startIndex + 1].timestamp <= currentTime) {
      startIndex++;
    }

    const startPt = displayHistory[startIndex];
    const endPt = displayHistory[Math.min(startIndex + 1, displayHistory.length - 1)];

    let interpolatedLng = startPt.longitude;
    let interpolatedLat = startPt.latitude;
    let currentSpeed = startPt.speed;
    let currentHeading = startPt.heading || 0;

    if (startPt !== endPt && currentTime > startPt.timestamp) {
      const timeDiff = endPt.timestamp - startPt.timestamp;
      const progress = (currentTime - startPt.timestamp) / timeDiff;
      interpolatedLng = startPt.longitude + (endPt.longitude - startPt.longitude) * progress;
      interpolatedLat = startPt.latitude + (endPt.latitude - startPt.latitude) * progress;
      currentSpeed = startPt.speed + (endPt.speed - startPt.speed) * progress;
      
      // Interpolate heading for smooth turns
      if (endPt.heading !== undefined) {
         currentHeading = startPt.heading + (endPt.heading - startPt.heading) * progress;
      }
    }

    truckMarkerRef.current.setLngLat([interpolatedLng, interpolatedLat]);
    
    // Rotate truck marker smoothly
    const el = truckMarkerRef.current.getElement();
    if (el) {
       // We use querySelector to target the inner container to avoid messing with mapbox's marker transform
       const icon = el.querySelector('.truck-icon-container') as HTMLElement;
       if (icon) {
          icon.style.transform = `rotate(${currentHeading}deg)`;
       }
    }

    popupRef.current.setLngLat([interpolatedLng, interpolatedLat]);

    // Format current time
    const date = new Date(currentTime);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    popupRef.current.setHTML(`
      <div class="px-2 py-1 min-w-[80px]">
        <p class="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Control GPS Snapped</p>
        <p class="text-xs font-mono font-bold leading-tight mb-1 text-foreground">${timeStr}</p>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full ${currentSpeed > 5 ? 'bg-blue-500' : 'bg-red-500'}"></span>
          <p class="text-xs font-bold text-foreground">${Math.round(currentSpeed)} km/h</p>
        </div>
      </div>
    `);

  }, [currentTime, mapReady, displayHistory]);

  // Update geojson when history or planned route changes
  useEffect(() => {
    if (!mapReady || !map.current) return;
    const m = map.current;
    if (!m.isStyleLoaded()) return;

    if (plannedRoute) {
        if (m.getSource("actual-route")) {
          (m.getSource("actual-route") as mapboxgl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: plannedRoute }
          });
        }
    }

    // Auto-fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    if (plannedRoute) {
        plannedRoute.forEach((c) => bounds.extend(c as [number, number]));
    } else {
        displayHistory.forEach((pt) => bounds.extend([pt.longitude, pt.latitude]));
    }
    
    if (originCoords) bounds.extend(originCoords);
    if (destinationCoords) bounds.extend(destinationCoords);
    
    if (!bounds.isEmpty()) {
       m.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    }

  }, [plannedRoute, mapReady, historyStr])  // Playback Loop
  useEffect(() => {
    let lastRenderTime: number;
    const animate = (timestamp: number) => {
      if (!isPlaying) return;
      if (!lastRenderTime) lastRenderTime = timestamp;
      const dtMs = timestamp - lastRenderTime;
      const simulatedTimeProgress = dtMs * playbackSpeed * 100; 
      
      setCurrentTime((prev) => {
        let nextTime = prev + simulatedTimeProgress;
        if (nextTime >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return nextTime;
      });
      lastRenderTime = timestamp;
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) { animationRef.current = requestAnimationFrame(animate); }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, playbackSpeed, maxTime]);

  const progressPercentage = totalDuration > 0 ? ((currentTime - minTime) / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-[500px] bg-background relative overflow-hidden">
      <div className="bg-muted" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} ref={mapContainer} />

      <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
         <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-xl flex flex-col items-end">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Velocidad Máx.</p>
            <p className="text-2xl font-mono text-primary font-black leading-none">{Math.round(maxSpeed)} <span className="text-xs text-muted-foreground font-sans">km/h</span></p>
         </div>
         <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-xl flex flex-col items-end">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Vel. Promedio</p>
            <p className="text-2xl font-mono text-emerald-500 font-black leading-none">{Math.round(avgSpeed)} <span className="text-xs text-muted-foreground font-sans">km/h</span></p>
         </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 z-40">
        <div className="bg-background/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-2xl shadow-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary/30">
                {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="ml-1 fill-current" />}
              </button>
              <div className="flex flex-col">
                 <button onClick={() => setPlaybackSpeed((s) => (s === 1 ? 3 : s === 3 ? 10 : 1))} className="text-[10px] px-2 py-1 rounded-full border bg-muted/50 hover:bg-muted text-foreground transition-colors font-bold tracking-widest uppercase flex items-center gap-1">
                   <FastForward size={12} /> {playbackSpeed}x SPD
                 </button>
                 <span className="text-xs font-mono mt-1 text-muted-foreground">{format(new Date(currentTime), "HH:mm:ss")}</span>
              </div>
            </div>
            <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Timeline Envío</p>
                <p className="font-mono text-sm font-semibold text-foreground">{format(new Date(minTime), "dd MMM yyyy")}</p>
            </div>
          </div>

          <div className="h-[80px] w-full relative group">
             <input type="range" min={minTime} max={maxTime} value={currentTime} onChange={(e) => setCurrentTime(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 z-50 cursor-pointer" />
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={resolvedTheme === 'dark' ? '#3b82f6' : '#2563eb'} stopOpacity={0.5}/>
                      <stop offset="95%" stopColor={resolvedTheme === 'dark' ? '#3b82f6' : '#2563eb'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="speed" stroke={resolvedTheme === 'dark' ? '#60a5fa' : '#2563eb'} strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" isAnimationActive={false}/>
                </AreaChart>
             </ResponsiveContainer>
             <div className="absolute top-0 bottom-0 w-px bg-foreground z-30 pointer-events-none transition-all duration-75" style={{ left: `${progressPercentage}%` }}>
                <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-foreground rounded-full shadow border-2 border-background" />
             </div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground font-medium mt-1">
             <span>{format(new Date(minTime), "HH:mm")}</span>
             <span>{format(new Date(maxTime), "HH:mm")}</span>
          </div>
        </div>
      </div>
      
      <div className="absolute top-4 left-4 z-40 bg-background/80 backdrop-blur-md border border-border/50 rounded-lg p-3 shadow-lg">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Info size={12} /> Leyenda Auditoría</h4>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-1 ${resolvedTheme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'} rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]`}></div>
            <span className="text-xs font-semibold">Ruta Ajustada (Snapping)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-green-500"></div>
            <span className="text-xs font-semibold opacity-70">Origen Real</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-red-500"></div>
            <span className="text-xs font-semibold opacity-70">Destino Real</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentAuditMap;
