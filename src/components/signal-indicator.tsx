"use client";

import { useEffect, useState } from "react";
import { Signal, SignalHigh, SignalLow, SignalMedium, SignalZero, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalIndicatorProps {
  lastUpdatedMs: number | null; // Timestamp de la última posición recibida del GPS
  className?: string;
  showText?: boolean;
}

export function SignalIndicator({ lastUpdatedMs, className, showText = true }: SignalIndicatorProps) {
  const [now, setNow] = useState<number>(Date.now());

  // Actualizar el reloj local cada 3 segundos para refrescar el cálculo de señal
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Calcular la "salud" de la señal basándose en qué tan reciente fue la actualización
  const getSignalStatus = () => {
    if (!lastUpdatedMs) {
      return {
        level: 0,
        label: "Sin señal GPS",
        statusText: "Buscando satélite...",
        colorClass: "text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
        barColor: "bg-zinc-300 dark:bg-zinc-600",
        bars: 0,
      };
    }

    const elapsedSeconds = (now - lastUpdatedMs) / 1000;

    if (elapsedSeconds <= 15) {
      // Excelente (Últimos 15 segundos) -> 4 Barras
      return {
        level: 4,
        label: "Señal Excelente (GPS Vivo)",
        statusText: "Señal Excelente (4G/GPS)",
        colorClass: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
        barColor: "bg-emerald-500",
        bars: 4,
      };
    } else if (elapsedSeconds <= 45) {
      // Buena (15s a 45s) -> 3 Barras
      return {
        level: 3,
        label: "Señal Buena",
        statusText: "Señal Buena",
        colorClass: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
        barColor: "bg-blue-500",
        bars: 3,
      };
    } else if (elapsedSeconds <= 120) {
      // Débil (45s a 2 minutos) -> 2 Barras (Ej. zona de túnel o señal moderada)
      return {
        level: 2,
        label: "Señal Débil",
        statusText: `Señal Débil (hace ${Math.round(elapsedSeconds)}s)`,
        colorClass: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
        barColor: "bg-amber-500",
        bars: 2,
      };
    } else {
      // Sin Señal / Desconectado (> 2 minutos sin reportar GPS) -> 0 o 1 Barra
      const elapsedMin = Math.round(elapsedSeconds / 60);
      return {
        level: 0,
        label: "Sin Señal / Zonas sin Cobertura",
        statusText: `Sin Cobertura (hace ${elapsedMin} min)`,
        colorClass: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50",
        barColor: "bg-rose-500",
        bars: 0,
      };
    }
  };

  const status = getSignalStatus();

  return (
    <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold shadow-xs transition-all", status.colorClass, className)}>
      {/* 4 Barras de Señal Visuales */}
      <div className="flex items-end gap-[2px] h-3.5 px-0.5">
        {[1, 2, 3, 4].map((barIndex) => {
          const isActive = barIndex <= status.bars;
          const barHeights = ["h-1.5", "h-2.5", "h-3", "h-3.5"];
          return (
            <span
              key={barIndex}
              className={cn(
                "w-[3px] rounded-xs transition-all duration-300",
                barHeights[barIndex - 1],
                isActive ? status.barColor : "bg-zinc-300 dark:bg-zinc-700/60 opacity-40"
              )}
            />
          );
        })}
      </div>

      {showText && (
        <span className="truncate max-w-[170px] font-mono text-[11px] tracking-tight">
          {status.statusText}
        </span>
      )}
    </div>
  );
}
