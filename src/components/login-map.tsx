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
      style: theme === 'light' ? 'mapbox://styles/vorianglobal/cmqiz50lq004601s65k48addr' : 'mapbox://styles/vorianglobal/cmqivdlco006p01r34g0lhrmv',
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
        
      // Animación de partículas eliminada para optimizar el rendimiento y tiempo de carga
      // La vista del mapa ahora es estática y ligera.
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
