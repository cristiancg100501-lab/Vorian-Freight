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
import { Loader2, CheckCircle, Car, Bike, Truck, Fuel, RefreshCw, KeyRound, LineChart as LineChartIcon, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, TrendingUp, Zap, AlertCircle, DollarSign } from "lucide-react";
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
    { value: "camion_3_4", label: "Camión 3/4 (3.5T - 5T)", icon: Truck },
    { value: "Camion Ligero", label: "Camión Rígido (CAT 2)", icon: Truck },
    { value: "Camion Pesado", label: "Tracto-Camión (CAT 3)", icon: Truck },
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
    const [vorianCommission, setVorianCommission] = useState("15");
    const [costoChoferHr, setCostoChoferHr] = useState("9500");
    const [consumoIdleHr, setConsumoIdleHr] = useState("2.5");
    const [costoOportunidadHr, setCostoOportunidadHr] = useState("4500");
    const [rBase, setRBase] = useState("2.5");
    const [costRampla, setCostRampla] = useState("450");
    const [opCostHr, setOpCostHr] = useState("4500");
    const [riskBuffer, setRiskBuffer] = useState("1.15");

    // Table state
    const [tableSearchTerm, setTableSearchTerm] = useState("");
    const [tableCurrentPage, setTableCurrentPage] = useState(1);
    const [settingsHistory, setSettingsHistory] = useState<any[]>([]);
    const [markupPercentage, setMarkupPercentage] = useState(28);
    const ITEMS_PER_PAGE = 10;

    const { data: vehicleRates, isLoading: isLoadingRates } = useSupabaseCollection("vehicleRates", undefined, { realtime: false });

    const { data: globalSettings, isLoading: isLoadingSettings } = useSupabaseDoc("settings", "global");

    const filterFuelPrices = useCallback((q: any) => {
        return q.order("anio", { ascending: false }).order("mes", { ascending: false });
    }, []);
    const { data: fuelPrices, isLoading: isLoadingFuelPrices } = useSupabaseCollection("combustibles", filterFuelPrices, { realtime: false });

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
            setUrgencyMulti((globalSettings as any).urgencyMultiplier?.toString() || "1.2");
            setWeatherMulti((globalSettings as any).weatherMultiplier?.toString() || "1.15");
            setDemandSens((globalSettings as any).demandSensitivity?.toString() || "0.05");
            setVorianCommission((globalSettings as any).vorian_commission?.toString() || "15");
            setCostoChoferHr((globalSettings as any).costo_chofer_hr?.toString() || "9500");
            setConsumoIdleHr((globalSettings as any).consumo_idle_hr?.toString() || "2.5");
            setRBase((globalSettings as any).r_base?.toString() || "2.5");
            setCostRampla((globalSettings as any).cost_rampla?.toString() || "450");
            setOpCostHr((globalSettings as any).costo_oportunidad_hr?.toString() || "4500");
            setRiskBuffer((globalSettings as any).risk_buffer?.toString() || "1.15");
            setCostoOportunidadHr((globalSettings as any).costo_oportunidad_hr?.toString() || "4500");

            // Cargar historial
            supabase.from("settings_history").select("*").order("changed_at", { ascending: false }).limit(5)
                .then(({ data }) => data && setSettingsHistory(data));
        }
    }, [globalSettings, isLoadingSettings, isLoadingRates, supabase]);

    const handleUpdateFromCne = async () => {
        console.log("Iniciando actualización remota desde Edge Function...");
        setIsUpdatingFromCne(true);
        setError(null);
        try {
            // Usamos el Server Action de Next.js en vez de la Edge Function
            const price = await getDieselPrice();
            
            if (price) {
                setDieselCost(price.toString());
                setSuccess("Precio del combustible sincronizado exitosamente con la API CNE.");
            } else {
                setSuccess("Sincronización completada, pero no se encontró el precio.");
            }
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error("Error en sincronización remota:", err);
            setError(err.message || "Fallo al consultar la API de la CNE.");
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
            vorian_commission: parseFloat(vorianCommission) || 15,
            costo_chofer_hr: parseFloat(costoChoferHr) || 9500,
            costo_oportunidad_hr: parseFloat(opCostHr) || 4500,
            consumo_idle_hr: parseFloat(consumoIdleHr) || 2.5,
            r_base: parseFloat(rBase) || 2.5,
            cost_rampla: parseFloat(costRampla) || 450,
            risk_buffer: parseFloat(riskBuffer) || 1.15,
        };

        try {
            const { error: settingsError } = await supabase.from("settings").upsert(settingsToUpdate);
            if (settingsError) throw settingsError;
    
            setSuccess("Ajustes globales y historial de ecuación actualizados.");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError("Error al actualizar los ajustes.");
            console.error("🚨 ERROR SUPABASE:", JSON.stringify(err));
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
                            <CardContent className="space-y-6">
                                 <div>
                                    <Label htmlFor="dieselCostPerLiter">Costo del Combustible (por Litro)</Label>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
                                        <Input id="dieselCostPerLiter" type="number" value={dieselCost} onChange={e => setDieselCost(e.target.value)} placeholder="Ej: 950.5" className="bg-background max-w-xs" step="0.01" />
                                        <Button type="button" variant="outline" onClick={handleUpdateFromCne} disabled={isUpdatingFromCne}>
                                            {isUpdatingFromCne ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                            Actualizar desde CNE
                                        </Button>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Factores de Mercado</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Urgencia (Multi.)</Label>
                                                <Input type="number" value={urgencyMulti} onChange={e => setUrgencyMulti(e.target.value)} step="0.05" className="h-10 bg-background" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Comisión (%)</Label>
                                                <Input type="number" value={vorianCommission} onChange={e => setVorianCommission(e.target.value)} className="h-10 bg-background" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t">
                                        <h3 className="text-sm font-bold flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Calibración Portuaria Pro (v5.0)</h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Chofer ($/hr)</Label>
                                                <Input type="number" value={costoChoferHr} onChange={e => setCostoChoferHr(e.target.value)} className="h-10 bg-background" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Costo OpEx/hr</Label>
                                                <Input type="number" value={opCostHr} onChange={e => setOpCostHr(e.target.value)} className="h-10 bg-background border-yellow-500/30" title="Gastos fijos de la empresa por hora" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Idle (L/hr)</Label>
                                                <Input type="number" value={consumoIdleHr} onChange={e => setConsumoIdleHr(e.target.value)} step="0.1" className="h-10 bg-background" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rendimiento Base</Label>
                                                <Input type="number" value={rBase} onChange={e => setRBase(e.target.value)} step="0.1" className="h-10 bg-background" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Desgaste/km</Label>
                                                <Input type="number" value={costRampla} onChange={e => setCostRampla(e.target.value)} className="h-10 bg-background" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Buffer Riesgo</Label>
                                                <Input type="number" value={riskBuffer} onChange={e => setRiskBuffer(e.target.value)} step="0.05" className="h-10 bg-background border-red-500/30 font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Margen Vorian (%)</Label>
                                                <Input type="number" value={vorianCommission} onChange={e => setVorianCommission(e.target.value)} className="h-10 bg-background border-purple-500/30" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center bg-muted/20 py-4 px-6 border-t">
                                <p className="text-[10px] text-muted-foreground max-w-[250px]">
                                    Los parámetros de la Ecuación Maestra impactan la cotización final en tiempo real.
                                </p>
                                <Button type="submit" disabled={savingStates['global'] || isUpdatingFromCne} className="font-bold shadow-lg">
                                    {savingStates['global'] ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : "Guardar Configuración Master"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2">
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
                        </div>
                        
                        {/* Precios Sugeridos simplificados */}
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-wider">Referencia Mercado</CardTitle>
                                <CardDescription>Precios sugeridos según API CNE.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[380px] overflow-y-auto">
                                    {suggestedPricesData.slice(0, 8).map(item => (
                                        <div key={item.regionName} className="flex justify-between items-center p-3 border-b hover:bg-muted/30 transition-colors">
                                            <span className="text-xs font-medium truncate max-w-[120px]">{item.regionName}</span>
                                            <span className="text-xs font-black text-primary">${item.suggestedPrice.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Eliminamos el Token CNE manual y la tabla gigante para limpiar la vista */}

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

                    {/* NUEVO: Simulador de Rentabilidad Real-Time */}
                    <Card className="mt-8 border-primary/40 bg-primary/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Truck className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl font-black italic">
                                <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                                VORIAN PROFIT SIMULATOR (v5.0)
                            </CardTitle>
                            <CardDescription className="text-primary/70 font-medium">
                                Simulación de rentabilidad basada en los factores maestros configurados arriba.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Inputs de Simulación */}
                                <div className="space-y-6 bg-background/40 p-6 rounded-2xl border border-primary/10">
                                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        Parámetros de Ruta
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold">Distancia (km ida)</Label>
                                            <Input type="number" defaultValue="110" id="sim-dist-v5" className="h-12 bg-background font-mono text-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold">Tiempo de Ruta (hrs)</Label>
                                            <Input type="number" defaultValue="2.5" id="sim-time-v5" className="h-12 bg-background font-mono text-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold">Peajes CAT3 ($)</Label>
                                            <Input type="number" defaultValue="35000" id="sim-tolls-v5" className="h-12 bg-background font-mono text-lg" />
                                        </div>
                                    </div>
                                </div>

                                {/* Resultados Dinámicos */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Bloque Pago Cliente */}
                                        <div className="p-6 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <DollarSign className="w-24 h-24" />
                                            </div>
                                            <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Pago Total Cliente</p>
                                            <h2 className="text-4xl font-black mt-2 tabular-nums">
                                                ${(
                                                    (
                                                        (
                                                            ((parseFloat(dieselCost) || 1250) / (parseFloat(rBase) || 2.5) + (parseFloat(costRampla) || 450)) * (110 * 2)
                                                        )
                                                        + 
                                                        (
                                                            2.5 * (110 > 100 ? 3.0 : 2.2) * (parseFloat(costoChoferHr) + parseFloat(opCostHr) + (parseFloat(consumoIdleHr) * (parseFloat(dieselCost) || 1250)))
                                                        )
                                                    ) * (1 + (parseFloat(vorianCommission) / 100)) * (parseFloat(riskBuffer) || 1.15) + 35000
                                                ).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                            </h2>
                                            <p className="text-[10px] mt-4 font-bold opacity-60">Calculado para 110km San Antonio @ 2.5h</p>
                                        </div>

                                        {/* Bloque Spread Vorian */}
                                        <div className="p-6 rounded-2xl bg-purple-600 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden group border border-white/10">
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Zap className="w-24 h-24" />
                                            </div>
                                            <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Vorian Spread (Ganancia)</p>
                                            <h2 className="text-4xl font-black mt-2 tabular-nums">
                                                ${(
                                                    (parseFloat(vorianCommission) / 100 * 272200) + (parseFloat(opCostHr) * 4.5)
                                                ).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                            </h2>
                                            <div className="mt-4 flex items-center gap-2">
                                                <div className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold uppercase">Incluye OpEx</div>
                                                <div className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold uppercase">Margen Real</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de Distribución */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <p className="text-xs font-black uppercase tracking-tighter text-muted-foreground">Distribución del Flete</p>
                                            <span className="text-[10px] font-bold text-green-500">Transportista Satisfecho ✓</span>
                                        </div>
                                        <div className="h-6 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
                                            <div className="h-full bg-red-500 w-[45%] flex items-center justify-center text-[8px] font-bold text-white uppercase" title="Combustible y Desgaste">Costos Camión</div>
                                            <div className="h-full bg-blue-500 w-[20%] flex items-center justify-center text-[8px] font-bold text-white uppercase" title="Sueldo Chofer">Chofer</div>
                                            <div className="h-full bg-purple-500 w-[25%] flex items-center justify-center text-[8px] font-bold text-white uppercase" title="Comisión y OpEx">Vorian</div>
                                            <div className="h-full bg-yellow-500 w-[10%] flex items-center justify-center text-[8px] font-bold text-white uppercase" title="Fondo de Riesgo">Risk Buffer</div>
                                        </div>
                                        <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase pt-2">
                                            <span>Camión: 45%</span>
                                            <span>Chofer: 20%</span>
                                            <span>Vorian: 25%</span>
                                            <span>Riesgo: 10%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECCIÓN DE HISTORIAL DE ECUACIÓN MAESTRA */}
                    <Card className="mt-8 border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-primary" /> Historial de Cambios (Ecuación Maestra)
                            </CardTitle>
                            <CardDescription>Últimos 5 ajustes realizados a los factores de la tarifa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-primary/20 text-muted-foreground uppercase font-black tracking-[0.1em]">
                                            <th className="py-2 text-left">Fecha de Cambio</th>
                                            <th className="py-2 text-right">Comisión</th>
                                            <th className="py-2 text-right">Rendimiento</th>
                                            <th className="py-2 text-right">Desgaste/km</th>
                                            <th className="py-2 text-right">Chofer/hr</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {settingsHistory.map((h, i) => (
                                            <tr key={h.id || i} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                                                <td className="py-2 font-bold">{format(new Date(h.changed_at), "d MMM, HH:mm", { locale: es })}</td>
                                                <td className="py-2 text-right font-mono font-bold text-purple-600">{h.vorian_commission || h.vorianCommission || h.voriancommission}%</td>
                                                <td className="py-2 text-right font-mono font-bold text-blue-600">{h.r_base} km/L</td>
                                                <td className="py-2 text-right font-mono font-bold">${h.cost_rampla}</td>
                                                <td className="py-2 text-right font-mono font-bold">${h.costo_chofer_hr}</td>
                                            </tr>
                                        ))}
                                        {settingsHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-muted-foreground italic">No hay cambios registrados aún. Intenta guardar una nueva configuración.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
