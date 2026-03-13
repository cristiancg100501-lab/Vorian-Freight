'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

export function LoginMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    if (mapboxgl.accessToken === "YOUR_MAPBOX_ACCESS_TOKEN" || !mapboxgl.accessToken) {
        if (mapContainer.current) {
            mapContainer.current.innerHTML = `<div class="flex items-center justify-center h-full bg-muted text-muted-foreground"><p>Mapbox access token is not set.</p></div>`;
        }
        return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-70.6693, -33.4489],
      zoom: 12.5,
      pitch: 60,
      bearing: -20,
      interactive: false,
    });

    const mapInstance = map.current;

    mapInstance.on('load', () => {
      // Add glowing roads effect
      const layers = [
        { id: 'road-glow-case', type: 'line', paint: { 'line-color': '#00a9ff', 'line-width': 15, 'line-blur': 35, 'line-opacity': 0.2 } },
        { id: 'road-glow-blur', type: 'line', paint: { 'line-color': '#00a9ff', 'line-width': 8, 'line-blur': 15, 'line-opacity': 0.3 } },
        { id: 'road-glow-main', type: 'line', paint: { 'line-color': '#00a9ff', 'line-width': 4, 'line-blur': 5, 'line-opacity': 0.5 } },
        { id: 'road-line', type: 'line', paint: { 'line-color': '#e0faff', 'line-width': 0.5, 'line-opacity': 0.9 } }
      ];

      layers.forEach(layer => {
        mapInstance.addLayer({
            ...layer,
            source: 'composite',
            'source-layer': 'road',
            filter: [
                'any',
                ['==', ['get', 'class'], 'motorway'],
                ['==', ['get', 'class'], 'trunk'],
                ['==', ['get', 'class'], 'primary'],
            ],
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            }
        } as mapboxgl.AnyLayer, 'settlement-subdivision-label');
      });

      // Add animated snake layer
      mapInstance.addLayer({
        id: 'road-animation',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        filter: [
          'any',
          ['==', ['get', 'class'], 'motorway'],
          ['==', ['get', 'class'], 'trunk'],
        ],
        paint: {
          'line-color': '#fff',
          'line-width': 1.5,
          'line-opacity': 0.8,
          'line-dasharray': [0, 4, 3],
        }
      }, 'settlement-subdivision-label');
      
      let step = 0;
      function animate() {
        const phase = step / 100;
        const dash = [
          0,
          4 + Math.sin(phase) * 2,
          3 + Math.cos(phase) * 1,
        ];
        
        mapInstance.setPaintProperty('road-animation', 'line-dasharray', dash);
        
        step++;
        animationFrameId.current = requestAnimationFrame(animate);
      }

      animate();

    });

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />;
}
