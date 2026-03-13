"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface MapProps {
    drivers: any[] | null;
    route?: any | null;
    origin?: [number, number] | null;
    destination?: [number, number] | null;
}

const isValidLngLat = (coords: any): coords is [number, number] => {
    return (
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === 'number' &&
        !isNaN(coords[0]) &&
        typeof coords[1] === 'number' &&
        !isNaN(coords[1])
    );
};

const Map = ({ drivers, route, origin, destination }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    if (mapboxgl.accessToken === "YOUR_MAPBOX_ACCESS_TOKEN" || !mapboxgl.accessToken) {
        console.error("Mapbox access token is not set. Please set it in src/components/map.tsx");
        if (mapContainer.current) {
            mapContainer.current.innerHTML = `<div class="flex items-center justify-center h-full bg-muted text-muted-foreground"><p>Mapbox access token is not set.</p></div>`;
        }
        return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
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
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });
        }
        
        if (!mapInstance.getLayer('route')) {
            mapInstance.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-color': theme === 'dark' ? '#FFFFFF' : '#000000', 'line-width': 5, 'line-opacity': 0.75 }
            });
        }
        setMapReady(true);
    });
    
    return () => {
        map.current?.remove();
        map.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map style based on theme
  useEffect(() => {
      if (!map.current) return;
      const mapStyle = theme === 'dark' 
        ? 'mapbox://styles/mapbox/dark-v11' 
        : 'mapbox://styles/mapbox/light-v11';
      
      const styleLoadHandler = () => {
        if (!map.current) return;
        
        if (!map.current.getSource('route')) {
            map.current.addSource('route', {
                'type': 'geojson',
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });
        }
        
        if (!map.current.getLayer('route')) {
            map.current.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-color': theme === 'dark' ? '#FFFFFF' : '#000000', 'line-width': 5, 'line-opacity': 0.75 }
            });
        }
        setMapReady(true);
      };

      map.current.on('style.load', styleLoadHandler);
      setMapReady(false);
      map.current.setStyle(mapStyle, { 
        diff: false, 
        localFontFamily: undefined, 
        localIdeographFontFamily: undefined 
      });
      
      return () => {
        if (map.current?.getStyle()) { // check if map still exists and is usable
          map.current.off('style.load', styleLoadHandler);
        }
      }
      
  }, [theme]);


  // Update route, markers, and bounds when props change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const mapInstance = map.current;
    
    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    const source = mapInstance.getSource('route') as mapboxgl.GeoJSONSource;

    const routeGeometry = route;

    // Handle route update
    if (source && routeGeometry && Array.isArray(routeGeometry.coordinates) && routeGeometry.coordinates.length > 1) {
        source.setData({
            type: 'Feature',
            properties: {},
            geometry: routeGeometry,
        });
        for (const coord of routeGeometry.coordinates) {
            if (isValidLngLat(coord)) {
                bounds.extend(coord);
            }
        }
    } else if (source) {
        source.setData({ 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } });
    }
    
    // Explicitly set route color based on theme
    if (mapInstance.getLayer('route')) {
        mapInstance.setPaintProperty('route', 'line-color', theme === 'dark' ? '#FFFFFF' : '#000000');
    }

    // Add driver markers
    if (drivers) {
        drivers.forEach(driver => {
            if (isValidLngLat([driver.currentLongitude, driver.currentLatitude])) {
                const el = document.createElement('div');
                el.className = 'w-4 h-4 bg-primary rounded-full border-2 border-background shadow-lg';
                const marker = new mapboxgl.Marker(el)
                    .setLngLat([driver.currentLongitude, driver.currentLatitude])
                    .addTo(mapInstance);
                markersRef.current.push(marker);
            }
        });
    }

    // Add origin and destination markers
    if (isValidLngLat(origin)) {
        const originEl = document.createElement('div');
        originEl.className = 'w-3 h-3 bg-background border-2 border-foreground shadow-md';
        const marker = new mapboxgl.Marker(originEl).setLngLat(origin).addTo(mapInstance);
        markersRef.current.push(marker);
        bounds.extend(origin);
    }
    if (isValidLngLat(destination)) {
        const destEl = document.createElement('div');
        destEl.className = 'w-3 h-3 bg-foreground border-2 border-background shadow-md';
        const marker = new mapboxgl.Marker(destEl).setLngLat(destination).addTo(mapInstance);
        markersRef.current.push(marker);
        bounds.extend(destination);
    }

    if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 500 });
    }

  }, [mapReady, drivers, route, origin, destination, theme]);


  return (
    <div className="h-full w-full rounded-lg overflow-hidden relative bg-muted">
        <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

export default Map;
