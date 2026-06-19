"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from '@turf/turf';
import { useTheme } from "next-themes";
import { useSupabase } from "@/components/providers/supabase-provider";

import truckDark from "@/assets/truck.png";
import truckLight from "@/assets/truck2.png";
import truck3 from "@/assets/truck3.svg";

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
  const resizeRafRef = useRef<number | null>(null); // RAF throttle for resize
  const odMarkersRef = useRef<{origin?: mapboxgl.Marker, destination?: mapboxgl.Marker}>({});
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
      style: theme === 'dark' ? 'mapbox://styles/vorianglobal/cmqivdlco006p01r34g0lhrmv' : 'mapbox://styles/vorianglobal/cmqiz50lq004601s65k48addr',
      center: [-70.6693, -33.4489], 
      zoom: 11,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false,
      projection: { name: 'mercator' } as any,
      trackResize: true
    });

    // Handle container resizing with RAF throttling for smooth sidebar transitions
    const resizeObserver = new ResizeObserver(() => {
      // If a resize is already scheduled for this frame, skip — avoids
      // dozens of map.resize() calls during the sidebar's CSS transition.
      if (resizeRafRef.current !== null) return;
      resizeRafRef.current = requestAnimationFrame(() => {
        if (map.current) map.current.resize();
        resizeRafRef.current = null;
      });
    });
    
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }
    
    map.current.on('style.load', () => {
        const mapInstance = map.current;
        if (!mapInstance) return;
        
        // Disable all forms of rotation and pitch for a strictly 2D experience
        mapInstance.dragRotate.disable();
        mapInstance.touchZoomRotate.disableRotation();
        mapInstance.keyboard.disable(); // Prevents arrow key pitching/rotation
        
        // Ensure no 3D atmosphere or terrain is present
        if (mapInstance.getStyle().layers) {
            (mapInstance as any).setAtmosphere?.(null);
        }

        
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
        if (!mapInstance.getSource('route-snake')) {
            mapInstance.addSource('route-snake', {
                'type': 'geojson',
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
        
        const currentTheme = themeRef.current;
        
        // --- Layers ---
        if (!mapInstance.getLayer('route-base')) {
            // Fondo de la ruta completo (tenue)
            mapInstance.addLayer({
                'id': 'route-base',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 
                    'line-color': currentTheme === 'dark' ? '#333333' : '#d1d5db',
                    'line-width': 4, 
                    'line-opacity': 0.5
                }
            });
        }

        if (!mapInstance.getLayer('route-snake-glow')) {
            // Capa de resplandor (Glow) de la serpiente
            mapInstance.addLayer({
                'id': 'route-snake-glow',
                'type': 'line',
                'source': 'route-snake',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 
                    'line-color': 'hsl(350, 93%, 73%)',
                    'line-width': 12,
                    'line-blur': 10,
                    'line-opacity': 0.5
                }
            });
        }
        
        if (!mapInstance.getLayer('route-snake-base')) {
            // Capa principal láser de la serpiente
            mapInstance.addLayer({
                'id': 'route-snake-base',
                'type': 'line',
                'source': 'route-snake',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 
                    'line-color': 'hsl(350, 93%, 73%)',
                    'line-width': 4, 
                    'line-opacity': 1
                }
            });
        }

        setStyleLoadedCount(c => c + 1);
    });
    
    return () => {
        resizeObserver.disconnect();
        if (resizeRafRef.current !== null) {
          cancelAnimationFrame(resizeRafRef.current);
          resizeRafRef.current = null;
        }
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
    
    const safeDrivers = drivers || [];
    const activeDriverIds = new Set(safeDrivers.map(d => d.id));

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
        // --- ADAPTIVE MULTI-STAGE SCALING ---
        // Stage 1: Macro View (Zoom < 7) - Small markers for global context
        if (zoom < 7) {
            const progress = zoom / 7;
            return 32 + (48 - 32) * progress;
        }
        
        // Stage 2: Regional View (7 <= Zoom < 13) - Scaling up to standard size
        if (zoom < 13) {
            const progress = (zoom - 7) / (13 - 7);
            return 48 + (120 - 48) * progress;
        }

        // Stage 3: Tactical View (Zoom >= 13) - Large markers for street detail
        const progress = Math.min((zoom - 13) / (20 - 13), 1);
        return 120 + (380 - 120) * progress;
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
    safeDrivers.forEach(driver => {
        if (driver.currentLatitude === null || driver.currentLongitude === null) return;
        
        const lat = Number(driver.currentLatitude);
        const lng = Number(driver.currentLongitude);
        const coords: [number, number] = [lng, lat];
        const heading = driver.heading || 0;
        const isSelected = selectedDriver?.id === driver.id;

        const currentTheme = themeRef.current;
        const truckImgSrc = truck3.src;
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
            // Rotation normalization: phone heading is 0=North. 
            // Truck asset is facing East (90 deg) usually. Adjustment ensures correct orientation.
            img.style.transform = `rotate(${heading}deg)`;
            img.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            img.style.filter = `drop-shadow(0 0 10px ${statusColor})`;
            
            container.appendChild(img);
            el.appendChild(container);
            
            container.onclick = () => onDriverSelect?.(driver.id);

            const marker = new mapboxgl.Marker({ element: el, pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
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
                const statusColor = driver.currentOrderId ? '#f97316' : '#a3a3a3';
                const isSelected = selectedDriver && String(selectedDriver.id) === String(driver.id);
                
                img.src = truckImgSrc;
                img.style.transform = `rotate(${heading}deg)`;
                
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

  // 3a. Markers: Place origin/destination markers as soon as coords are available.
  // NOTE: Mapbox markers are DOM-based — they do NOT need isStyleLoaded().
  // Only guard against styleLoadedCount===0 to ensure the map instance exists.
  useEffect(() => {
    if (styleLoadedCount === 0 || !map.current) return;
    const mapInstance = map.current;

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
  }, [styleLoadedCount, origin, destination]);

  // 3d. Interaction lock: disable pan/zoom when a route is active (view-only mode).
  useEffect(() => {
    if (!map.current) return;
    if (route) {
      map.current.dragPan.disable();
      map.current.scrollZoom.disable();
      map.current.doubleClickZoom.disable();
      map.current.touchZoomRotate.disable();
      map.current.keyboard.disable();
    } else {
      map.current.dragPan.enable();
      map.current.scrollZoom.enable();
      map.current.doubleClickZoom.enable();
      map.current.touchZoomRotate.enable();
      map.current.keyboard.enable();
    }
  }, [route]);

  // 3b. Camera: FlyTo origin when only point 1 is set.
  //     FitBounds is handled in the route effect (3c) when point 2 + route arrive.
  useEffect(() => {
    if (styleLoadedCount === 0 || !map.current) return;
    // Only fly to origin when there's no destination yet
    if (origin && isValidLngLat(origin) && !destination) {
      map.current.flyTo({
        center: origin,
        zoom: 13,
        duration: 1600,
        essential: true,
        curve: 1.4,
      });
    }
  }, [origin, destination, styleLoadedCount]);

  // 3c. Route: Draw route line + fitBounds when both points and route are ready
  useEffect(() => {
    let snakeAnimationId: number | null = null;
    try {
        if (styleLoadedCount === 0 || !map.current || !map.current.isStyleLoaded()) return;
        const mapInstance = map.current;

        if (!route) return;
        
        // Comprobar la fuente de manera segura
        if (!mapInstance.getSource('route')) return;
        const source = mapInstance.getSource('route') as mapboxgl.GeoJSONSource;
        const snakeSource = mapInstance.getSource('route-snake') as mapboxgl.GeoJSONSource;
        
        if (source && Array.isArray(route.coordinates) && route.coordinates.length > 0) {
            source.setData({ type: 'Feature', properties: {}, geometry: route });
            
            const bounds = new mapboxgl.LngLatBounds();
            route.coordinates.forEach((c: any) => { if (isValidLngLat(c)) bounds.extend(c); });
            if (origin && isValidLngLat(origin)) bounds.extend(origin);
            if (destination && isValidLngLat(destination)) bounds.extend(destination);

            if (!bounds.isEmpty()) {
                mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 2200 });
            }

            // --- ANIMACION TURF SNAKE ---
            if (snakeSource) {
                const routeLine = turf.lineString(route.coordinates);
                const totalLength = turf.length(routeLine, { units: 'kilometers' });
                
                let startTimestamp: number | null = null;
                const DURATION = 2000;
                const TAIL_LENGTH = Math.max(2, totalLength * 0.25);
                
                const animateSnake = (timestamp: number) => {
                    if (!startTimestamp) startTimestamp = timestamp;
                    const progress = (timestamp - startTimestamp) / DURATION;
                    
                    if (progress <= 1.2) {
                        const currentDistance = progress * totalLength;
                        const startDistance = Math.max(0, currentDistance - TAIL_LENGTH);
                        
                        try {
                            if (currentDistance > startDistance) {
                                const sliceEnd = Math.min(currentDistance, totalLength);
                                const sliceStart = Math.min(startDistance, totalLength);
                                
                                if (sliceEnd > sliceStart) {
                                    const segment = turf.lineSliceAlong(routeLine, sliceStart, sliceEnd, { units: 'kilometers' });
                                    snakeSource.setData(segment);
                                } else {
                                    snakeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
                                }
                            }
                        } catch (e) {}
                        snakeAnimationId = requestAnimationFrame(animateSnake);
                    } else {
                        startTimestamp = timestamp;
                        snakeAnimationId = requestAnimationFrame(animateSnake);
                    }
                };
                snakeAnimationId = requestAnimationFrame(animateSnake);
            }
        }
    } catch (e) {
        console.error("Vorian Map Route Engine Error:", e);
    }

    return () => {
        if (snakeAnimationId) cancelAnimationFrame(snakeAnimationId);
    };
  }, [styleLoadedCount, route, origin, destination]);

  // 4. Style Change Sync
  useEffect(() => {
    if (!map.current) return;
    const style = theme === 'dark' ? 'mapbox://styles/vorianglobal/cmqivdlco006p01r34g0lhrmv' : 'mapbox://styles/vorianglobal/cmqiz50lq004601s65k48addr';
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
