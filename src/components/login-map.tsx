'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

export function LoginMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Stop if map is already initialized or container is not ready
    if (map.current || !mapContainer.current) return;
    
    if (mapboxgl.accessToken === "YOUR_MAPBOX_ACCESS_TOKEN" || !mapboxgl.accessToken) {
        if (mapContainer.current) {
            mapContainer.current.innerHTML = `<div class="flex items-center justify-center h-full bg-muted text-muted-foreground"><p>Mapbox access token is not set.</p></div>`;
        }
        return;
    }

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      zoom: 12,
      center: [-70.6693, -33.4489],
      interactive: true,
    });

    const mapInstance = map.current;
    
    const stopAnimation = () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
    
    mapInstance.on('mousedown', stopAnimation);
    mapInstance.on('touchstart', stopAnimation);
    mapInstance.on('zoomstart', stopAnimation);
    mapInstance.on('dragstart', stopAnimation);

    mapInstance.on('load', () => {
      // Santiago bounding box approx.
      const bounds = {
        minLon: -70.8,
        maxLon: -70.5,
        minLat: -33.6,
        maxLat: -33.3
      };
      
      const numRoutes = 20;
      const numPointsPerRoute = 10; // Total 200 particles

      const randomPoint = () => ({
        lon: Math.random() * (bounds.maxLon - bounds.minLon) + bounds.minLon,
        lat: Math.random() * (bounds.maxLat - bounds.minLat) + bounds.minLat,
      });

      const fetchRoutes = async () => {
          const promises = Array.from({ length: numRoutes }).map(async () => {
              const start = randomPoint();
              const end = randomPoint();
              const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start.lon},${start.lat};${end.lon},${end.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
              
              try {
                  const response = await fetch(url);
                  const data = await response.json();
                  if (data.routes && data.routes.length > 0) {
                      return data.routes[0].geometry;
                  }
              } catch (e) {
                  console.error("Error fetching route:", e);
              }
              return null;
          });

          const results = await Promise.all(promises);
          return results.filter(route => route !== null);
      };

      const setupAnimation = (routes: any[]) => {
          if (!map.current || routes.length === 0) return;
          const mapInstance = map.current;

          // Source for the faint route lines (the "trails")
          mapInstance.addSource('routes-lines', {
              'type': 'geojson',
              'data': { 'type': 'FeatureCollection', 'features': routes.map(route => ({ 'type': 'Feature', 'geometry': route, 'properties': {} })) }
          });

          // Layer for the faint trails
          mapInstance.addLayer({
              'id': 'routes-layer',
              'type': 'line',
              'source': 'routes-lines',
              'paint': { 
                  'line-color': '#FFFFFF', 
                  'line-width': 1, 
                  'line-opacity': 0.3 // Slightly more visible trail
              }
          });

          // Prepare particles for animation
          const particles: any[] = [];
          routes.forEach(route => {
              for (let i = 0; i < numPointsPerRoute; i++) {
                  particles.push({
                      type: 'Feature',
                      geometry: { type: 'Point', coordinates: route.coordinates[0] },
                      properties: { route: route.coordinates, progress: Math.random(), speed: 0.0005 + Math.random() * 0.001 }
                  });
              }
          });

          // Source for the moving points
          mapInstance.addSource('animated-points', {
              'type': 'geojson',
              'data': { 'type': 'FeatureCollection', 'features': particles }
          });
          
          // Layer for the glow effect
          mapInstance.addLayer({
              'id': 'points-glow',
              'source': 'animated-points',
              'type': 'circle',
              'paint': { 
                  'circle-radius': 7,
                  'circle-color': '#FFFFFF',
                  'circle-opacity': 0.2, // Low opacity for the glow
                  'circle-blur': 2.5 // Increased blur
              }
          });

          // Layer for the bright core of the point
          mapInstance.addLayer({
              'id': 'points-core',
              'source': 'animated-points',
              'type': 'circle',
              'paint': { 
                  'circle-radius': 1.5,
                  'circle-color': '#FFFFFF',
                  'circle-opacity': 1 // Solid core
              }
          });

          const animate = () => {
              if (!animationFrameId.current) return; // Stop if animation was cancelled

              particles.forEach(particle => {
                  particle.properties.progress += particle.properties.speed;
                  
                  if (particle.properties.progress >= 1) {
                      particle.properties.progress = 0;
                  }

                  const route = particle.properties.route;
                  const totalProgressInIndices = particle.properties.progress * (route.length - 1);
                  const index1 = Math.floor(totalProgressInIndices);
                  const index2 = Math.min(index1 + 1, route.length - 1);
                  const subProgress = totalProgressInIndices - index1;
                  
                  const p1 = route[index1];
                  const p2 = route[index2];

                  if(p1 && p2) {
                    const newLon = p1[0] + (p2[0] - p1[0]) * subProgress;
                    const newLat = p1[1] + (p2[1] - p1[1]) * subProgress;
                    particle.geometry.coordinates = [newLon, newLat];
                  }
              });

              if (mapInstance.getSource('animated-points')) {
                  (mapInstance.getSource('animated-points') as mapboxgl.GeoJSONSource).setData({
                      type: 'FeatureCollection', features: particles
                  });
              }
              animationFrameId.current = requestAnimationFrame(animate);
          };

          animationFrameId.current = requestAnimationFrame(animate);
      };
      
      fetchRoutes().then(setupAnimation);
    });

    return () => {
      stopAnimation();
      mapInstance.off('mousedown', stopAnimation);
      mapInstance.off('touchstart', stopAnimation);
      mapInstance.off('zoomstart', stopAnimation);
      mapInstance.off('dragstart', stopAnimation);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />;
}
