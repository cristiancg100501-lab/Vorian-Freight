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
      zoom: 12.5,
      pitch: 55,
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
        "-70.6693,-33.4002;-70.7188,-33.3644", // Renca to Quilicura
        "-70.6015,-33.4357;-70.6976,-33.4691", // Providencia to Estacion Central
        "-70.5512,-33.4821;-70.6288,-33.5513", // Penalolen to San Bernardo
      ];

      const geometries: number[][][] = [];

      try {
        for (const r of routes) {
          // overview=full is REQUIRED for smooth fluid animations (gives thousands of tiny points)
          const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${r}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            geometries.push(data.routes[0].geometry.coordinates);
          }
        }
      } catch (e) {
        console.error("Failed to load routes for animation", e);
      }

      if (geometries.length === 0) return;

      // 3. Generate Particles (Traffic)
      // 15 particles per route = 90 total moving points
      const particles: { pathIndex: number; progress: number; speed: number; trailLength: number }[] = [];
      geometries.forEach((path, pathIndex) => {
        for (let i = 0; i < 20; i++) {
          particles.push({
            pathIndex,
            progress: Math.random(), // Start at random position on the route
            speed: 0.0003 + Math.random() * 0.0004, // Very smooth, moderate speed
            trailLength: 4 + Math.floor(Math.random() * 5), // Small trail (4 to 8 points)
          });
        }
      });

      // 4. Setup GeoJSON sources for trails and heads
      const trailData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: "FeatureCollection",
        features: particles.map(() => ({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        })),
      };

      const pointData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: particles.map(() => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        })),
      };

      map.addSource("trails", { type: "geojson", data: trailData, lineMetrics: true });
      map.addSource("trail-heads", { type: "geojson", data: pointData });

      // Add trail layer (Estela pequeña)
      map.addLayer({
        id: "trails-layer",
        type: "line",
        source: "trails",
        paint: {
          "line-width": 3,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0, "rgba(59, 130, 246, 0)", // Tail fades out
            1, "rgba(59, 130, 246, 0.8)"  // Head is solid blue
          ],
        },
      });

      // Add head layer (Puntos azules brillantes)
      map.addLayer({
        id: "trail-heads-layer",
        type: "circle",
        source: "trail-heads",
        paint: {
          "circle-radius": 4,
          "circle-color": "#60A5FA", 
          "circle-blur": 0.2,
        },
      });

      // 5. Animation loop
      const animate = () => {
        particles.forEach((p, i) => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0; // Loop around

          const path = geometries[p.pathIndex];
          const totalPoints = path.length;
          const currentIndex = Math.floor(p.progress * totalPoints);
          
          // Generate small trail
          const trailCoords = [];
          const startIdx = Math.max(0, currentIndex - p.trailLength);
          for (let j = startIdx; j <= currentIndex; j++) {
             trailCoords.push(path[j]);
          }

          if (trailCoords.length > 1) {
            trailData.features[i].geometry.coordinates = trailCoords;
            pointData.features[i].geometry.coordinates = path[currentIndex];
          }
        });

        // Batch update to mapbox
        const trailsSource = map.getSource("trails") as mapboxgl.GeoJSONSource;
        if (trailsSource) trailsSource.setData(trailData);

        const headsSource = map.getSource("trail-heads") as mapboxgl.GeoJSONSource;
        if (headsSource) headsSource.setData(pointData);

        // Slowly rotate the camera for cinematic effect
        map.easeTo({ bearing: map.getBearing() + 0.05, duration: 16, easing: (x) => x });

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
