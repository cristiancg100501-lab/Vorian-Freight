"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";

mapboxgl.accessToken =
  "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

const DARK_STYLE = "mapbox://styles/vorianglobal/cmqivdlco006p01r34g0lhrmv";
const LIGHT_STYLE = "mapbox://styles/vorianglobal/cmqiz50lq004601s65k48addr";

interface DemandHeatmapProps {
  shipments: any[];
}

/** Convert shipments array → GeoJSON FeatureCollection */
function toGeoJSON(shipments: any[]): mapboxgl.GeoJSONSourceRaw["data"] {
  return {
    type: "FeatureCollection",
    features: shipments
      .filter((s) => s.delivery_latitude && s.delivery_longitude)
      .map((s) => ({
        type: "Feature",
        properties: { intensity: 1 },
        geometry: {
          type: "Point",
          coordinates: [s.delivery_longitude, s.delivery_latitude],
        },
      })),
  } as any;
}

export default function DemandHeatmap({ shipments }: DemandHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapReady = useRef(false); // tracks whether layers are added
  const { theme } = useTheme();

  // ── Effect 1: Initialize the map ONCE ──────────────────────────────────────
  // No shipments in deps — creating a new WebGL context per data update was the
  // main CPU/GPU spike. We init once and update data via the source API instead.
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === "dark" ? DARK_STYLE : LIGHT_STYLE,
      center: [-70.6693, -33.4489],
      zoom: 10,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false,
      projection: { name: "mercator" } as any,
    });

    instance.on("style.load", () => {
      instance.dragRotate.disable();
      instance.touchZoomRotate.disableRotation();
      instance.keyboard.disable();
      (instance as any).setAtmosphere?.(null);

      // Add source with empty data on init — will be populated by Effect 2
      instance.addSource("demand", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Heatmap layer
      instance.addLayer({
        id: "demand-heat",
        type: "heatmap",
        source: "demand",
        maxzoom: 15,
        paint: {
          "heatmap-weight": [
            "interpolate", ["exponential", 1], ["zoom"], 1, 0, 5, 1,
          ],
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"], 11, 1, 15, 3,
          ],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(33,102,172,0)",
            0.2, "#0066f522",
            0.4, "#0066f566",
            0.6, "#0066f5aa",
            0.8, "#0066f5ee",
            1,  "#0066f5",
          ],
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"], 11, 15, 15, 20,
          ],
          "heatmap-opacity": [
            "interpolate", ["linear"], ["zoom"], 14, 1, 15, 0,
          ],
        },
      });

      // Circle layer for high zoom
      instance.addLayer({
        id: "demand-point",
        type: "circle",
        source: "demand",
        minzoom: 14,
        paint: {
          "circle-radius": 5,
          "circle-color": "#0066f5",
          "circle-stroke-color": "white",
          "circle-stroke-width": 1,
          "circle-opacity": [
            "interpolate", ["linear"], ["zoom"], 14, 0, 15, 1,
          ],
        },
      });

      mapReady.current = true;

      // Apply current shipments data now that layers exist
      const source = instance.getSource("demand") as mapboxgl.GeoJSONSource;
      if (source) source.setData(toGeoJSON(shipments) as any);
    });

    map.current = instance;

    return () => {
      mapReady.current = false;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: map init runs exactly once

  // ── Effect 2: Update GeoJSON data when shipments change ────────────────────
  // No WebGL context creation — just swaps the data in the existing source.
  // This is O(n) JSON serialization, not O(1) GPU context reset.
  useEffect(() => {
    if (!mapReady.current || !map.current) return;
    const source = map.current.getSource("demand") as mapboxgl.GeoJSONSource;
    if (source) source.setData(toGeoJSON(shipments) as any);
  }, [shipments]);

  // ── Effect 3: Theme change — swap the map style without reinitializing ──────
  useEffect(() => {
    if (!map.current || !mapReady.current) return;
    const newStyle = theme === "dark" ? DARK_STYLE : LIGHT_STYLE;
    // setStyle reloads style but keeps the map instance alive (no GPU reset)
    map.current.setStyle(newStyle);
    // Re-add layers after style reload
    mapReady.current = false;
    map.current.once("style.load", () => {
      const instance = map.current;
      if (!instance) return;

      instance.addSource("demand", {
        type: "geojson",
        data: toGeoJSON(shipments) as any,
      });
      instance.addLayer({
        id: "demand-heat",
        type: "heatmap",
        source: "demand",
        maxzoom: 15,
        paint: {
          "heatmap-weight": ["interpolate", ["exponential", 1], ["zoom"], 1, 0, 5, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 11, 1, 15, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(33,102,172,0)",
            0.2, "#0066f522",
            0.4, "#0066f566",
            0.6, "#0066f5aa",
            0.8, "#0066f5ee",
            1,  "#0066f5",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 11, 15, 15, 20],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 14, 1, 15, 0],
        },
      });
      instance.addLayer({
        id: "demand-point",
        type: "circle",
        source: "demand",
        minzoom: 14,
        paint: {
          "circle-radius": 5,
          "circle-color": "#0066f5",
          "circle-stroke-color": "white",
          "circle-stroke-width": 1,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 1],
        },
      });
      mapReady.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]); // ← only runs when theme actually changes

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border bg-muted/20">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold border border-white/10">
        PUNTOS DE ENTREGA
      </div>
    </div>
  );
}
