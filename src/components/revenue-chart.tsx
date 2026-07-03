"use client";

import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RevenueChartProps {
  data: {
    month: string;
    revenue: number;
    trips: number;
  }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { resolvedTheme } = useTheme();
  
  // Choose colors based on theme, similar to stripe/premium look
  const barColor = resolvedTheme === "dark" ? "#818cf8" : "#4f46e5"; // indigo-400 / indigo-600
  const barHoverColor = resolvedTheme === "dark" ? "#a5b4fc" : "#4338ca"; // indigo-300 / indigo-700
  const gridColor = resolvedTheme === "dark" ? "#334155" : "#e2e8f0"; // slate-700 / slate-200
  const textColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b"; // slate-400 / slate-500
  const tooltipBg = resolvedTheme === "dark" ? "#1e293b" : "#ffffff"; // slate-800 / white
  const tooltipBorder = resolvedTheme === "dark" ? "#334155" : "#e2e8f0"; // slate-700 / slate-200

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="p-3 border rounded-lg shadow-xl"
          style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
        >
          <p className="font-semibold text-sm mb-1">{label}</p>
          <p className="text-sm font-medium" style={{ color: barColor }}>
            Ingresos: CLP {payload[0].value.toLocaleString("es-CL")}
          </p>
          {payload[0].payload.trips !== undefined && (
             <p className="text-xs text-muted-foreground mt-1">
               Viajes completados: {payload[0].payload.trips}
             </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis 
          dataKey="month" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: textColor, fontSize: 12 }} 
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: textColor, fontSize: 12 }} 
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: resolvedTheme === "dark" ? '#334155' : '#f1f5f9', opacity: 0.4 }} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={50}>
           {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColor} className="transition-all duration-300 hover:opacity-80" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
