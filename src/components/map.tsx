"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface MapProps {
    drivers: any[] | null;
    selectedDriver?: any | null;
    route?: any | null;
    origin?: [number, number] | null;
    destination?: [number, number] | null;
    activeTollNames?: string[];
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

const VorianMap = ({ drivers, selectedDriver, route, origin, destination, activeTollNames = [], onDriverSelect }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const targetsRef = useRef<Map<string, { lng: number, lat: number, heading: number }>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const animateRef = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);

  const stopAnimation = () => {
    if (animateRef.current) {
        cancelAnimationFrame(animateRef.current);
        animateRef.current = null;
    }
  };

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c',
      center: [-70.6693, -33.4489], 
      zoom: 11,
    });
    
    const mapInstance = map.current;

    mapInstance.on('load', () => {
        mapInstance.dragRotate.disable();
        mapInstance.touchZoomRotate.disableRotation();
        
        if (!mapInstance.getSource('route')) {
            mapInstance.addSource('route', {
                'type': 'geojson',
                'lineMetrics': true,
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });
        }
        
        if (!mapInstance.getLayer('route-base')) {
            mapInstance.addLayer({
                'id': 'route-base',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 
                    'line-color': theme === 'dark' ? '#FFF' : '#000', 
                    'line-width': 6, 
                    'line-opacity': 0.25 
                }
            });
        }
        
        if (!mapInstance.getLayer('route-animation')) {
            mapInstance.addLayer({
                'id': 'route-animation',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-width': 5 }
            });
        }

        setMapReady(true);
    });
    
    return () => {
        stopAnimation();
        map.current?.remove();
        map.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update style on theme change
  useEffect(() => {
    if (!map.current) return;
    const mapStyle = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c';
      
    setMapReady(false);
    map.current.setStyle(mapStyle, { diff: false } as any);
    
    const styleLoadHandler = () => {
        if (!map.current) return;
        const mapInstance = map.current;

        if (!mapInstance.getSource('route')) {
            mapInstance.addSource('route', {
                'type': 'geojson',
                'lineMetrics': true,
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });
        }
        
        if (!mapInstance.getLayer('route-base')) {
            mapInstance.addLayer({
                'id': 'route-base',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 
                    'line-color': theme === 'dark' ? '#FFF' : '#000',
                    'line-width': 6,
                    'line-opacity': 0.25
                }
            });
        }
        
        if (!mapInstance.getLayer('route-animation')) {
            mapInstance.addLayer({
                'id': 'route-animation',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-width': 5 }
            });
        }
        setMapReady(true);
    };

    map.current.on('style.load', styleLoadHandler);
      
    // Start the Uber-Style Animation Loop
    const animate = () => {
        markersRef.current.forEach((marker, id) => {
            const target = targetsRef.current.get(id);
            if (!target) return;

            const current = marker.getLngLat();
            
            // Interpolación de posición (Lerp)
            // Movemos un 10% de la distancia restante en cada frame para suavidad total
            const deltaLng = (target.lng - current.lng);
            const deltaLat = (target.lat - current.lat);
            
            if (Math.abs(deltaLng) > 0.000001 || Math.abs(deltaLat) > 0.000001) {
                marker.setLngLat([
                    current.lng + deltaLng * 0.2,
                    current.lat + deltaLat * 0.2
                ]);
            }

            // Solo interpolamos posición, quitamos la rotación
            const el = marker.getElement();
            const body = el.querySelector('.driver-marker-body') as HTMLElement;
            if (body) {
                body.style.transform = ''; // Reset transform
            }
        });

        animateRef.current = requestAnimationFrame(animate);
    };
    
    animateRef.current = requestAnimationFrame(animate);
      
    return () => {
      stopAnimation();
      if (map.current?.getStyle()) {
        map.current.off('style.load', styleLoadHandler);
      }
    }
      
  }, [theme]);
  
  // VORIAN GEO-INTELLIGENCE: Load Porticos from Supabase
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const mapInstance = map.current;

    const syncPorticosFromSupa = async () => {
        try {
            const { data, error } = await supabase.from('porticos').select('name, location');
            if (error || !data) return;
            
            // Check if map still exists and is ready for layers (prevents crash during style transitions)
            if (!map.current || !map.current.isStyleLoaded()) return;

            const features = data.map((p: any) => {
                let geometry = p.location;
                if (typeof geometry === 'string' && geometry.includes('POINT')) {
                    const coords = geometry.match(/-?\d+(\.\d+)?/g);
                    if (coords && coords.length >= 2) {
                        geometry = { type: 'Point', coordinates: [parseFloat(coords[0]), parseFloat(coords[1])] };
                    }
                }
                const isActive = Array.isArray(activeTollNames) && activeTollNames.includes(p.name);
                return {
                    type: 'Feature',
                    geometry: geometry,
                    properties: { 
                        name: p.name,
                        isActive: isActive
                    }
                };
            }).filter(f => f.geometry && typeof f.geometry === 'object');

            const geoData = { type: 'FeatureCollection', features };

            if (!mapInstance.getSource('porticos-source')) {
                mapInstance.addSource('porticos-source', { type: 'geojson', data: geoData as any });

                mapInstance.addLayer({
                    id: 'porticos-layer',
                    type: 'circle',
                    source: 'porticos-source',
                    paint: {
                        'circle-radius': ['case', ['get', 'isActive'], 8, 5],
                        'circle-color': ['case', ['get', 'isActive'], '#facc15', '#ef4444'],
                        'circle-stroke-width': ['case', ['get', 'isActive'], 3, 1.5],
                        'circle-stroke-color': '#ffffff'
                    }
                });

                mapInstance.addLayer({
                    id: 'porticos-labels',
                    type: 'symbol',
                    source: 'porticos-source',
                    layout: {
                        'text-field': ['get', 'name'],
                        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                        'text-offset': [0, 1.2],
                        'text-anchor': 'top',
                        'text-size': ['case', ['get', 'isActive'], 12, 10]
                    },
                    paint: {
                        'text-color': ['case', ['get', 'isActive'], '#facc15', (theme === 'dark' ? '#ffffff' : '#000000')],
                        'text-halo-color': theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                        'text-halo-width': 1
                    }
                });
            } else {
                (mapInstance.getSource('porticos-source') as mapboxgl.GeoJSONSource).setData(geoData as any);
            }
        } catch (err) {
            console.error("Supabase Map Sync Error:", err);
        }
    };

    syncPorticosFromSupa();
  }, [mapReady, theme, activeTollNames]);

  // Update route and markers
  useEffect(() => {
    // ACTUALIZACIÓN DE OBJETIVOS (Siempre debe correr para evitar lag)
    if (drivers) {
        drivers.forEach(driver => {
            if (!isValidLngLat([driver.currentLongitude, driver.currentLatitude])) return;
            targetsRef.current.set(driver.id, {
                lng: driver.currentLongitude,
                lat: driver.currentLatitude,
                heading: driver.heading || 0
            });
        });
    }

    if (!map.current || !mapReady || !map.current.isStyleLoaded()) return;

    const mapInstance = map.current;
    // Detener solo la animación de la ruta, no la de los conductores
    if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
    }
    
    // markersRef is handled in the optimized management block below
    // markersRef.current.forEach(marker => marker.remove());
    // markersRef.current = [];
    
    if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
    }

    const bounds = new mapboxgl.LngLatBounds();
    const source = mapInstance.getSource('route') as mapboxgl.GeoJSONSource;

    if (source && route && Array.isArray(route.coordinates) && route.coordinates.length > 1) {
        source.setData({
            type: 'Feature',
            properties: {},
            geometry: route,
        });
        for (const coord of route.coordinates) {
            if (isValidLngLat(coord)) {
                bounds.extend(coord);
            }
        }
        
        let startTime = 0;
        const duration = 1500;
        const snakeLength = 0.3;
        const lineColor = theme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';

        const animate = (timestamp: number) => {
            if (!animationFrameId.current) return;
            if (!startTime) startTime = timestamp;
            const progress = (timestamp - startTime) % duration;
            const animationProgress = progress / duration;
            const head = animationProgress;
            const tail = Math.max(0, head - snakeLength);
            
            if (mapInstance && mapInstance.getLayer('route-animation')) {
                const p1 = Math.max(0, tail);
                const p2 = Math.max(p1 + 0.001, head - 0.001);
                const p3 = Math.max(p2 + 0.001, head);

                mapInstance.setPaintProperty('route-animation', 'line-gradient', [
                    'step', ['line-progress'], 'rgba(0,0,0,0)',
                    p1, 'rgba(0,0,0,0)',
                    p1 + 0.0001, lineColor,
                    p2, lineColor,
                    p3, 'rgba(0,0,0,0)'
                ]);
            }
            animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);
    } else if (source) {
        source.setData({ 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } });
    }
    
    // --- OPTIMIZED MARKER MANAGEMENT ---
    if (drivers) {
        const activeDriverIds = new Set(drivers.map(d => d.id));
        
        // 1. Remove markers for drivers no longer in the list
        markersRef.current.forEach((marker, id) => {
            if (!activeDriverIds.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // 2. Update or Create marker targets
        drivers.forEach(driver => {
            if (!isValidLngLat([driver.currentLongitude, driver.currentLatitude])) return;

            const markerId = driver.id;
            const heading = driver.heading || 0;
            const isSelected = selectedDriver?.id === markerId;
            
            let marker = markersRef.current.get(markerId);

            if (marker) {
                // ACTUALIZAR ESTADO VISUAL (Selección)
                const el = marker.getElement();
                const body = el.querySelector('.driver-marker-body') as HTMLElement;
                if (body) {
                    body.className = `driver-marker-body relative w-5 h-5 rounded-full border-2 border-background shadow-lg flex items-center justify-center ${
                      isSelected ? "bg-primary scale-125 z-50 ring-4 ring-primary/30" : "bg-primary"
                    }`;
                }
            } else {
                // CREAR NUEVO MARCADOR SI NO EXISTE
                const el = document.createElement('div');
                el.className = 'w-6 h-6 flex items-center justify-center';
                
                const body = document.createElement('div');
                body.className = `driver-marker-body relative w-5 h-5 rounded-full border-2 border-background shadow-lg flex items-center justify-center ${
                    isSelected ? "bg-primary scale-125 z-50 ring-4 ring-primary/30" : "bg-primary"
                }`;
                
                el.appendChild(body);
                
                el.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (onDriverSelect) onDriverSelect(driver.id);
                });

                const newMarker = new mapboxgl.Marker(el)
                  .setLngLat([driver.currentLongitude, driver.currentLatitude])
                  .addTo(mapInstance);
                  
                markersRef.current.set(markerId, newMarker);
            }
        });
    } else {
        // Clear all if no drivers
        markersRef.current.forEach(m => m.remove());
        markersRef.current.clear();
    }

    if (isValidLngLat(origin)) {
        const originEl = document.createElement('div');
        originEl.className = 'w-3 h-3 bg-background border-2 border-foreground shadow-md';
        new mapboxgl.Marker(originEl).setLngLat(origin).addTo(mapInstance);
        bounds.extend(origin);
    }
    if (isValidLngLat(destination)) {
        const destEl = document.createElement('div');
        destEl.className = 'w-3 h-3 bg-foreground border-2 border-background shadow-md';
        new mapboxgl.Marker(destEl).setLngLat(destination).addTo(mapInstance);
        bounds.extend(destination);
    }

    if (!bounds.isEmpty() && !selectedDriver) {
        mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 500 });
    }

    if (selectedDriver && isValidLngLat([selectedDriver.currentLongitude, selectedDriver.currentLatitude])) {
        mapInstance.flyTo({ center: [selectedDriver.currentLongitude, selectedDriver.currentLatitude], zoom: 15, duration: 1000 });
    }

    return () => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    };
  }, [mapReady, drivers, selectedDriver, route, origin, destination, theme]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden relative bg-muted">
        <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

export default VorianMap;
