"use client";

import { useMemo } from "react";

interface ChileDottedMapProps {
  shipments: any[];
}

export default function ChileDottedMap({ shipments }: ChileDottedMapProps) {
  // Very simplified but recognizable path of Chile (Mainland + rough islands)
  const chilePath = "M65.4,12.5 L73.2,54.8 L78.5,102.3 L71.2,148.6 L52.4,196.4 L41.8,245.2 L32.5,298.7 L38.2,345.1 L58.4,392.5 L67.8,445.3 L76.2,492.8 L68.5,542.1 L51.2,588.4 L58.7,635.6 L41.4,672.3 L28.6,645.1 L18.2,596.4 L28.5,548.7 L38.4,502.1 L48.2,456.4 L38.4,408.7 L28.5,362.4 L18.2,315.6 L28.5,268.4 L38.2,218.7 L58.4,165.2 L62.5,112.4 L58.2,58.7 L52.4,14.8 Z";

  const gridDots = useMemo(() => {
    const dots = [];
    const spacing = 6;
    for (let x = 10; x < 90; x += spacing) {
      for (let y = 10; y < 690; y += spacing) {
        dots.push({ x, y });
      }
    }
    return dots;
  }, []);

  // Process shipments to find active "zones"
  const demandZones = useMemo(() => {
    const zones: { [key: string]: number } = {};
    shipments.forEach(s => {
      if (s.delivery_latitude && s.delivery_longitude) {
        // Map lat/lng to our 100x700 coordinate system
        // Lng: -76 to -66 -> 0 to 100
        // Lat: -17.5 to -56 -> 0 to 700
        const x = Math.round(((s.delivery_longitude + 76) / 10) * 100);
        const y = Math.round(((s.delivery_latitude + 17.5) / -38.5) * 700);
        
        // Quantize to grid
        const gx = Math.round(x / 6) * 6;
        const gy = Math.round(y / 6) * 6;
        const key = `${gx},${gy}`;
        zones[key] = (zones[key] || 0) + 1;
      }
    });
    return zones;
  }, [shipments]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-card/30 rounded-2xl border p-4 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <svg viewBox="0 0 100 700" className="h-full w-auto drop-shadow-[0_0_15px_rgba(0,0,0,0.2)]">
        <defs>
          <clipPath id="chile-outline">
            <path d={chilePath} />
          </clipPath>
          <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fa788e" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fa788e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Subtle background grid for context */}
        <g opacity="0.03" className="text-foreground">
          {gridDots.map((dot, i) => (
            <circle key={`bg-${i}`} cx={dot.x} cy={dot.y} r="1" fill="currentColor" />
          ))}
        </g>

        {/* The Chile Shape Masked Dotted Grid */}
        <g clipPath="url(#chile-outline)">
          {gridDots.map((dot, i) => {
            const demandValue = demandZones[`${dot.x},${dot.y}`] || 0;
            const hasDemand = demandValue > 0;
            
            return (
              <circle
                key={`chile-dot-${i}`}
                cx={dot.x}
                cy={dot.y}
                r={hasDemand ? 2.5 : 1.5}
                fill={hasDemand ? "#fa788e" : "currentColor"}
                opacity={hasDemand ? 1 : 0.2}
                className={`transition-all duration-500 ${hasDemand ? "drop-shadow-[0_0_5px_#fa788e]" : "text-muted-foreground"}`}
              />
            );
          })}
        </g>

        {/* Animated pulses on high demand zones */}
        {Object.entries(demandZones).map(([key, count], i) => {
          const [x, y] = key.split(',').map(Number);
          if (count < 2) return null; // Only pulse for higher demand
          return (
            <circle
              key={`pulse-${i}`}
              cx={x}
              cy={y}
              r="8"
              fill="url(#dot-glow)"
              className="animate-pulse"
            />
          );
        })}
      </svg>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Región</span>
          <span className="text-xs font-bold">CHILE CONTINENTAL</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Densidad</span>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-1 w-3 rounded-full ${i < 4 ? 'bg-[#fa788e]' : 'bg-muted'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
