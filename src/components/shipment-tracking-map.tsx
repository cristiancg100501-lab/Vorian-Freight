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
  showRoute?: boolean;
}

export default function ShipmentTrackingMap({ origin, destination, routeGeometry, driverLocation, status, showRoute = false }: ShipmentTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const { resolvedTheme } = useTheme();

  const isPending = status === "Pending" || status === "PENDING";
  const mapStyle = resolvedTheme === "dark" 
    ? "mapbox://styles/vorianglobal/cms98zfnl00dr01s6a3f83a2e" 
    : "mapbox://styles/vorianglobal/cms99ny3300dz01s6acsca4vx";

  const [mapError, setMapError] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>("Component mounted");
  const [mapLoaded, setMapLoaded] = useState(false);

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
        pitch: 60,
        maxPitch: 85,
        bearing: -17.6,
        dragRotate: true,
        pitchWithRotate: true,
      });
      
      setDebugStatus("Map instance created, waiting for load...");
    } catch (e: any) {
      console.error("Mapbox init error:", e);
      setMapError(e.message || "Failed to initialize Mapbox");
      setDebugStatus("Init error");
      return;
    }

    map.current.on('load', () => {
      setDebugStatus("Map loaded completely!");
      setMapLoaded(true);
      
      // Ajustar vista para incluir origen y destino
      if (origin && destination) {
        const bounds = new mapboxgl.LngLatBounds(origin, origin);
        bounds.extend(destination);
        const camera = map.current?.cameraForBounds(bounds, { padding: 80, pitch: 60, bearing: -17.6 });
        if (camera) {
          map.current?.flyTo({ ...camera, pitch: 60, bearing: -17.6, duration: 1000 });
        }
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
            'line-color': resolvedTheme === 'dark' ? '#3b82f6' : '#2563eb',
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
    if (map.current && mapLoaded) {
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
              'line-color': resolvedTheme === 'dark' ? '#3b82f6' : '#2563eb',
              'line-width': 4,
              'line-opacity': 0.7
            }
          });
        }
        
        // Ensure 3D buildings are enabled
        if (map.current && map.current.getSource('composite') && !map.current.getLayer('3d-buildings')) {
          const layers = map.current.getStyle()?.layers || [];
          const labelLayerId = layers.find(
            (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
          )?.id;

          map.current.addLayer(
            {
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 14,
              paint: {
                'fill-extrusion-color': resolvedTheme === 'dark' ? '#1e293b' : '#e2e8f0',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14, 0,
                  14.05, ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14, 0,
                  14.05, ['get', 'min_height']
                ],
                'fill-extrusion-opacity': resolvedTheme === 'dark' ? 0.8 : 0.6
              }
            },
            labelLayerId
          );
        }
      });
    }
  }, [mapStyle, resolvedTheme, routeGeometry, mapLoaded]);

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
            'line-color': resolvedTheme === 'dark' ? '#3b82f6' : '#2563eb',
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
        const camera = map.current.cameraForBounds(bounds, { padding: 80, pitch: 60, bearing: -17.6 });
        if (camera) {
          map.current.flyTo({ ...camera, pitch: 60, bearing: -17.6, duration: 1500 });
        }
      }
    };

    if (map.current.isStyleLoaded()) {
      addRoute();
    } else {
      map.current.on('load', addRoute);
    }
  }, [routeGeometry, resolvedTheme]);

  // Actualizar estilo del mapa si cambia el tema
  // Este useEffect estaba duplicado y ahora se maneja arriba con styledata.
  // Pero lo comentaremos o removeremos, ya que el de arriba hace setStyle y restore de ruta.

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
      map.current.flyTo({ center: origin, zoom: 14, speed: 0.5, pitch: 60, bearing: -17.6 });
    } else {
      // Origen estático
      el.className = 'w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg';
      el.innerHTML = ''; // Limpiar radar
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

    if (!driverMarkerRef.current) {
      // Crear marcador del camión
      // Importante: NO usar transition-all porque pelea con requestAnimationFrame y el arrastre del mapa
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="relative flex flex-col items-center justify-center">
          <div class="relative w-10 h-10 rounded-xl bg-primary border-[3px] border-background shadow-xl flex items-center justify-center text-primary-foreground z-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect width="16" height="16" x="4" y="4" rx="2" />
              <path d="M9 10L12 13L15 10" />
              <path d="M12 13V7" />
            </svg>
            <div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
          </div>
          <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[7px] border-t-primary -mt-1 z-0"></div>
        </div>`;
      
      driverMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat(driverLocation)
        .addTo(map.current);
        
      // Hacer zoom inicial hacia el conductor y el origen
      if (isTripActive) {
         map.current.flyTo({ center: driverLocation, zoom: 14, speed: 1.5, pitch: 60, bearing: -17.6 });
      } else if (origin) {
         const bounds = new mapboxgl.LngLatBounds(origin, origin);
         bounds.extend(driverLocation);
         const camera = map.current.cameraForBounds(bounds, { padding: 100, pitch: 60, bearing: -17.6 });
         if (camera) {
           map.current.flyTo({ ...camera, pitch: 60, bearing: -17.6, duration: 2000 });
         }
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
    </div>
  );
}
