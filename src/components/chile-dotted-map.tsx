"use client";

import { useEffect, useRef, useMemo } from "react";

interface ChileDottedMapProps {
  shipments: any[];
}

// Chile mainland path points in our 100x700 coordinate space
// Used for point-in-polygon hit testing on the canvas
const CHILE_PATH_POINTS: [number, number][] = [
  [65.4, 12.5], [73.2, 54.8], [78.5, 102.3], [71.2, 148.6],
  [52.4, 196.4], [41.8, 245.2], [32.5, 298.7], [38.2, 345.1],
  [58.4, 392.5], [67.8, 445.3], [76.2, 492.8], [68.5, 542.1],
  [51.2, 588.4], [58.7, 635.6], [41.4, 672.3], [28.6, 645.1],
  [18.2, 596.4], [28.5, 548.7], [38.4, 502.1], [48.2, 456.4],
  [38.4, 408.7], [28.5, 362.4], [18.2, 315.6], [28.5, 268.4],
  [38.2, 218.7], [58.4, 165.2], [62.5, 112.4], [58.2, 58.7],
  [52.4, 14.8],
];

/** Point-in-polygon using ray casting — O(n) per dot, runs once on mount */
function isInsideChile(px: number, py: number): boolean {
  const poly = CHILE_PATH_POINTS;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const SPACING = 6;
const VIEW_W = 100;
const VIEW_H = 700;

export default function ChileDottedMap({ shipments }: ChileDottedMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Build grid dots inside Chile once — memoized, no deps that change often
  const gridDots = useMemo(() => {
    const dots: [number, number][] = [];
    for (let x = 10; x < VIEW_W; x += SPACING) {
      for (let y = 10; y < VIEW_H; y += SPACING) {
        if (isInsideChile(x, y)) dots.push([x, y]);
      }
    }
    return dots;
  }, []);

  // Create a stable string of coordinates to prevent endless redraws 
  // if the parent passes a new array reference (e.g. `shipments || []`) on every render
  const shipmentsHash = useMemo(() => {
    return shipments
      .filter((s) => s.delivery_latitude && s.delivery_longitude)
      .map((s) => `${s.delivery_latitude},${s.delivery_longitude}`)
      .join("|");
  }, [shipments]);

  // Map shipment coords → demand grid keys
  const demandZones = useMemo(() => {
    const zones: Record<string, number> = {};
    shipments.forEach((s) => {
      if (s.delivery_latitude && s.delivery_longitude) {
        const x = Math.round(((s.delivery_longitude + 76) / 10) * 100);
        const y = Math.round(((s.delivery_latitude + 17.5) / -38.5) * VIEW_H);
        const gx = Math.round(x / SPACING) * SPACING;
        const gy = Math.round(y / SPACING) * SPACING;
        const key = `${gx},${gy}`;
        zones[key] = (zones[key] || 0) + 1;
      }
    });
    return zones;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentsHash]); // Depend on the hash, not the array reference

  // Draw everything on canvas whenever dots or demand changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    // Scale factor from our 100x700 logical space to actual canvas pixels
    const scaleX = width / VIEW_W;
    const scaleY = height / VIEW_H;

    ctx.clearRect(0, 0, width, height);

    // Get CSS variable for muted foreground (respects dark/light theme)
    const mutedColor = getComputedStyle(canvas)
      .getPropertyValue("--muted-foreground")
      .trim();

    for (const [lx, ly] of gridDots) {
      const demandValue = demandZones[`${lx},${ly}`] || 0;
      const hasDemand = demandValue > 0;
      const highDemand = demandValue >= 2;

      const cx = lx * scaleX;
      const cy = ly * scaleY;
      const r = hasDemand ? 2.5 * scaleX : 1.5 * scaleX;

      if (hasDemand) {
        ctx.fillStyle = "#fa788e";
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        if (highDemand) {
          // Fast glow effect using a larger circle instead of expensive shadowBlur
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = mutedColor || "#888";
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Reset context state
    ctx.globalAlpha = 1;
  }, [gridDots, demandZones]);

  // Density bar: how many non-zero zones exist
  const demandCount = Object.keys(demandZones).length;
  const densityLevel = Math.min(5, Math.ceil((demandCount / 10)));

  return (
    <div className="w-full h-full flex items-center justify-center bg-card/30 rounded-2xl border p-4 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      {/* Single canvas element — replaces ~1,400 SVG circle nodes */}
      <canvas
        ref={canvasRef}
        width={200}
        height={1400}
        className="h-full w-auto drop-shadow-[0_0_15px_rgba(0,0,0,0.2)]"
        style={{ imageRendering: "crisp-edges" }}
      />

      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Región
          </span>
          <span className="text-xs font-bold">CHILE CONTINENTAL</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Densidad
          </span>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1 w-3 rounded-full ${
                  i <= densityLevel ? "bg-[#fa788e]" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
