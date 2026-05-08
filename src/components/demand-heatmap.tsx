"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface DemandHeatmapProps {
  shipments: any[];
}

export default function DemandHeatmap({ shipments }: DemandHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c',
      center: [-70.6693, -33.4489], 
      zoom: 10,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false,
      projection: { name: 'mercator' } as any,
    });

    map.current.on('style.load', () => {
      const mapInstance = map.current;
      if (!mapInstance) return;

      // Disable all forms of rotation and pitch
      mapInstance.dragRotate.disable();
      mapInstance.touchZoomRotate.disableRotation();
      mapInstance.keyboard.disable();

      // Remove atmosphere
      if (mapInstance.getStyle().layers) {
          (mapInstance as any).setAtmosphere?.(null);
      }

      // Extract coordinates from shipments
      const features = shipments
        .filter(s => s.delivery_latitude && s.delivery_longitude)
        .map(s => ({
          type: 'Feature',
          properties: { intensity: 1 },
          geometry: {
            type: 'Point',
            coordinates: [s.delivery_longitude, s.delivery_latitude]
          }
        }));

      mapInstance.addSource('demand', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features as any
        }
      });

      // Add Heatmap layer
      mapInstance.addLayer({
        id: 'demand-heat',
        type: 'heatmap',
        source: 'demand',
        maxzoom: 15,
        paint: {
          // Increase weight as zoom increases
          'heatmap-weight': [
            'interpolate',
            ['exponential', 1],
            ['zoom'],
            1, 0,
            5, 1
          ],
          // Increase intensity as zoom increases
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 1,
            15, 3
          ],
          // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
          // Beginning color (0) must be transparent.
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, '#fa788e22',
            0.4, '#fa788e66',
            0.6, '#fa788eaa',
            0.8, '#fa788eee',
            1, '#fa788e'
          ],
          // Adjust radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 15,
            15, 20
          ],
          // Transition from heatmap to circle layer by zoom level
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 1,
            15, 0
          ]
        }
      });

      // Add Circle layer (visible at high zoom levels)
      mapInstance.addLayer({
        id: 'demand-point',
        type: 'circle',
        source: 'demand',
        minzoom: 14,
        paint: {
          'circle-radius': 5,
          'circle-color': '#fa788e',
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0,
            15, 1
          ]
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    }
  }, [shipments, theme]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border bg-muted/20">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold border border-white/10">
        PUNTOS DE ENTREGA
      </div>
    </div>
  );
}
