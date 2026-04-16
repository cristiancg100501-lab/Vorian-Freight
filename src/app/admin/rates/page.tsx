"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useUser, useSupabase } from "@/components/providers/supabase-provider";
import { useSupabaseDoc, useSupabaseCollection } from "@/hooks/supabase-hooks";
import { getDieselPrice } from '@/services/cne-api';
import { getCneToken } from '@/services/server-token';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, Car, Bike, Truck, Fuel, RefreshCw, KeyRound, LineChart as LineChartIcon, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, TrendingUp, Zap, AlertCircle } from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


const vehicleTypes = [
    { value: "Auto", label: "Auto", icon: Car },
    { value: "Motocicleta", label: "Motocicleta", icon: Bike },
    { value: "Van", label: "Van", icon: Truck },
    { value: "Furgon", label: "Furgón", icon: Truck },
    { value: "Camion Ligero", label: "Camión Ligero", icon: Truck },
    { value: "Camion Pesado", label: "Camión Pesado", icon: Truck },
];

// Helper to get month name in Spanish, ensuring uppercase start
const getMonthName = (monthIndex: number) => {
    if (monthIndex < 0 || monthIndex > 11) return '';
    const monthName = format(new Date(2000, monthIndex), 'LLL', { locale: es });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

// Function to format fuel/region names for display
const formatDisplayName = (name: string) => {
    if (!name) return '';
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}


const VehicleRateCard = ({ vehicleId, label, icon: Icon, initialRates, onSave, isSaving }: { vehicleId: string, label: string, icon: React.ElementType, initialRates: any, onSave: (vehicleId: string, rates: any) => void, isSaving: boolean }) => {
    const [rates, setRates] = useState({
        baseFare: "",
        costPerKm: "",
        costPerMinute: "",
        fuelEfficiency: "",
        maxPayload: "",
        overnightStay: "",
    });

    useEffect(() => {
        setRates({
            baseFare: initialRates?.baseFare?.toString() || "",
            costPerKm: initialRates?.costPerKm?.toString() || "",
            costPerMinute: initialRates?.costPerMinute?.toString() || "",
            fuelEfficiency: initialRates?.fuelEfficiency?.toString() || "",
            maxPayload: initialRates?.maxPayload?.toString() || "",
            overnightStay: initialRates?.overnightStay?.toString() || "",
        });
    }, [initialRates]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(vehicleId, {
            baseFare: parseFloat(rates.baseFare) || 0,
            costPerKm: parseFloat(rates.costPerKm) || 0,
            costPerMinute: parseFloat(rates.costPerMinute) || 0,
            fuelEfficiency: parseFloat(rates.fuelEfficiency) || 0,
            maxPayload: parseFloat(rates.maxPayload) || 0,
            overnightStay: parseFloat(rates.overnightStay) || 0,
        });
    };

    return (
        <Card className="bg-card border text-card-foreground flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Icon className="w-6 h-6 text-muted-foreground" /> {label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                     <div>
                        <Label htmlFor={`baseFare-${vehicleId}`} className="text-sm">Tarifa Base</Label>
                        <Input id={`baseFare-${vehicleId}`} type="number" value={rates.baseFare} onChange={e => setRates({...rates, baseFare: e.target.value})} placeholder="Ej: 25000" className="mt-1 bg-background" step="0.01" />
                    </div>
                     <div>
                        <Label htmlFor={`costPerKm-${vehicleId}`} className="text-sm">Costo de Desgaste (por Km)</Label>
                        <Input id={`costPerKm-${vehicleId}`} type="number" value={rates.costPerKm} onChange={e => setRates({...rates, costPerKm: e.target.value})} placeholder="Ej: 850" className="mt-1 bg-background" step="0.01" />
                    </div>
                     <div>
                        <Label htmlFor={`costPerMinute-${vehicleId}`} className="text-sm">Costo de Tiempo (por Minuto)</Label>
                        <Input id={`costPerMinute-${vehicleId}`} type="number" value={rates.costPerMinute} onChange={e => setRates({...rates, costPerMinute: e.target.value})} placeholder="Ej: 50" className="mt-1 bg-background" step="0.01" />
                    </div>
                    <div>
                        <Label htmlFor={`fuelEfficiency-${vehicleId}`} className="text-sm">Rendimiento (km/L)</Label>
                        <Input id={`fuelEfficiency-${vehicleId}`} type="number" value={rates.fuelEfficiency} onChange={e => setRates({...rates, fuelEfficiency: e.target.value})} placeholder="Ej: 4.5" className="mt-1 bg-background" step="0.1" required />
                    </div>
                    <div>
                        <Label htmlFor={`maxPayload-${vehicleId}`} className="text-sm">Carga Máxima (kg)</Label>
                        <Input id={`maxPayload-${vehicleId}`} type="number" value={rates.maxPayload} onChange={e => setRates({...rates, maxPayload: e.target.value})} placeholder="Ej: 10000" className="mt-1 bg-background" step="1" />
                    </div>
                     <div>
                        <Label htmlFor={`overnightStay-${vehicleId}`} className="text-sm">Recargo por Pernoctar</Label>
                        <Input id={`overnightStay-${vehicleId}`} type="number" value={rates.overnightStay} onChange={e => setRates({...rates, overnightStay: e.target.value})} placeholder="Ej: 40000" className="mt-1 bg-background" step="0.01" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving} className="w-full">
                        {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : "Guardar"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};


export default function AdminRatesPage() {
    const { supabase } = useSupabase();
    const { user } = useUser();
    const [dieselCost, setDieselCost] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isUpdatingFromCne, setIsUpdatingFromCne] = useState(false);
    const [cneToken, setCneToken] = useState<string | null>(null);
    const [isFetchingToken, setIsFetchingToken] = useState(false);
    const [fuelType, setFuelType] = useState('petroleo_diesel');
    const [selectedRegion, setSelectedRegion] = useState('all');

    // Intelligence Factors
    const [urgencyMulti, setUrgencyMulti] = useState("1.2");
    const [weatherMulti, setWeatherMulti] = useState("1.15");
    const [demandSens, setDemandSens] = useState("0.05");

    // Table state
    const [tableSearchTerm, setTableSearchTerm] = useState("");
    const [tableCurrentPage, setTableCurrentPage] = useState(1);
    const [markupPercentage, setMarkupPercentage] = useState(28);
    const ITEMS_PER_PAGE = 10;

    const { data: vehicleRates, isLoading: isLoadingRates } = useSupabaseCollection("vehicleRates");

    const { data: globalSettings, isLoading: isLoadingSettings } = useSupabaseDoc("settings", "global");

    const filterFuelPrices = useCallback((q: any) => {
        return q.order("anio", { ascending: false }).order("mes", { ascending: false });
    }, []);
    const { data: fuelPrices, isLoading: isLoadingFuelPrices } = useSupabaseCollection("combustibles", filterFuelPrices);

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


    const fuelChartData = useMemo(() => {
        if (!fuelPrices || fuelPrices.length < 1) return { data: [], latestPrice: 0, trend: 0, years: [] };

        const filteredRecords = fuelPrices.filter((record: any) => {
            const fuelMatch = record.tipo_combustible === fuelType;
            const regionMatch = selectedRegion === 'all' || record.region_nombre === selectedRegion;
            return fuelMatch && regionMatch;
        });
        
        const monthlyAverages: { [key: string]: { prices: number[], date: Date } } = {};
        filteredRecords.forEach((record: any) => {
            const rawPrice = record.precio_por_litro;
            const price = typeof rawPrice === 'number' ? rawPrice : parseFloat((rawPrice || "0").toString().replace(',', '.'));
            if (isNaN(price) || price === 0) return;
            const key = `${record.anio}-${record.mes}`;
            const date = new Date(record.anio, record.mes - 1);
            if (!monthlyAverages[key]) {
                monthlyAverages[key] = { prices: [], date };
            }
            monthlyAverages[key].prices.push(price);
        });

        const chartPoints = Object.keys(monthlyAverages).map(key => {
            const entry = monthlyAverages[key];
            const avgPrice = entry.prices.reduce((a, b) => a + b, 0) / entry.prices.length;
            return { date: entry.date, price: avgPrice };
        }).sort((a, b) => a.date.getTime() - b.date.getTime());

        if (chartPoints.length === 0) {
            return { data: [], latestPrice: 0, trend: 0, years: [] };
        }

        const averagedDataByYear: { [key: string]: { [key: number]: number } } = {};
        chartPoints.forEach(point => {
            const year = point.date.getFullYear().toString();
            const month = point.date.getMonth();
            if (!averagedDataByYear[year]) {
                averagedDataByYear[year] = {};
            }
            averagedDataByYear[year][month] = point.price;
        });
        
        const allYears = Object.keys(averagedDataByYear).sort();
        const formattedData = Array.from({ length: 12 }, (_, monthIndex) => {
            const monthData: { [key: string]: string | number | null } = {
                month: getMonthName(monthIndex),
            };
            allYears.forEach(year => {
                monthData[year] = averagedDataByYear[year]?.[monthIndex] || null;
            });
            return monthData;
        });

        const latestPrice = chartPoints[chartPoints.length - 1].price;
        let trend = 0;

        if (chartPoints.length >= 2) {
            const previousPrice = chartPoints[chartPoints.length - 2].price;
            if (previousPrice > 0) {
                trend = ((latestPrice - previousPrice) / previousPrice) * 100;
            }
        }
        
        return { data: formattedData, years: allYears, latestPrice, trend };
    }, [fuelPrices, fuelType, selectedRegion]);

    // Table data processing
    const filteredFuelData = useMemo(() => {
        if (!fuelPrices) return [];
        return (fuelPrices as any[]).filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(tableSearchTerm.toLowerCase())
            )
        );
    }, [fuelPrices, tableSearchTerm]);

    const paginatedFuelData = useMemo(() => {
        const startIndex = (tableCurrentPage - 1) * ITEMS_PER_PAGE;
        return filteredFuelData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredFuelData, tableCurrentPage]);

    const totalTablePages = Math.ceil(filteredFuelData.length / ITEMS_PER_PAGE);

    const suggestedPricesData = useMemo(() => {
        if (!fuelPrices || fuelPrices.length === 0) return [];
    
        const latestPricesByRegion: { [key: string]: any } = {};
    
        const filteredByFuel = fuelPrices.filter((p: any) => p.tipo_combustible === fuelType);
    
        for (const record of filteredByFuel) {
            const region = record.region_nombre;
            const recordDate = new Date(record.anio, record.mes - 1);
    
            if (!latestPricesByRegion[region] || recordDate > latestPricesByRegion[region].date) {
                const rawPrice = record.precio_por_litro;
                const price = typeof rawPrice === 'number' ? rawPrice : parseFloat((rawPrice || "0").toString().replace(',', '.'));
                if (!isNaN(price) && price > 0) {
                    latestPricesByRegion[region] = {
                        date: recordDate,
                        basePrice: price,
                        regionName: formatDisplayName(region),
                        suggestedPrice: price * (1 + markupPercentage / 100)
                    };
                }
            }
        }
    
        return Object.values(latestPricesByRegion).sort((a, b) => a.regionName.localeCompare(b.regionName));
    
    }, [fuelPrices, fuelType, markupPercentage]);

    useEffect(() => {
        setIsLoading(isLoadingRates || isLoadingSettings);
        if (globalSettings) {
            setDieselCost((globalSettings as any).dieselCostPerLiter?.toString() || "");
            setUrgencyMulti((globalSettings as any).urgencyMultiplier?.toString() || "1.2");
            setWeatherMulti((globalSettings as any).weatherMultiplier?.toString() || "1.15");
            setDemandSens((globalSettings as any).demandSensitivity?.toString() || "0.05");
        }
    }, [globalSettings, isLoadingSettings, isLoadingRates]);

    const handleUpdateFromCne = async () => {
        console.log("Iniciando actualización remota desde Edge Function...");
        setIsUpdatingFromCne(true);
        setError(null);
        try {
            // Invocamos la Edge Function de Supabase
            const { data, error: funcError } = await supabase.functions.invoke('sync-diesel-price');
            
            if (funcError) throw funcError;
            
            if (data.price) {
                setDieselCost(data.price.toString());
                setSuccess("Precio del combustible sincronizado exitosamente vía Edge Function.");
            } else {
                setSuccess("Sincronización completada exitosamente.");
            }
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error("Error en sincronización remota:", err);
            setError(err.message || "Fallo al ejecutar la sincronización automática en Supabase.");
        } finally {
            setIsUpdatingFromCne(false);
        }
    };

    const handleGetCneToken = async () => {
        setIsFetchingToken(true);
        setError(null);
        setSuccess(null);
        setCneToken(null);
        try {
            const result = await getCneToken();
            if (result.success && result.token) {
                setCneToken(result.token);
                setSuccess("Token de CNE obtenido correctamente.");
            } else {
                throw new Error(result.error || "Respuesta inválida desde el servidor de tokens.");
            }
        } catch (err: any) {
            setError(err.message || "No se pudo obtener el token de CNE.");
        } finally {
            setIsFetchingToken(false);
            setTimeout(() => setSuccess(null), 4000);
        }
    };
    
    const handleSaveVehicleRate = async (vehicleId: string, newRates: any) => {
        if (!user) {
          setError("No se puede guardar. Usuario no disponible.");
          return;
        }
        setSavingStates(prev => ({ ...prev, [vehicleId]: true }));
        setError(null);
        setSuccess(null);
    
        try {
          const { error: upsertError } = await supabase.from("vehicleRates").upsert({
            ...newRates,
            id: vehicleId,
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedByUserId: user.id,
          });
          if (upsertError) throw upsertError;
          
          setSuccess(`Tarifas para ${vehicleId} actualizadas.`);
          setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
          setError(`Error al actualizar ${vehicleId}.`);
          console.error(err);
        } finally {
          setSavingStates(prev => ({ ...prev, [vehicleId]: false }));
        }
    };

    const handleSaveGlobalSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("No se puede guardar. Usuario no disponible.");
            return;
        }
        setSavingStates(prev => ({ ...prev, global: true }));
        setError(null);
        setSuccess(null);

        const price = parseFloat(dieselCost) || 0;

        const settingsToUpdate = {
            id: "global",
            dieselCostPerLiter: price,
            urgencyMultiplier: parseFloat(urgencyMulti) || 1.2,
            weatherMultiplier: parseFloat(weatherMulti) || 1.15,
            demandSensitivity: parseFloat(demandSens) || 0.05,
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedByUserId: user.id,
        };

        try {
            const { error: settingsError } = await supabase.from("settings").upsert(settingsToUpdate);
            if (settingsError) throw settingsError;
    
            const { error: historyError } = await supabase.from("precios_combustible").insert({
                pricePerLiter: price,
                updatedByUserId: user.id,
                createdAt: new Date().toISOString(),
            });
            if (historyError) throw historyError;

            setSuccess("Ajustes globales y registro de precio actualizados.");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError("Error al actualizar los ajustes.");
            console.error(err);
        } finally {
            setSavingStates(prev => ({ ...prev, global: false }));
        }
    };
    
    const ratesMap = useMemo(() => 
        vehicleRates?.reduce((acc, rate) => {
            acc[rate.id] = rate;
            return acc;
        }, {} as {[key: string]: any})
    , [vehicleRates]);

    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#387908"];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">APIs y tarifas</h1>
                <p className="text-muted-foreground mt-1">
                    Ajuste las tarifas que se utilizan para calcular el costo de los fletes para cada tipo de vehículo.
                </p>
            </div>
            {error && <p className="mb-4 text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
            {success && <p className="mb-4 text-green-700 bg-green-500/10 p-3 rounded-md flex items-center gap-2"><CheckCircle className="h-5 w-5"/>{success}</p>}

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-8">
                    <Card>
                        <form onSubmit={handleSaveGlobalSettings}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3"><Fuel className="w-6 h-6 text-muted-foreground"/> Ajustes Globales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <Label htmlFor="dieselCostPerLiter">Costo del Combustible (por Litro)</Label>
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
                                     <Input id="dieselCostPerLiter" type="number" value={dieselCost} onChange={e => setDieselCost(e.target.value)} placeholder="Ej: 950.5" className="bg-background max-w-xs" step="0.01" />
                                     <Button type="button" variant="outline" onClick={handleUpdateFromCne} disabled={isUpdatingFromCne}>
                                         {isUpdatingFromCne ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                         Actualizar desde CNE
                                     </Button>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-yellow-500" />
                                            <Label htmlFor="urgencyMulti" className="font-bold text-xs uppercase tracking-wider">Urgencia</Label>
                                        </div>
                                        <Input id="urgencyMulti" type="number" value={urgencyMulti} onChange={e => setUrgencyMulti(e.target.value)} placeholder="Ej: 1.2" className="bg-background h-9 text-sm" step="0.01" />
                                        <p className="text-[9px] text-muted-foreground leading-none italic">Recargo (&lt;24h)</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-blue-500" />
                                            <Label htmlFor="weatherMulti" className="font-bold text-xs uppercase tracking-wider">Clima/Zona</Label>
                                        </div>
                                        <Input id="weatherMulti" type="number" value={weatherMulti} onChange={e => setWeatherMulti(e.target.value)} placeholder="Ej: 1.15" className="bg-background h-9 text-sm" step="0.01" />
                                        <p className="text-[9px] text-muted-foreground leading-none italic">Recargo rutas complejas</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-500" />
                                            <Label htmlFor="demandSens" className="font-bold text-xs uppercase tracking-wider">Demanda</Label>
                                        </div>
                                        <Input id="demandSens" type="number" value={demandSens} onChange={e => setDemandSens(e.target.value)} placeholder="Ej: 0.05" className="bg-background h-9 text-sm" step="0.01" />
                                        <p className="text-[9px] text-muted-foreground leading-none italic">Fluctuación saturación</p>
                                    </div>
                                 </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center bg-muted/20 py-4 px-6 border-t">
                                <p className="text-[10px] text-muted-foreground max-w-[250px]">
                                    Los multiplicadores dinámicos impactan la cotización final del cliente en tiempo real.
                                </p>
                                <Button type="submit" disabled={savingStates['global'] || isUpdatingFromCne} className="font-bold shadow-lg">
                                    {savingStates['global'] ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : "Guardar Configuración Master"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-3">
                                            <LineChartIcon className="w-6 h-6 text-muted-foreground" /> Tendencia del Precio del Combustible
                                        </CardTitle>
                                        <CardDescription>
                                            Evolución histórica de precios por tipo de combustible y región.
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
                                {isLoadingFuelPrices ? (
                                    <div className="flex justify-center items-center h-48">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : !fuelChartData.data || fuelChartData.years.length === 0 ? (
                                    <div className="flex justify-center items-center h-48 text-muted-foreground">
                                        No hay datos de precios para los filtros seleccionados.
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-3xl font-bold">${fuelChartData.latestPrice.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                                            {fuelChartData.years.length >= 1 && fuelChartData.data.length >= 2 &&
                                                <div className={`flex items-center text-sm font-semibold ${fuelChartData.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {fuelChartData.trend >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                                    {fuelChartData.trend.toFixed(2)}%
                                                </div>
                                            }
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {fuelChartData.data.length >= 2 ? "Respecto al mes anterior" : "Último precio promedio registrado"}
                                        </p>
                                        <div className="h-48 w-full mt-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={fuelChartData.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                    <defs>
                                                        {fuelChartData.years.map((year, index) => (
                                                            <linearGradient key={year} id={`color${year}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8}/>
                                                                <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0}/>
                                                            </linearGradient>
                                                        ))}
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                                    <XAxis 
                                                        dataKey="month"
                                                        stroke="hsl(var(--muted-foreground))" 
                                                        fontSize={10} 
                                                        tickLine={false} 
                                                        axisLine={false}
                                                    />
                                                    <YAxis 
                                                        stroke="hsl(var(--muted-foreground))" 
                                                        fontSize={10} 
                                                        tickLine={false} 
                                                        axisLine={false} 
                                                        tickFormatter={(value) => `$${Math.round(value)}`}
                                                        domain={['dataMin - 20', 'dataMax + 20']}
                                                        width={40}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'hsl(var(--popover))',
                                                            borderColor: 'hsl(var(--border))',
                                                            color: 'hsl(var(--popover-foreground))',
                                                            borderRadius: 'var(--radius)'
                                                        }}
                                                        formatter={(value:any, name:any) => value ? [`$${(value as number).toLocaleString('es-CL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, `Promedio ${name}`] : [null, null]}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: '10px' }} />
                                                    {fuelChartData.years.map((year, index) => (
                                                        <Area
                                                            key={year}
                                                            type="monotone"
                                                            dataKey={year}
                                                            stroke={colors[index % colors.length]}
                                                            fill={`url(#color${year})`}
                                                            strokeWidth={2}
                                                            dot={false}
                                                            connectNulls
                                                            activeDot={{ r: 6 }}
                                                        />
                                                    ))}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Datos Detallados de Combustible</CardTitle>
                                <CardDescription>Busca y filtra todos los registros de precios.</CardDescription>
                                <div className="pt-2">
                                    <Input
                                        placeholder="Buscar por región, tipo, precio..."
                                        value={tableSearchTerm}
                                        onChange={e => setTableSearchTerm(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Año</th>
                                            <th scope="col" className="px-4 py-3">Mes</th>
                                            <th scope="col" className="px-4 py-3">Región</th>
                                            <th scope="col" className="px-4 py-3">Combustible</th>
                                            <th scope="col" className="px-4 py-3 text-right">Precio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoadingFuelPrices ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Cargando datos...</td></tr>
                                        ) : paginatedFuelData.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No hay datos para mostrar.</td></tr>
                                        ) : (
                                        paginatedFuelData.map((item: any) => (
                                            <tr key={item.key || item.id} className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 font-medium">{item.anio}</td>
                                                <td className="px-4 py-3">{getMonthName(item.mes - 1)}</td>
                                                <td className="px-4 py-3">{formatDisplayName(item.region_nombre)}</td>
                                                <td className="px-4 py-3">{formatDisplayName(item.tipo_combustible)}</td>
                                                <td className="px-4 py-3 text-right font-mono">
                                                    ${(typeof item.precio_por_litro === 'number' ? item.precio_por_litro : parseFloat((item.precio_por_litro || "0").toString().replace(',', '.'))).toLocaleString('es-CL')}
                                                </td>
                                            </tr>
                                        ))
                                        )}
                                    </tbody>
                                </table>
                                </div>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Mostrando {paginatedFuelData.length > 0 ? (tableCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(tableCurrentPage * ITEMS_PER_PAGE, filteredFuelData.length)} de {filteredFuelData.length} resultados
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setTableCurrentPage(p => Math.max(1, p-1))} disabled={tableCurrentPage === 1 || totalTablePages === 0}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium">{totalTablePages > 0 ? tableCurrentPage : 0} / {totalTablePages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setTableCurrentPage(p => Math.min(totalTablePages, p+1))} disabled={tableCurrentPage === totalTablePages || totalTablePages === 0}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><KeyRound className="w-6 h-6 text-muted-foreground"/> Obtención de Token CNE</CardTitle>
                            <CardDescription>
                                Obtén un nuevo token de autenticación para la API de CNE. Este token se usa para las consultas de precios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {cneToken && (
                                <div className="space-y-2">
                                <Label>Token Obtenido</Label>
                                <Textarea readOnly value={cneToken} className="h-24 font-mono text-xs bg-muted/50" />
                                <p className="text-xs text-muted-foreground">
                                    El token se ha generado y se usará para las siguientes peticiones.
                                </p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                             <Button onClick={handleGetCneToken} disabled={isFetchingToken}>
                                {isFetchingToken ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Obteniendo...</> : "Obtener Token"}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><TrendingUp className="w-6 h-6 text-muted-foreground" /> Precios de Venta Sugeridos</CardTitle>
                            <CardDescription>
                                Último precio base registrado para <span className="font-semibold">{formatDisplayName(fuelType)}</span> por región, con un incremento sugerido personalizable.
                            </CardDescription>
                            <div className="pt-4 flex items-center gap-4">
                                <Label className="whitespace-nowrap">Margen de Ganancia (%):</Label>
                                <Input 
                                    type="number" 
                                    value={markupPercentage} 
                                    onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                                    className="w-24"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingFuelPrices ? (
                                <div className="flex justify-center items-center h-24">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                             ) : suggestedPricesData.length === 0 ? (
                                <p className="text-muted-foreground text-sm text-center py-8">No hay datos suficientes para calcular precios.</p>
                            ) : (
                                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                    {suggestedPricesData.map(item => (
                                        <div key={item.regionName} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                                            <div>
                                                <p className="font-semibold">{item.regionName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Base: ${item.basePrice.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-primary">
                                                    ${item.suggestedPrice.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                </p>
                                                <p className="text-xs text-green-500 font-semibold">+{markupPercentage}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Tarifas de Vehículos</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {vehicleTypes.map(vehicle => (
                                <VehicleRateCard 
                                    key={vehicle.value}
                                    vehicleId={vehicle.value}
                                    label={vehicle.label}
                                    icon={vehicle.icon}
                                    initialRates={ratesMap?.[vehicle.value]}
                                    onSave={handleSaveVehicleRate}
                                    isSaving={!!savingStates[vehicle.value]}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
