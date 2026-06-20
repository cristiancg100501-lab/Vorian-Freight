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

    const fpsInterval = 1000 / 24; // Throttle to 24 FPS

    const animate = (time: number) => {
      const elapsed = time - lastTime;
      if (elapsed < fpsInterval) {
          frameId = requestAnimationFrame(animate);
          return;
      }
      const deltaTimeMs = elapsed;
      const deltaTime = deltaTimeMs / 16.666; // Normalize to 60fps
      lastTime = time - (elapsed % fpsInterval);

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

  // 1a. Fetch Demand Zones Heatmap
  useEffect(() => {
    if (styleLoadedCount === 0 || !map.current) return;
    
    const fetchDemandZones = async () => {
        try {
            const res = await fetch('/api/demand-zones');
            if (res.ok) {
                const geojson = await res.json();
                const source = map.current?.getSource('demand-zones-source') as mapboxgl.GeoJSONSource;
                if (source) {
                    source.setData(geojson);
                }
            }
        } catch (e) {
            console.error('Failed to fetch demand zones', e);
        }
    };
    
    fetchDemandZones();
    // Refetch every 5 minutes
    const interval = setInterval(fetchDemandZones, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [styleLoadedCount]);

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

    // Mapbox already handles window resizes natively via trackResize: true.
    
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

        if (!mapInstance.getSource('demand-zones-source')) {
            mapInstance.addSource('demand-zones-source', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
            mapInstance.addLayer({
                id: 'demand-zones-heatmap',
                type: 'heatmap',
                source: 'demand-zones-source',
                maxzoom: 15,
                paint: {
                    'heatmap-weight': 1,
                    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
                    'heatmap-color': [
                        'interpolate', ['linear'], ['heatmap-density'],
                        0, 'rgba(239, 68, 68, 0)',
                        0.2, 'rgba(239, 68, 68, 0.2)',
                        0.4, 'rgba(239, 68, 68, 0.4)',
                        0.6, 'rgba(239, 68, 68, 0.6)',
                        0.8, 'rgba(239, 68, 68, 0.8)',
                        1, 'rgba(220, 38, 38, 1)'
                    ],
                    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 15, 40],
                    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 15, 0.5]
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
  // Stringify activeTolls so the effect only runs when the contents actually change,
  // preventing infinite network loops if a new array reference is passed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleLoadedCount, JSON.stringify(activeTolls), categoryKey, supabase]);

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
        if (zoom < 7) return 12;
        if (zoom < 13) return 16;
        return 20;
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
        const isSelected = selectedDriver?.id === driver.id;

        const currentSize = Math.round(getMarkerSize(mapInstance.getZoom()));

        if (!driverMarkersRef.current[driver.id]) {
            const el = document.createElement('div');
            el.className = 'driver-marker';
            el.style.width = `${currentSize}px`;
            el.style.height = `${currentSize}px`;
            
            const container = document.createElement('div');
            container.className = 'w-full h-full flex items-center justify-center relative cursor-pointer';
            
            const dot = document.createElement('div');
            dot.className = 'rounded-full transition-all duration-300 w-full h-full border-[2px] border-white dark:border-[#121212]';
            
            container.appendChild(dot);
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
            const dot = container.firstChild as HTMLDivElement;
            
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

                }
            }
            
            if (dot && container) {
                const isSelected = selectedDriver && String(selectedDriver.id) === String(driver.id);
                
                const colorClass = driver.currentOrderId ? 'bg-blue-500' : 'bg-green-500';
                dot.className = `rounded-full transition-all duration-300 w-full h-full border-[2px] border-white dark:border-[#121212] ${colorClass}`;
                
                if (isSelected) {
                    dot.style.boxShadow = driver.currentOrderId 
                        ? '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 15px #3b82f6'
                        : '0 0 0 4px rgba(34, 197, 94, 0.3), 0 0 15px #22c55e';
                    container.style.transform = 'scale(1.4)';
                    el.style.zIndex = '100';
                } else {
                    dot.style.boxShadow = driver.currentOrderId 
                        ? '0 0 8px rgba(59, 130, 246, 0.6)'
                        : '0 0 8px rgba(34, 197, 94, 0.6)';
                    container.style.transform = 'scale(1)';
                    el.style.zIndex = '50';
                }
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

  // 3d. Interaction lock: disable pan/zoom only in full-screen mission control mode (when drivers are actively tracked)
  useEffect(() => {
    if (!map.current) return;
    // Only lock interactions if there are drivers to track AND a route is active
    // In the new shipment form (no drivers), always keep interactions enabled
    const hasDrivers = drivers && drivers.length > 0;
    if (route && hasDrivers) {
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
  }, [route, drivers]);

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
        if (styleLoadedCount === 0 || !map.current) return;
        const mapInstance = map.current;

        if (!route) {
          // Clear route when no route is active
          const source = mapInstance.getSource('route') as mapboxgl.GeoJSONSource;
          const snakeSource = mapInstance.getSource('route-snake') as mapboxgl.GeoJSONSource;
          if (source) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
          if (snakeSource) snakeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
          return;
        }
        
        // Retry up to 10 times if style isn't loaded yet
        const tryDraw = (attempt: number) => {
          if (!map.current) return;
          const mapInst = map.current;
          const source = mapInst.getSource('route') as mapboxgl.GeoJSONSource;
          const snakeSource = mapInst.getSource('route-snake') as mapboxgl.GeoJSONSource;

          if (!source || !snakeSource) {
            if (attempt < 10) setTimeout(() => tryDraw(attempt + 1), 200);
            return;
          }

          if (source && Array.isArray(route.coordinates) && route.coordinates.length > 0) {
              source.setData({ type: 'Feature', properties: {}, geometry: route });
              
              const bounds = new mapboxgl.LngLatBounds();
              route.coordinates.forEach((c: any) => { if (isValidLngLat(c)) bounds.extend(c); });
              if (origin && isValidLngLat(origin)) bounds.extend(origin);
              if (destination && isValidLngLat(destination)) bounds.extend(destination);

              if (!bounds.isEmpty()) {
                  mapInst.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 2200 });
              }

              // --- SNAKE ANIMATION: coordinate-slice approach (zero turf per frame) ---
              if (snakeSource) {
                  const coords = route.coordinates as [number, number][];
                  const n = coords.length;
                  if (n < 2) return;

                  // 1. Pre-compute cumulative distances in ONE pass (O(n), runs instantly)
                  const cumDist = new Float64Array(n);
                  const toRad = (d: number) => d * Math.PI / 180;
                  for (let i = 1; i < n; i++) {
                      const [lng1, lat1] = coords[i - 1];
                      const [lng2, lat2] = coords[i];
                      const dLat = toRad(lat2 - lat1);
                      const dLng = toRad(lng2 - lng1);
                      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
                      cumDist[i] = cumDist[i-1] + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  }
                  const totalDist = cumDist[n - 1];
                  const TAIL_KM = Math.max(1, totalDist * 0.25);

                  // Binary search: find coord index where cumDist >= targetKm
                  const findIdx = (targetKm: number): number => {
                      let lo = 0, hi = n - 1;
                      while (lo < hi) {
                          const mid = (lo + hi) >> 1;
                          if (cumDist[mid] < targetKm) lo = mid + 1;
                          else hi = mid;
                      }
                      return lo;
                  };

                  // 2. ANIMATE at 60fps — only binary search + array slice per frame
                  const DURATION_MS = 1800;
                  let startTimestamp: number | null = null;

                  const animateSnake = (timestamp: number) => {
                      if (!startTimestamp) startTimestamp = timestamp;
                      const elapsed = timestamp - startTimestamp;
                      const progress = Math.min(elapsed / DURATION_MS, 1);

                      const headKm = progress * totalDist;
                      const tailKm = Math.max(0, headKm - TAIL_KM);

                      const headIdx = Math.min(findIdx(headKm), n - 1);
                      const tailIdx = findIdx(tailKm);

                      const sliceCoords = tailIdx <= headIdx
                          ? coords.slice(tailIdx, headIdx + 1)
                          : [];

                      snakeSource.setData({
                          type: 'Feature',
                          properties: {},
                          geometry: { type: 'LineString', coordinates: sliceCoords.length >= 2 ? sliceCoords : [] }
                      });

                      if (progress < 1) {
                          snakeAnimationId = requestAnimationFrame(animateSnake);
                      } else {
                          // Hold the full route visible
                          snakeSource.setData({ type: 'Feature', properties: {}, geometry: route });
                      }
                  };
                  snakeAnimationId = requestAnimationFrame(animateSnake);
              }
          }
        };

        tryDraw(0);
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
