"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Set your Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export function LoginMap({ theme }: { theme?: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const reqRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const isDark = theme !== "light";

    // 1. Initialize Mapbox
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
      center: [-70.6482, -33.4372], // Santiago Centro
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
      interactive: false, // Background map
    });

    mapRef.current = map;

    map.on("load", async () => {
      // 2. Fetch some real routes in Santiago to animate on
      const routes = [
        "-70.5891,-33.4144;-70.6482,-33.4372", // Costanera to Centro
        "-70.7699,-33.5097;-70.6506,-33.4526", // Maipu to Centro
        "-70.5312,-33.3768;-70.6121,-33.4842", // Vitacura to Macul
      ];

      const geometries: number[][][] = [];

      try {
        for (const r of routes) {
          const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${r}?geometries=geojson&access_token=${mapboxgl.accessToken}`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            geometries.push(data.routes[0].geometry.coordinates);
          }
        }
      } catch (e) {
        console.error("Failed to load routes for animation", e);
      }

      if (geometries.length === 0) return;

      // 3. Setup GeoJSON source for trails
      // We will render a LineString for each trail. The line will represent the "estela"
      const trailData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: "FeatureCollection",
        features: geometries.map(() => ({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        })),
      };

      map.addSource("trails", {
        type: "geojson",
        data: trailData,
        lineMetrics: true,
      });

      // 4. Add layer with Line Gradient for the fading effect (estela)
      map.addLayer({
        id: "trails-layer",
        type: "line",
        source: "trails",
        paint: {
          "line-width": 4,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0, "rgba(59, 130, 246, 0)", // Tail fades out (transparent blue)
            1, "rgba(59, 130, 246, 1)"  // Head is solid blue
          ],
        },
      });

      // 5. Add a glowing point at the head
      const pointData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: geometries.map(() => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        })),
      };

      map.addSource("trail-heads", {
        type: "geojson",
        data: pointData,
      });

      map.addLayer({
        id: "trail-heads-layer",
        type: "circle",
        source: "trail-heads",
        paint: {
          "circle-radius": 6,
          "circle-color": "#60A5FA", // Light blue
          "circle-blur": 0.5,
        },
      });

      // 6. Animation loop
      const speed = 0.0015; // Moderate speed
      const trailLength = 15; // Number of coordinates in the trail
      let t = 0;

      const animate = () => {
        t += speed;
        if (t > 1) t = 0; // Loop

        for (let i = 0; i < geometries.length; i++) {
          const path = geometries[i];
          const totalPoints = path.length;
          const currentIndex = Math.floor(t * totalPoints);
          
          // Generate trail
          const trailCoords = [];
          const startIdx = Math.max(0, currentIndex - trailLength);
          for (let j = startIdx; j <= currentIndex; j++) {
             trailCoords.push(path[j]);
          }

          if (trailCoords.length > 1) {
            trailData.features[i].geometry.coordinates = trailCoords;
            pointData.features[i].geometry.coordinates = path[currentIndex];
          }
        }

        const trailsSource = map.getSource("trails") as mapboxgl.GeoJSONSource;
        if (trailsSource) trailsSource.setData(trailData);

        const headsSource = map.getSource("trail-heads") as mapboxgl.GeoJSONSource;
        if (headsSource) headsSource.setData(pointData);

        // Slowly rotate the camera for cinematic effect
        map.easeTo({ bearing: map.getBearing() + 0.1, duration: 16, easing: (x) => x });

        reqRef.current = requestAnimationFrame(animate);
      };

      animate();
    });

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      map.remove();
    };
  }, [theme]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 w-full h-full opacity-60"
    />
  );
}
