"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { Truck, Activity, Navigation, Clock } from "lucide-react";

// Token público (idealmente debe venir de env var)
mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface ShipmentTrackingMapProps {
  origin: [number, number] | null;
  destination: [number, number] | null;
  routeGeometry?: any;
  driverLocation: [number, number] | null;
  status: string;
  showRoute?: boolean;
}

export default function ShipmentTrackingMap({ origin, destination, routeGeometry, driverLocation, status, showRoute = false }: ShipmentTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const { theme } = useTheme();

  // Telemetría state
  const [speed, setSpeed] = useState<number>(0);
  const lastDriverLocationRef = useRef<[number, number] | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const isPending = status === "Pending" || status === "PENDING";
  const mapStyle = theme === "dark" 
    ? "mapbox://styles/mapbox/dark-v11" 
    : "mapbox://styles/mapbox/light-v11";

  const [mapError, setMapError] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>("Component mounted");

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) {
      setDebugStatus("Container ref is null!");
      return;
    }
    if (map.current) {
      setDebugStatus("Map already initialized");
      return;
    }

    setDebugStatus("Creating map instance...");

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: origin || [-70.64827, -33.45694], // Centro por defecto (Santiago)
        zoom: 11,
        pitch: 0,
        bearing: 0,
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.current.touchZoomRotate.disableRotation();
      map.current.keyboard.disable(); // Previene rotar con las flechas
      
      setDebugStatus("Map instance created, waiting for load...");
    } catch (e: any) {
      console.error("Mapbox init error:", e);
      setMapError(e.message || "Failed to initialize Mapbox");
      setDebugStatus("Init error");
      return;
    }

    map.current.on('load', () => {
      setDebugStatus("Map loaded completely!");
      
      // Ajustar vista para incluir origen y destino
      if (origin && destination) {
        const bounds = new mapboxgl.LngLatBounds(origin, origin);
        bounds.extend(destination);
        map.current?.fitBounds(bounds, { padding: 80, duration: 1000 });
      }

      // Dibujar ruta (solo si showRoute es true)
      if (showRoute && routeGeometry) {
        const geojson = typeof routeGeometry === 'string' ? JSON.parse(routeGeometry) : routeGeometry;
        map.current?.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: geojson
          }
        });
        map.current?.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': theme === 'dark' ? '#3b82f6' : '#2563eb',
            'line-width': 4,
            'line-opacity': 0.7
          }
        });
      }

      // Marcador de Destino (Rojo)
      if (destination) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div class="relative flex flex-col items-center justify-center">
            <div class="w-[28px] h-[28px] bg-black dark:bg-white rounded-[4px] shadow-lg flex items-center justify-center z-10">
              <div class="w-[10px] h-[10px] bg-white dark:bg-black rounded-[2px]"></div>
            </div>
            <div class="w-[2px] h-[16px] bg-black dark:bg-white z-0"></div>
            <div class="w-[8px] h-[2px] bg-black dark:bg-white rounded-full -mt-[1px] z-0"></div>
          </div>
        `;
        new mapboxgl.Marker(el).setLngLat(destination).addTo(map.current!);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []); // Solo al montar

  // Actualizar estilo del mapa cuando cambia el tema (Dark/Light mode)
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      map.current.setStyle(mapStyle);
      
      // Asegurar que la capa de la ruta se vuelva a agregar después de cambiar el estilo
      map.current.once('styledata', () => {
        if (routeGeometry && map.current && !map.current.getSource('route')) {
          const geojson = typeof routeGeometry === 'string' ? JSON.parse(routeGeometry) : routeGeometry;
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: geojson
            }
          });
          map.current.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': theme === 'dark' ? '#3b82f6' : '#2563eb',
              'line-width': 4,
              'line-opacity': 0.7
            }
          });
        }
      });
    }
  }, [mapStyle, theme, routeGeometry]);

  // Reaccionar a routeGeometry que llega después del montaje (ej. fallback Mapbox Directions)
  useEffect(() => {
    if (!map.current || !routeGeometry || !showRoute) return;
    
    const addRoute = () => {
      if (!map.current) return;
      const geojson = typeof routeGeometry === 'string' ? JSON.parse(routeGeometry) : routeGeometry;
      
      // Si ya existe la fuente, actualizarla
      if (map.current.getSource('route')) {
        (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: geojson
        });
      } else {
        // Crear fuente y capa
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: geojson
          }
        });
        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': theme === 'dark' ? '#3b82f6' : '#2563eb',
            'line-width': 4,
            'line-opacity': 0.7
          }
        });
      }

      // Ajustar vista a la ruta
      if (geojson?.coordinates?.length > 0) {
        const coords = geojson.coordinates;
        const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0]);
        coords.forEach((c: [number, number]) => bounds.extend(c));
        map.current.fitBounds(bounds, { padding: 80, duration: 1500 });
      }
    };

    if (map.current.isStyleLoaded()) {
      addRoute();
    } else {
      map.current.on('load', addRoute);
    }
  }, [routeGeometry, theme]);

  // Actualizar estilo del mapa si cambia el tema
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      map.current.setStyle(mapStyle);
    }
  }, [theme, mapStyle]);

  // Manejar el Radar y el Origen
  useEffect(() => {
    if (!map.current || !origin) return;

    if (!originMarkerRef.current) {
      // Crear marcador origen
      const el = document.createElement('div');
      originMarkerRef.current = new mapboxgl.Marker(el).setLngLat(origin).addTo(map.current);
    }

    const el = originMarkerRef.current.getElement();

    if (isPending) {
      // Animación de radar (Buscando Conductor)
      el.className = 'relative flex items-center justify-center';
      el.innerHTML = `
        <div class="relative flex flex-col items-center justify-center">
          <div class="absolute w-[60px] h-[60px] bg-black/20 dark:bg-white/20 rounded-full animate-ping"></div>
          <div class="absolute w-[40px] h-[40px] bg-black/30 dark:bg-white/30 rounded-full animate-pulse"></div>
          <div class="relative w-[20px] h-[20px] bg-black dark:bg-white rounded-full border-[3px] border-white dark:border-black shadow-[0_0_15px_rgba(0,0,0,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.4)] z-10"></div>
        </div>
      `;
      map.current.flyTo({ center: origin, zoom: 14, speed: 0.5 });
    } else {
      // Origen estático
      el.className = '';
      el.innerHTML = `
        <div class="relative flex flex-col items-center justify-center">
          <div class="w-[28px] h-[28px] bg-black dark:bg-white rounded-full shadow-lg flex items-center justify-center z-10">
            <div class="w-[10px] h-[10px] bg-white dark:bg-black rounded-full"></div>
          </div>
          <div class="w-[2px] h-[16px] bg-black dark:bg-white z-0"></div>
          <div class="w-[8px] h-[2px] bg-black dark:bg-white rounded-full -mt-[1px] z-0"></div>
        </div>
      `;
    }
  }, [isPending, origin]);

  // Manejar ubicación del conductor
  useEffect(() => {
    const isTripActive = ['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF'].includes(status || '');
    
    // Si el mapa no está, el envío está buscando conductor, no hay ubicación o el viaje no está activo
    if (!map.current || isPending || !driverLocation || !isTripActive) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }
    
    let animationFrameId: number;

    // Calcular velocidad
    if (lastDriverLocationRef.current && lastTimestampRef.current) {
      const now = Date.now();
      const timeDiffH = (now - lastTimestampRef.current) / 3600000; // horas
      if (timeDiffH > 0 && timeDiffH < 1) { // ignorar saltos enormes
        const distKm = haversineMeters(
          lastDriverLocationRef.current[0], lastDriverLocationRef.current[1],
          driverLocation[0], driverLocation[1]
        ) / 1000;
        const currentSpeed = distKm / timeDiffH;
        setSpeed(prev => Math.round(prev * 0.4 + currentSpeed * 0.6)); // Suavizado
      }
    }
    lastDriverLocationRef.current = driverLocation;
    lastTimestampRef.current = Date.now();

    if (!driverMarkerRef.current) {
      // Crear marcador del camión
      // Importante: NO usar transition-all porque pelea con requestAnimationFrame y el arrastre del mapa
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-[60px] h-[60px] bg-black/20 dark:bg-white/20 rounded-full animate-ping"></div>
          <div class="absolute w-[40px] h-[40px] bg-black/30 dark:bg-white/30 rounded-full animate-pulse"></div>
          <div class="relative w-[20px] h-[20px] bg-black dark:bg-white rounded-full border-[3px] border-white dark:border-black shadow-[0_0_15px_rgba(0,0,0,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.4)] z-10"></div>
        </div>`;
      
      driverMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat(driverLocation)
        .addTo(map.current);
        
      // Hacer zoom inicial hacia el conductor y el origen
      if (isTripActive) {
         map.current.flyTo({ center: driverLocation, zoom: 14, speed: 1.2, curve: 1.42, pitch: 45, duration: 2500 });
      } else if (origin) {
         const bounds = new mapboxgl.LngLatBounds(origin, origin);
         bounds.extend(driverLocation);
         map.current.fitBounds(bounds, { padding: 100, duration: 2000 });
      }
    } else {
      // Interpolación simple controlada
      const currentLngLat = driverMarkerRef.current.getLngLat();
      let start = performance.now();
      const duration = 300; // Animación rápida de 300ms para no quedar rezagado
      
      const animateMarker = (time: number) => {
        const progress = Math.min((time - start) / duration, 1);
        
        const lng = currentLngLat.lng + (driverLocation[0] - currentLngLat.lng) * progress;
        const lat = currentLngLat.lat + (driverLocation[1] - currentLngLat.lat) * progress;
        
        driverMarkerRef.current?.setLngLat([lng, lat]);
        
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animateMarker);
        } else {
           // Si el camión se movió, que la cámara lo siga suavemente si estamos en tránsito
           if (isTripActive && map.current) {
               map.current.easeTo({ center: [lng, lat], duration: 300, easing: (t) => t });
           }
        }
      };
      
      animationFrameId = requestAnimationFrame(animateMarker);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [driverLocation, isPending, status, origin]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: '200px' }}>
      <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
      <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {mapError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 text-center bg-red-500/90 text-white text-sm backdrop-blur-sm">
          <p className="font-bold mb-2">Error cargando el mapa</p>
          <p className="font-mono text-xs">{mapError}</p>
        </div>
      )}

      {/* Overlay informativo de Radar */}
      {isPending && !mapError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-6 py-3 rounded-full border shadow-lg flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </div>
          <span className="font-semibold text-sm">Buscando transportista en la red...</span>
        </div>
      )}

      {/* Telemetry Overlay */}
      {driverLocation && ['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT'].includes(status || '') && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
          <div className="bg-background/80 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-4 flex flex-col gap-3 min-w-[200px]">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telemetría en Vivo</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Navigation className="h-3 w-3"/> Velocidad</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono">{speed > 0 ? speed : '--'}</span>
                  <span className="text-xs text-muted-foreground font-semibold">km/h</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-3 w-3"/> Últ. Señal</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm font-bold mt-1 text-green-500">Activa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Función auxiliar
function haversineMeters(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
