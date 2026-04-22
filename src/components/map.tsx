"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { useSupabase } from "@/components/providers/supabase-provider";

import truckDark from "@/assets/truck.png";
import truckLight from "@/assets/truck2.png";

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
  const driverAnimStatesRef = useRef<{ [id: string]: { current: [number, number], target: [number, number] } }>({});
  const breadcrumbsRef = useRef<[number, number][]>([]);
  const { supabase } = useSupabase();
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const [styleLoadedCount, setStyleLoadedCount] = useState(0);

  // Animation loop for smooth driver movement (Advanced Velocity-Based)
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const deltaTimeMs = time - lastTime;
      const deltaTime = deltaTimeMs / 16.666; // Normalize to 60fps
      lastTime = time;

      Object.entries(driverAnimStatesRef.current).forEach(([id, state]) => {
        const marker = driverMarkersRef.current[id];
        if (!marker) return;

        // --- CONSTANT VELOCITY GLIDE ---
        const deltaLng = state.target[0] - state.current[0];
        const deltaLat = state.target[1] - state.current[1];
        const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);

        if (distance < 0.000001) {
            state.current = [state.target[0], state.target[1]];
        } else {
            // We want to cover the distance in ~1000ms (the expected update interval)
            const speedPerFrame = (distance / (1000 / 16.666)) * 1.2; 
            const moveStep = speedPerFrame * deltaTime;
            
            const ratio = Math.min(moveStep / distance, 1.0);
            const nextLng = state.current[0] + deltaLng * ratio;
            const nextLat = state.current[1] + deltaLat * ratio;
            state.current = [nextLng, nextLat];
        }
        
        marker.setLngLat(state.current);
      });

      // --- Update Breadcrumb Visuals ---
      if (map.current && map.current.isStyleLoaded() && map.current.getSource('breadcrumbs-source')) {
         const source = map.current.getSource('breadcrumbs-source') as mapboxgl.GeoJSONSource;
         source.setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: breadcrumbsRef.current },
            properties: {}
         });
      }

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

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

        if (!mapInstance.getSource('breadcrumbs-source')) {
            mapInstance.addSource('breadcrumbs-source', {
                'type': 'geojson',
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });
            mapInstance.addLayer({
                'id': 'breadcrumbs-layer',
                'type': 'line',
                'source': 'breadcrumbs-source',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': {
                    'line-color': '#22c55e', // Strong green
                    'line-width': 2,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 1]
                }
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
            if (map.current.isStyleLoaded() && map.current.getLayer('route-animation')) {
                const start = progress - 0.15; // El snake ocupa 15% de la ruta
                const end = progress;
                
                const currentTheme = themeRef.current;
                const snakeColor = currentTheme === 'dark' ? '#FFFFFF' : '#000000';
                const transparent = 'rgba(0,0,0,0)';
                
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

        const [porticosRes, matricesRes] = await Promise.all([
          supabase.from('porticos').select('*').eq('is_active', true),
          supabase.from('concession_matrices').select('*').eq('concession_name', 'AVO').eq('category', 3)
        ]);

        if (!map.current || !map.current.isStyleLoaded()) return;

        if (!porticosRes.data) return;
        const porticos = porticosRes.data;
        const matrices = matricesRes.data || [];

        tollMarkersRef.current.forEach(m => m.remove());
        tollMarkersRef.current = [];

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
    if (styleLoadedCount === 0 || !map.current || !map.current.isStyleLoaded()) return;
    const mapInstance = map.current;

    const activeDriverIds = new Set(drivers.map(d => d.id));

    // Remove stale drivers
    if (activeDriverIds.size > 0) {
        Object.keys(driverMarkersRef.current).forEach(id => {
            if (!activeDriverIds.has(id)) {
                driverMarkersRef.current[id].remove();
                delete driverMarkersRef.current[id];
                delete driverAnimStatesRef.current[id];
            }
        });
    }

    const getMarkerSize = (zoom: number) => {
        // --- STABLE TWO-STAGE SCALING ---
        // 1. DISTANT (Zoom < 14): Fixed 140px floor. Uber-style visibility.
        // 2. CLOSE (Zoom >= 14): Linear growth to match map detail.
        const floor = 140;
        if (zoom < 14) return floor;
        
        const growth = (zoom - 14) * 65; 
        return Math.min(floor + growth, 450); // Hard cap at 450px for extreme detail
    };

    const updateMarkerSizes = () => {
        if (!map.current) return;
        const zoom = map.current.getZoom();
        const newSize = Math.round(getMarkerSize(zoom));
        
        Object.values(driverMarkersRef.current).forEach(marker => {
            const el = marker.getElement();
            const currentW = parseInt(el.style.width);
            if (currentW !== newSize) {
                el.style.width = `${newSize}px`;
                el.style.height = `${newSize}px`;
            }
        });
    };

    mapInstance.on('zoom', updateMarkerSizes);

    // Render drivers
    drivers.forEach(driver => {
        if (driver.currentLatitude === null || driver.currentLongitude === null) return;
        
        const lat = Number(driver.currentLatitude);
        const lng = Number(driver.currentLongitude);
        const coords: [number, number] = [lng, lat];
        const heading = driver.heading || 0;
        const isSelected = selectedDriver?.id === driver.id;

        const currentTheme = themeRef.current;
        const truckImgSrc = currentTheme === 'dark' ? truckDark.src : truckLight.src;
        const currentSize = Math.round(getMarkerSize(mapInstance.getZoom()));

        if (!driverMarkersRef.current[driver.id]) {
            const el = document.createElement('div');
            el.className = 'driver-marker';
            el.style.width = `${currentSize}px`;
            el.style.height = `${currentSize}px`;
            
            const container = document.createElement('div');
            // Cleaned class: removed group and transition-500 to keep it crisp
            container.className = 'w-full h-full flex items-center justify-center relative cursor-pointer';
            
            const statusColor = driver.currentOrderId ? '#f97316' : '#22c55e';
            const img = document.createElement('img');
            img.src = truckImgSrc;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.transform = `rotate(${heading - 90}deg)`;
            img.style.transition = 'transform 0.4s ease-out';
            img.style.filter = `drop-shadow(0 0 10px ${statusColor})`;
            
            container.appendChild(img);
            el.appendChild(container);
            
            container.onclick = () => onDriverSelect?.(driver.id);

            const marker = new mapboxgl.Marker({ element: el, pitchAlignment: 'map', rotationAlignment: 'map' })
                .setLngLat(coords)
                .addTo(mapInstance);
            
            driverMarkersRef.current[driver.id] = marker;
            driverAnimStatesRef.current[driver.id] = { current: [...coords], target: [...coords] };
        } else {
            const el = driverMarkersRef.current[driver.id].getElement();
            const container = el.firstChild as HTMLDivElement;
            const img = container.firstChild as HTMLImageElement;
            
            // Stable sizing: only update DOM if values changed significantly
            const sizeInt = Math.round(currentSize);
            if (parseInt(el.style.width) !== sizeInt) {
                el.style.width = `${sizeInt}px`;
                el.style.height = `${sizeInt}px`;
            }

            if (driverAnimStatesRef.current[driver.id]) {
                const prevTarget = driverAnimStatesRef.current[driver.id].target;
                if (prevTarget[0] !== coords[0] || prevTarget[1] !== coords[1]) {
                    driverAnimStatesRef.current[driver.id].target = coords;
                    if (isSelected) {
                        breadcrumbsRef.current.push(coords);
                        if (breadcrumbsRef.current.length > 20) breadcrumbsRef.current.shift();
                    }
                }
            }
            
            if (img && container) {
                // Neutralized Colors: Slate-Gray for Available, Orange for Route
                // This eliminates the "everything is green" complaint.
                const statusColor = driver.currentOrderId ? '#f97316' : '#94a3b8';
                const isSelected = selectedDriver && String(selectedDriver.id) === String(driver.id);
                
                img.src = truckImgSrc;
                img.style.transform = `rotate(${heading - 90}deg)`;
                
                // Selection highlight: Sharp High-Contrast Glow
                // Idle highlight: Subtle Status Halo
                const glowColor = currentTheme === 'dark' ? 'white' : 'black';
                const currentFilter = isSelected 
                    ? `drop-shadow(0 0 2px ${glowColor}) drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 20px ${glowColor})` 
                    : `drop-shadow(0 0 4px ${statusColor})`;
                
                if (img.style.filter !== currentFilter) {
                    img.style.filter = currentFilter;
                }

                // Snappy z-index and scale transitions
                container.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
                el.style.zIndex = isSelected ? '100' : '50';
            }
        }
    });

    return () => {
        mapInstance.off('zoom', updateMarkerSizes);
    };
  }, [styleLoadedCount, drivers, selectedDriver, onDriverSelect, theme]);

  const odMarkersRef = useRef<{origin?: mapboxgl.Marker, destination?: mapboxgl.Marker}>({});

  // 3. Handle Route Update & Bounds & Endpoints
  useEffect(() => {
    if (styleLoadedCount === 0 || !map.current || !map.current.isStyleLoaded()) return;
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
