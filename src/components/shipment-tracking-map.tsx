"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { Truck } from "lucide-react";

// Token público (idealmente debe venir de env var)
mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface ShipmentTrackingMapProps {
  origin: [number, number] | null;
  destination: [number, number] | null;
  routeGeometry?: any;
  driverLocation: [number, number] | null;
  status: string;
}

export default function ShipmentTrackingMap({ origin, destination, routeGeometry, driverLocation, status }: ShipmentTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const { theme } = useTheme();

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

      // Dibujar ruta
      if (routeGeometry) {
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
        el.className = 'w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg';
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
    if (!map.current || !routeGeometry) return;
    
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
        <div class="absolute w-24 h-24 bg-blue-500/20 rounded-full animate-ping"></div>
        <div class="absolute w-16 h-16 bg-blue-500/40 rounded-full animate-pulse"></div>
        <div class="relative w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
      `;
      map.current.flyTo({ center: origin, zoom: 14, speed: 0.5 });
    } else {
      // Origen estático
      el.className = 'w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg';
      el.innerHTML = ''; // Limpiar radar
    }
  }, [isPending, origin]);

  // Manejar ubicación del conductor
  useEffect(() => {
    if (!map.current || isPending || !driverLocation) return;
    
    let animationFrameId: number;

    if (!driverMarkerRef.current) {
      // Crear marcador del camión
      const el = document.createElement('div');
      // Importante: NO usar transition-all porque pelea con requestAnimationFrame y el arrastre del mapa
      el.className = 'bg-white p-1.5 rounded-full shadow-xl border-2 border-green-500 flex items-center justify-center';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;
      
      driverMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat(driverLocation)
        .addTo(map.current);
        
      // Hacer zoom inicial hacia el conductor y el origen
      if (['IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_PICKUP'].includes(status || '')) {
         map.current.flyTo({ center: driverLocation, zoom: 14, speed: 1.5 });
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
        }
      };
      
      animationFrameId = requestAnimationFrame(animateMarker);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [driverLocation, isPending, origin]);

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
    </div>
  );
}
