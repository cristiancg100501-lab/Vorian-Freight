"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { useSupabase } from "@/components/providers/supabase-provider";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface VorianMapProps {
  route: any;
  origin: [number, number] | null;
  destination: [number, number] | null;
  activeTolls?: any[];
  vehicleType?: string;
  drivers?: any[];
  selectedDriver?: any;
  onDriverSelect?: (id: string) => void;
}

const isValidLngLat = (coords: any): coords is [number, number] => {
    if (!Array.isArray(coords) || coords.length !== 2) return false;
    const lng = typeof coords[0] === 'string' ? parseFloat(coords[0]) : coords[0];
    const lat = typeof coords[1] === 'string' ? parseFloat(coords[1]) : coords[1];
    return (
        typeof lng === 'number' && !isNaN(lng) &&
        typeof lat === 'number' && !isNaN(lat)
    );
};

export default function VorianMap({ route, origin, destination, activeTolls = [], vehicleType = 'camion_rampla', drivers = [], selectedDriver, onDriverSelect }: VorianMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const tollMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const driverMarkersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const { supabase } = useSupabase();
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const [styleLoadedCount, setStyleLoadedCount] = useState(0);

  useEffect(() => {
     themeRef.current = theme;
  }, [theme]);

  // Category determination
  const categoryKey = useMemo(() => {
    if (['furgon', 'pickup', 'camioneta'].includes(vehicleType)) return 'cat1';
    if (['camion', 'simple', 'camion_simple'].includes(vehicleType)) return 'cat2';
    return 'cat3';
  }, [vehicleType]);

  // 1. Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c',
      center: [-70.6693, -33.4489], 
      zoom: 11,
      pitch: 0,
      projection: { name: 'mercator' } as any,
    });
    
    map.current.on('style.load', () => {
        const mapInstance = map.current;
        if (!mapInstance) return;
        const currentTheme = themeRef.current;
        
        mapInstance.dragRotate.disable();
        mapInstance.touchZoomRotate.disableRotation();
        if ((mapInstance as any).dragPitch) (mapInstance as any).dragPitch.disable();
        
        // --- Force purely 2D layout and strip unnecessary artifacts ---
        const layers = mapInstance.getStyle()?.layers || [];
        for (const layer of layers) {
            if (
                layer.id.includes('poi') || 
                layer.id.includes('building') || 
                layer.id.includes('park') ||
                layer.id.includes('landuse') ||
                layer.type === 'fill-extrusion'
            ) {
                 mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        }
        
        // --- Sources Initialization ---
        if (!mapInstance.getSource('route')) {
            mapInstance.addSource('route', {
                'type': 'geojson',
                'lineMetrics': true,
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });
        }
        
        // --- Layers ---
        if (!mapInstance.getLayer('route-base')) {
            mapInstance.addLayer({
                'id': 'route-base',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 
                    'line-color': currentTheme === 'dark' ? '#333333' : '#d1d5db',
                    'line-width': 5, 
                    'line-opacity': 1
                }
            });
        }
        
        if (!mapInstance.getLayer('route-animation')) {
            mapInstance.addLayer({
                'id': 'route-animation',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 
                    'line-width': 5,
                    // Inicializamos con un gradiente vacío para evitar warnings
                    'line-gradient': [
                        'step',
                        ['line-progress'],
                        'transparent',
                        1, 'transparent'
                    ]
                }
            });
        }

        setStyleLoadedCount(c => c + 1);
    });

    // Start snake animation loop
    let progress = 0;
    let animationId: number;
    const animateRoute = () => {
        if (!map.current) return;
        
        // El snake avanza
        progress += 0.005;
        if (progress > 1.2) progress = 0;

        try {
            if (map.current.getStyle() && map.current.getLayer('route-animation')) {
                const start = progress - 0.15; // El snake ocupa 15% de la ruta
                const end = progress;
                
                const currentTheme = themeRef.current;
                const snakeColor = currentTheme === 'dark' ? '#FFFFFF' : '#000000';
                const transparent = 'rgba(0,0,0,0)';
                
                // Generamos array estrictamente creciente para Mapbox 'step'
                const gradient: any[] = [
                    'step',
                    ['line-progress'],
                    transparent
                ];
                
                if (start > 0) {
                    gradient.push(start, snakeColor);
                } else {
                    gradient[2] = snakeColor;
                }
                
                if (end < 1) {
                    gradient.push(end, transparent);
                }

                (map.current as any).setPaintProperty('route-animation', 'line-gradient', gradient);
            }
        } catch(e) {}
        animationId = requestAnimationFrame(animateRoute);
    };
    animateRoute();
    
    return () => {
        cancelAnimationFrame(animationId);
        map.current?.remove();
        map.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Load Porticos & AVO Matrices
  useEffect(() => {
    const syncFinancialData = async () => {
        if (styleLoadedCount === 0 || !map.current) return;
        const mapInstance = map.current;

        // Fetch All Data
        const [porticosRes, matricesRes] = await Promise.all([
          supabase.from('porticos').select('*').eq('is_active', true),
          supabase.from('concession_matrices').select('*').eq('concession_name', 'AVO').eq('category', 3)
        ]);

        if (!map.current || !map.current.getStyle()) return;

        if (!porticosRes.data) return;
        const porticos = porticosRes.data;
        const matrices = matricesRes.data || [];

        // --- 1. Porticos (Markers + Prices) ---
        tollMarkersRef.current.forEach(m => m.remove());
        tollMarkersRef.current = [];

        // USER REQUESTED TO HIDE TOLL ICONS FROM CLIENT UI
        // We still fetch them so we could use them if needed, but we don't render the <div> markers.
        /*
        porticos.forEach((p: any) => {
            // ... (Lógica de renderizado gráfico de pórticos oculta según decisión de diseño)
        });
        */

        // --- 2. AVO Mesh (Lines) ---
        const matrixFeatures = matrices.map(m => {
          const entry = porticos.find(p => p.reference_code === m.entry_portico_ref);
          const exit = porticos.find(p => p.reference_code === m.exit_portico_ref);
          if (entry && exit) {
            return {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[entry.longitude, entry.latitude], [exit.longitude, exit.latitude]] },
              properties: { concession: 'AVO' }
            };
          }
          return null;
        }).filter(Boolean);

        if (!map.current.getSource('avo-mesh')) {
            map.current.addSource('avo-mesh', { type: 'geojson', data: { type: 'FeatureCollection', features: matrixFeatures } as any });
            map.current.addLayer({
                id: 'avo-lines',
                type: 'line',
                source: 'avo-mesh',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 1.5,
                    'line-opacity': 0.1,
                    'line-dasharray': [2, 2]
                }
            });
        } else {
            (map.current.getSource('avo-mesh') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: matrixFeatures } as any);
        }
    };
    syncFinancialData();
  }, [styleLoadedCount, activeTolls, categoryKey, supabase]);

  // 2.5 Render Driver Locations
  useEffect(() => {
    if (styleLoadedCount === 0 || !map.current || !map.current.getStyle()) return;
    const mapInstance = map.current;

    // Track which drivers we still have
    const activeDriverIds = new Set(drivers.map(d => d.id));

    // Remove stale drivers
    Object.keys(driverMarkersRef.current).forEach(id => {
        if (!activeDriverIds.has(id)) {
            driverMarkersRef.current[id].remove();
            delete driverMarkersRef.current[id];
        }
    });

    // Render active drivers
    drivers.forEach(driver => {
        if (driver.currentLatitude === null || driver.currentLongitude === null) return;
        
        const coords: [number, number] = [driver.currentLongitude, driver.currentLatitude];
        const isSelected = selectedDriver?.id === driver.id;

        if (!driverMarkersRef.current[driver.id]) {
            const el = document.createElement('div');
            el.className = `w-8 h-8 rounded-full border-[3px] shadow-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-40 bg-card`;
            
            const dot = document.createElement('div');
            dot.className = `w-3 h-3 rounded-full ${driver.currentOrderId ? 'bg-orange-500' : 'bg-green-500'}`;
            el.appendChild(dot);

            el.onclick = () => onDriverSelect?.(driver.id);

            const marker = new mapboxgl.Marker({ element: el, pitchAlignment: 'map' })
                .setLngLat(coords)
                .addTo(mapInstance);
            
            driverMarkersRef.current[driver.id] = marker;
        } else {
            driverMarkersRef.current[driver.id].setLngLat(coords);
            const el = driverMarkersRef.current[driver.id].getElement();
            const dot = el.firstChild as HTMLDivElement;
            if (dot) dot.className = `w-3 h-3 rounded-full ${driver.currentOrderId ? 'bg-orange-500' : 'bg-green-500'}`;
            
            if (isSelected) {
                el.style.borderColor = 'hsl(var(--foreground))';
                el.style.transform = 'scale(1.2)';
                el.style.zIndex = '50';
            } else {
                el.style.borderColor = 'hsl(var(--border))';
                el.style.transform = 'scale(1)';
                el.style.zIndex = '40';
            }
        }
    });
  }, [styleLoadedCount, drivers, selectedDriver, onDriverSelect]);

  const odMarkersRef = useRef<{origin?: mapboxgl.Marker, destination?: mapboxgl.Marker}>({});

  // 3. Handle Route Update & Bounds & Endpoints
  useEffect(() => {
    if (styleLoadedCount === 0 || !map.current || !map.current.getStyle()) return;
    const mapInstance = map.current;
    
    // Manage origin and destination markers
    if (odMarkersRef.current.origin) odMarkersRef.current.origin.remove();
    if (odMarkersRef.current.destination) odMarkersRef.current.destination.remove();

    if (origin && isValidLngLat(origin)) {
        const el = document.createElement('div');
        el.className = 'w-4 h-4 bg-black dark:bg-white rounded-sm border-2 border-white dark:border-black shadow-lg z-30 relative';
        odMarkersRef.current.origin = new mapboxgl.Marker({ element: el })
            .setLngLat(origin)
            .addTo(mapInstance);
    }
    
    if (destination && isValidLngLat(destination)) {
        const el = document.createElement('div');
        el.className = 'w-4 h-4 bg-black dark:bg-white rounded-sm border-2 border-white dark:border-black shadow-lg z-30 relative';
        odMarkersRef.current.destination = new mapboxgl.Marker({ element: el })
            .setLngLat(destination)
            .addTo(mapInstance);
    }

    if (!route) return;
    const source = mapInstance.getSource('route') as mapboxgl.GeoJSONSource;
    
    if (source && Array.isArray(route.coordinates) && route.coordinates.length > 0) {
      source.setData({ type: 'Feature', properties: {}, geometry: route });
      
      const bounds = new mapboxgl.LngLatBounds();
      route.coordinates.forEach((c: any) => { if (isValidLngLat(c)) bounds.extend(c); });
      if (origin && isValidLngLat(origin)) bounds.extend(origin);
      if (destination && isValidLngLat(destination)) bounds.extend(destination);

      if (!bounds.isEmpty()) {
          mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1500 });
      }
    }
  }, [styleLoadedCount, route, origin, destination]);

  // 4. Style Change Sync
  useEffect(() => {
    if (!map.current) return;
    const style = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c';
    map.current.setStyle(style, { diff: false } as any);
  }, [theme]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapContainer} className="w-full h-full" />
      {styleLoadedCount === 0 && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
