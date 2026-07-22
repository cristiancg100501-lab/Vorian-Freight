"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import { Truck } from "lucide-react";

// Set your Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export function LandingMap({ theme }: { theme?: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const reqRef = useRef<number | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const isDark = theme !== "light";

    // 1. Initialize Mapbox (Static Camera)
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
      center: [-70.6182, -33.4272],
      zoom: 11.5,
      pitch: 45,
      bearing: -20,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", async () => {
      // 2. Fetch a single real route
      const routeStr = "-70.5891,-33.4144;-70.6506,-33.4526"; // From Costanera to Centro
      
      try {
        const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${routeStr}?geometries=geojson&access_token=${mapboxgl.accessToken}`);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates;
          const line = turf.lineString(coords);
          const distance = turf.length(line);
          
          const resampledCoords = [];
          const steps = 800; // Smooth frames
          for (let i = 0; i <= steps; i++) {
            const segment = turf.along(line, (i / steps) * distance);
            resampledCoords.push(segment.geometry.coordinates as [number, number]);
          }

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

          // Create the moving Truck marker
          const truckEl = document.createElement('div');
          truckEl.className = isDark 
            ? 'w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.8)]' 
            : 'w-8 h-8 rounded-full bg-white text-black border-2 border-slate-950 flex items-center justify-center shadow-lg';
          truckEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11h1"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;
          
          const truckMarker = new mapboxgl.Marker({ element: truckEl, anchor: 'center' })
            .setLngLat(resampledCoords[0])
            .addTo(map);

          markerRef.current = truckMarker;

          // Animate the truck
          let currentStep = 0;
          const animate = () => {
            currentStep = (currentStep + 1) % steps;
            
            // Calculate bearing to point the truck in the right direction
            if (currentStep < steps - 1) {
                const current = resampledCoords[currentStep];
                const next = resampledCoords[currentStep + 1];
                const bearing = turf.bearing(turf.point(current), turf.point(next));
                
                truckMarker.setLngLat(current);
                // We can rotate the truck icon based on bearing, but usually the truck icon is fine pointing right or we can rotate it:
                // truckEl.style.transform = `rotate(${bearing - 90}deg)`; 
            }

            reqRef.current = requestAnimationFrame(animate);
          };

          animate();
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
  }, [theme]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
    />
  );
}
