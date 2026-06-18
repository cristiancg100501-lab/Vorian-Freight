'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

export function LoginMap({ theme }: { theme?: string }) {
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
      style: theme === 'light' ? 'mapbox://styles/vorianglobal/cmqix2vy6003p01rybiub2dp3' : 'mapbox://styles/vorianglobal/cmqivdlco006p01r34g0lhrmv',
      zoom: 12,
      center: [-70.6693, -33.4489],
      interactive: true,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false,
      projection: { name: 'mercator' } as any,
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
        // Disable all forms of rotation and pitch
        mapInstance.dragRotate.disable();
        mapInstance.touchZoomRotate.disableRotation();
        mapInstance.keyboard.disable();

        // Remove atmosphere
        if (mapInstance.getStyle().layers) {
            (mapInstance as any).setAtmosphere?.(null);
        }

        const layers = mapInstance.getStyle()?.layers || [];
        for (const layer of layers) {
            if (
                layer.id.includes('poi') || 
                layer.id.includes('building') || 
                layer.id.includes('park') ||
                layer.id.includes('landuse')
            ) {
                mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        }
        
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

          const particleColor = '#F5718E';

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
                  'line-color': particleColor, 
                  'line-width': 1, 
                  'line-opacity': 0.15 
              }
          });

          // Source for the moving points and their trails
          mapInstance.addSource('animated-points', {
              'type': 'geojson',
              'data': { 'type': 'FeatureCollection', 'features': [] }
          });
          
          // Layer for the bright core and trail
          mapInstance.addLayer({
              'id': 'points-layer',
              'source': 'animated-points',
              'type': 'circle',
              'paint': { 
                  'circle-radius': ['get', 'radius'],
                  'circle-color': particleColor,
                  'circle-opacity': ['get', 'opacity'],
                  'circle-blur': ['get', 'blur']
              }
          });

          // Prepare particles for animation
          const particles: any[] = [];
          routes.forEach(route => {
              for (let i = 0; i < numPointsPerRoute; i++) {
                  particles.push({
                      route: route.coordinates,
                      progress: Math.random(),
                      speed: 0.0003 + Math.random() * 0.0007,
                      trail: [] 
                  });
              }
          });

          const animate = () => {
              if (!animationFrameId.current) return;

              const features: any[] = [];
              const trailLength = 8; 

              particles.forEach(p => {
                  p.progress += p.speed;
                  if (p.progress >= 1) p.progress = 0;

                  const route = p.route;
                  const totalProgressInIndices = p.progress * (route.length - 1);
                  const index1 = Math.floor(totalProgressInIndices);
                  const index2 = Math.min(index1 + 1, route.length - 1);
                  const subProgress = totalProgressInIndices - index1;
                  
                  const p1 = route[index1];
                  const p2 = route[index2];

                  if(p1 && p2) {
                    const currentPos = [
                        p1[0] + (p2[0] - p1[0]) * subProgress,
                        p1[1] + (p2[1] - p1[1]) * subProgress
                    ];
                    
                    p.trail.unshift(currentPos);
                    if (p.trail.length > trailLength) p.trail.pop();

                    p.trail.forEach((pos: any, idx: number) => {
                        const isCore = idx === 0;
                        features.push({
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: pos },
                            properties: {
                                opacity: isCore ? 1 : (1 - idx / trailLength) * 0.5,
                                radius: isCore ? 2 : (1 - idx / trailLength) * 4 + 1,
                                blur: isCore ? 0 : 0.8
                            }
                        });
                    });
                  }
              });

              if (mapInstance.getSource('animated-points')) {
                  (mapInstance.getSource('animated-points') as mapboxgl.GeoJSONSource).setData({
                      type: 'FeatureCollection', features: features
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
