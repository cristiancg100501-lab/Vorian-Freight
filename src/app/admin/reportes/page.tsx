"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Loader2 } from "lucide-react";

// Helper to get month name in Spanish, ensuring uppercase start
const getMonthName = (monthIndex: number) => {
    const monthName = format(new Date(2000, monthIndex), 'LLL', { locale: es });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

// Function to format fuel/region names for display
const formatDisplayName = (name: string) => {
    if (!name) return '';
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function ReportesPage() {
  const firestore = useFirestore();
  const [fuelType, setFuelType] = useState('petroleo_diesel');
  const [selectedRegion, setSelectedRegion] = useState('all'); // State for region filter

  const fuelPricesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "combustibles"),
      orderBy("anio", "asc"),
      orderBy("mes", "asc")
    );
  }, [firestore]);

  const { data: fuelPrices, isLoading } = useCollection(fuelPricesQuery);

  // Get unique fuel types and regions for the filter dropdowns
  const { uniqueFuelTypes, uniqueRegions } = useMemo(() => {
    if (!fuelPrices) return { uniqueFuelTypes: [], uniqueRegions: [] };
    
    const types = new Set<string>();
    const regions = new Set<string>();

    fuelPrices.forEach((p: any) => {
        if (p.tipo_combustible) types.add(p.tipo_combustible);
        if (p.region_nombre) regions.add(p.region_nombre);
    });

    const sortedTypes = Array.from(types).sort((a, b) => {
        if (a === 'petroleo_diesel') return -1;
        if (b === 'petroleo_diesel') return 1;
        return a.localeCompare(b);
    });
    
    const sortedRegions = Array.from(regions).sort((a, b) => {
        if (a.includes('Metropolitana')) return -1;
        if (b.includes('Metropolitana')) return 1;
        return a.localeCompare(b);
    });

    return { uniqueFuelTypes: sortedTypes, uniqueRegions: sortedRegions };
  }, [fuelPrices]);

  const chartData = useMemo(() => {
    if (!fuelPrices) return [];

    // 1. Filter by the selected fuel type and region
    const filteredRecords = fuelPrices.filter((record: any) => {
        const fuelMatch = record.tipo_combustible === fuelType;
        const regionMatch = selectedRegion === 'all' || record.region_nombre === selectedRegion;
        return fuelMatch && regionMatch;
    });

    // 2. Group prices by year and month for the filtered records
    const groupedData: { [key: string]: { [key: number]: number[] } } = {};
    filteredRecords.forEach((record: any) => {
      const year = record.anio;
      const month = record.mes - 1; // month from data is 1-based
      const priceString = record.precio_por_litro || "0";
      const price = parseFloat(priceString.toString().replace(',', '.'));

      if (!year || !record.mes || isNaN(price)) return;

      const yearKey = year.toString();
      if (!groupedData[yearKey]) {
        groupedData[yearKey] = {};
      }
      if (!groupedData[yearKey][month]) {
        groupedData[yearKey][month] = [];
      }
      groupedData[yearKey][month].push(price);
    });

    // 3. Calculate average price for each month (within the selected filters)
    const averagedData: { [key: string]: { [key: number]: number } } = {};
    Object.keys(groupedData).forEach(year => {
        averagedData[year] = {};
        Object.keys(groupedData[year]).forEach(monthStr => {
            const month = parseInt(monthStr, 10);
            const prices = groupedData[year][month];
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            averagedData[year][month] = avg;
        });
    });

    // 4. Format for Recharts, ensuring all 12 months are on the X-axis
    const allYears = Object.keys(averagedData).sort();
    const formattedData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthData: { [key: string]: string | number | null } = {
        month: getMonthName(monthIndex),
      };
      allYears.forEach(year => {
        monthData[year] = averagedData[year]?.[monthIndex] || null;
      });
      return monthData;
    });

    return formattedData;
  }, [fuelPrices, fuelType, selectedRegion]);

  const years = useMemo(() => {
      if(!chartData || chartData.length === 0) return [];
      const yearsWithData = new Set<string>();
      chartData.forEach(monthData => {
        Object.keys(monthData).forEach(key => {
          if (key !== 'month' && monthData[key] !== null) {
            yearsWithData.add(key);
          }
        });
      });
      return Array.from(yearsWithData).sort();
  }, [chartData]);
  
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#387908"];

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                  <CardTitle>Historial de Precios del Combustible</CardTitle>
                  <CardDescription className="mt-1">
                    Tendencia de los precios del combustible a lo largo del tiempo, por año.
                  </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select onValueChange={setFuelType} defaultValue={fuelType}>
                    <SelectTrigger className="w-full sm:min-w-[200px]">
                        <SelectValue placeholder="Seleccionar combustible" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueFuelTypes.map(type => (
                            <SelectItem key={type} value={type}>
                                {formatDisplayName(type)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select onValueChange={setSelectedRegion} defaultValue={selectedRegion}>
                    <SelectTrigger className="w-full sm:min-w-[220px]">
                        <SelectValue placeholder="Seleccionar región" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Regiones (Promedio)</SelectItem>
                        {uniqueRegions.map(region => (
                            <SelectItem key={region} value={region}>
                                {formatDisplayName(region)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && years.length === 0 && (
              <div className="flex justify-center items-center h-80 text-muted-foreground">
                  No hay datos de precios para los filtros seleccionados.
              </div>
          )}
          {!isLoading && years.length > 0 && (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <defs>
                    {years.map((year, index) => (
                        <linearGradient key={year} id={`color${year}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0}/>
                        </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} stroke="hsl(var(--border))"/>
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                    fontSize={12} 
                    tickFormatter={(value) => `$${Math.round(value)}`} 
                    stroke="hsl(var(--border))" 
                    domain={['dataMin - 50', 'dataMax + 50']}
                  />
                  <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--popover-foreground))'
                    }}
                    formatter={(value: any, name: any) => value ? [`$${(value as number).toLocaleString('es-CL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, `Precio ${name}`] : [null, null]}
                  />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                  {years.map((year, index) => (
                      <Area
                        key={year}
                        type="monotone"
                        dataKey={year}
                        stroke={colors[index % colors.length]}
                        fill={`url(#color${year})`}
                        strokeWidth={2}
                        connectNulls
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
