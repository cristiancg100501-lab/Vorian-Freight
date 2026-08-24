"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import { Truck } from "lucide-react";
import { useTheme } from "next-themes";

// Set your Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export function LandingMap({ className, onComplete }: { className?: string, onComplete?: () => void }) {
  const { resolvedTheme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const reqRef = useRef<number | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const isDark = resolvedTheme === "dark";

    // 1. Initialize Mapbox (Static Camera)
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
      center: [-71.2000, -33.5000],
      zoom: 8.5,
      pitch: 45,
      bearing: 10,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", async () => {
      // 2. Fetch a single real route (San Antonio to Pudahuel)
      const routeStr = "-71.6117,-33.5855;-70.7936,-33.4372"; 
      
      try {
        const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${routeStr}?geometries=geojson&access_token=${mapboxgl.accessToken}`);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates;
          const route = turf.lineString(coords);
          const distance = turf.length(route);
          
          // Draw the route line
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: coords
              }
            }
          });

          // Set fixed frames for a ~8s animation (at 60fps)
          const frames = 480;
          
          // Create the moving Truck marker
          const truckEl = document.createElement('div');
          truckEl.className = isDark 
            ? 'w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.8)]' 
            : 'w-8 h-8 rounded-full bg-white text-black border-2 border-slate-950 flex items-center justify-center shadow-lg';
          truckEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11h1"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;
          
          const truckMarker = new mapboxgl.Marker({ element: truckEl, anchor: 'center' })
            .setLngLat(coords[0] as [number, number])
            .addTo(map);

          markerRef.current = truckMarker;
        
          let counter = 0;
          function animate() {
            if (!mapRef.current) return;
            const point = turf.along(route, (counter / frames) * distance);
            
            if (markerRef.current) {
              markerRef.current.setLngLat(point.geometry.coordinates as [number, number]);
            }
            
            // Gently pan camera with the truck
            mapRef.current.easeTo({
              center: point.geometry.coordinates as [number, number],
              duration: 0 // instantaneous for smooth animation
            });
            
            if (counter < frames) {
              reqRef.current = requestAnimationFrame(animate);
              counter++;
            } else {
              if (onComplete) onComplete();
            }
          }
          animate();

          map.addLayer({
            id: "route-layer",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round"
            },
            paint: {
              "line-color": isDark ? "#ffffff" : "#020617",
              "line-width": 4,
              "line-opacity": isDark ? 0.8 : 0.9
            }
          });

          // Add Origin and Destination custom HTML markers
          const createLabelMarker = (text: string, bgColorClass: string, textColorClass: string, dotColor: string, dotBorderColor: string) => {
            const el = document.createElement('div');
            el.className = 'flex flex-col items-center pointer-events-none';
            el.innerHTML = `
              <div class="${bgColorClass} ${textColorClass} text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-1 whitespace-nowrap">${text}</div>
              <div class="w-4 h-4 rounded-full border-4 shadow-md" style="background-color: ${dotColor}; border-color: ${dotBorderColor};"></div>
            `;
            return el;
          };

          const originLabelBg = isDark ? "bg-zinc-800" : "bg-slate-950";
          const originLabelText = "text-white";
          const originDotColor = isDark ? "#ffffff" : "#020617";
          const originDotBorder = isDark ? "#1a1a1a" : "#ffffff";

          const destLabelBg = isDark ? "bg-green-600" : "bg-white border border-slate-950";
          const destLabelText = isDark ? "text-white" : "text-slate-950";
          const destDotColor = isDark ? "#22c55e" : "#ffffff";
          const destDotBorder = isDark ? "#1a1a1a" : "#020617";

          // Origin
          new mapboxgl.Marker({ 
            element: createLabelMarker('Origen', originLabelBg, originLabelText, originDotColor, originDotBorder), 
            anchor: 'bottom' 
          })
            .setLngLat(coords[0] as [number, number])
            .addTo(map);

          // Destination
          new mapboxgl.Marker({ 
            element: createLabelMarker('Destino', destLabelBg, destLabelText, destDotColor, destDotBorder), 
            anchor: 'bottom' 
          })
            .setLngLat(coords[coords.length - 1] as [number, number])
            .addTo(map);


        }
      } catch (e) {
        console.error("Failed to load route for animation", e);
      }
    });

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      if (markerRef.current) markerRef.current.remove();
      map.remove();
    };
  }, [resolvedTheme]);

  return (
    <div
      ref={mapContainer}
      className={`${className || "absolute inset-0 w-full h-full opacity-60 pointer-events-none"} grayscale contrast-125`}
    />
  );
}
