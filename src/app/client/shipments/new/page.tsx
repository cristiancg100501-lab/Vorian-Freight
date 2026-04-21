'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSupabase, useUser } from '@/components/providers/supabase-provider';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Layers, Calendar as CalendarIcon, MapPin, ArrowRight, ArrowLeft, Upload, Package, Ruler, Weight, Check, Star, Bolt, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { getTollsForRoute } from '@/utils/tollsEngine';
import Map from '@/components/map';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

// --- VORIAN FAVORITE PORTS ---
const VORIAN_PORTS = [
    { 
        id: 'vorian-sti', 
        place_name: 'Puerto STI (San Antonio Terminal Internacional), Chile', 
        center: [-71.6111, -33.5857], // Slightly adjusted for better snapping
        is_port: true
    },
    { 
        id: 'vorian-dpworld', 
        place_name: 'Puerto DP WORLD (San Antonio), Chile', 
        center: [-71.6214, -33.5843], // Slightly adjusted for better snapping
        is_port: true
    }
];

const Stepper = ({ step }: { step: number }) => (
  <ol className="flex items-center w-full">
    <li className={cn("flex w-full items-center", step > 1 ? "text-primary dark:text-primary" : "")}>
      <div className="flex items-center w-full">
        <span className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {step > 1 ? <Check className="w-4 h-4" /> : '1'}
        </span>
        <span className={cn("ml-4 font-medium", step >= 1 ? "text-foreground" : "text-muted-foreground")}>Ruta y Horario</span>
      </div>
      <div className="w-full h-px bg-border mx-4"></div>
    </li>
    <li className={cn("flex w-full items-center", step > 2 ? "text-primary dark:text-primary" : "")}>
      <div className="flex items-center w-full">
        <span className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
           {step > 2 ? <Check className="w-4 h-4" /> : '2'}
        </span>
        <span className={cn("ml-4 font-medium", step >= 2 ? "text-foreground" : "text-muted-foreground")}>Detalles de Carga</span>
      </div>
       <div className="w-full h-px bg-border mx-4"></div>
    </li>
    <li className="flex w-full items-center">
       <div className="flex items-center w-full">
        <span className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
           {step > 3 ? <Check className="w-4 h-4" /> : '3'}
        </span>
        <span className={cn("ml-4 font-medium", step >= 3 ? "text-foreground" : "text-muted-foreground")}>Opciones y Reserva</span>
      </div>
    </li>
  </ol>
);

const EquipmentButton = ({ icon, label, selected, onClick }: any) => (
    <Button
        variant="outline"
        type="button"
        className={cn(
            "flex-1 flex items-center justify-center gap-2 h-auto py-3 px-4 text-center",
            selected ? 'border-primary bg-primary/5 ring-1 ring-primary z-10' : 'border-border bg-muted/30 hover:bg-muted/70'
        )}
        onClick={onClick}
    >
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </Button>
);

export default function NewClientShipmentPage() {
    const { supabase } = useSupabase();
    const { user } = useUser();
    const router = useRouter();

    // Multi-step form state
    const [step, setStep] = useState(1);

    // Step 1 State
    const [equipment, setEquipment] = useState('Dry van');
    const [isInternalShipment, setIsInternalShipment] = useState(false);
    const [pickup, setPickup] = useState({ address: '', coords: null as any });
    const [delivery, setDelivery] = useState({ address: '', coords: null as any });
    const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    const [pickupWindow, setPickupWindow] = useState('8:00 AM - 12:00 PM');
    const [deliveryWindow, setDeliveryWindow] = useState('1:00 PM - 5:00 PM');
    const [vehicleType, setVehicleType] = useState('Camion Rampla');
    const [serviceType, setServiceType] = useState('FTL');
    const [weatherCondition, setWeatherCondition] = useState('Clear');
    const [pickupRegionCod, setPickupRegionCod] = useState<number | null>(null);

    // Mapeador Mapbox ISO -> CNE Region Code
    const CHILE_REGIONS_MAP: Record<string, number> = {
        'CL-TA': 1, 'CL-AN': 2, 'CL-AT': 3, 'CL-CO': 4, 'CL-VS': 5, 
        'CL-OH': 6, 'CL-ML': 7, 'CL-BI': 8, 'CL-AR': 9, 'CL-LL': 10, 
        'CL-AI': 11, 'CL-MA': 12, 'CL-RM': 13, 'CL-LR': 14, 'CL-AP': 15, 'CL-NB': 16
    };
    
    // Step 2 State
    const [commodity, setCommodity] = useState('General Freight');
    const [weightLbs, setWeightLbs] = useState('42000');
    const [cargoDetailsType, setCargoDetailsType] = useState('Pallets');
    const [pallets, setPallets] = useState('');
    const [dimensions, setDimensions] = useState('');
    const [itemDescription, setItemDescription] = useState('Pallet - General Goods');
    const [quantity, setQuantity] = useState('20');
    const [dimensionsPerItem, setDimensionsPerItem] = useState('48x40x72');
    const [totalVolume, setTotalVolume] = useState('');
    const [specialHandling, setSpecialHandling] = useState({
      hazardous: false,
      requiresPermit: false,
      requiresTarping: true,
      tarpType: 'Rew Tarp',
      oversize: false,
    });
    
    // Step 3 State
    const [accessorials, setAccessorials] = useState({
        forklift: true, insideDelivery1: false, appointment: false, driverAssist: false, palletExchange: false, liftgate1: false, insideDelivery2: false, liftgate2: false,
    });
    const [carrierRating, setCarrierRating] = useState('4');
    const [uberFreightPreferred, setUberFreightPreferred] = useState(false);
    const [cargoNotes, setCargoNotes] = useState('');
    const [bookingMethod, setBookingMethod] = useState('instant');

    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [deliverySuggestions, setDeliverySuggestions] = useState<any[]>([]);
    const [routeDetails, setRouteDetails] = useState({ distance: 0, duration: 0, geometry: null as any });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pricing state
    const [globalSettings, setGlobalSettings] = useState<any | null>(null);
    const [estimatedPrice, setEstimatedPrice] = useState(0);
    const [carrierPayment, setCarrierPayment] = useState(0);
    const [platformFee, setPlatformFee] = useState(0);
    const [tollsCount, setTollsCount] = useState(0);
    const [tollCost, setTollCost] = useState(0);
    const [tollsNames, setTollsNames] = useState<string[]>([]);
    const [tollsBreakdown, setTollsBreakdown] = useState<any[]>([]);
    const [showTollsDetail, setShowTollsDetail] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase.from("settings").select().eq("id", "global").single();
            if (data) {
                setGlobalSettings((prev: any) => ({ ...prev, ...data }));
            } else if (error) {
                setError("No se encontraron los ajustes globales para el cálculo de precio.");
            }
        };
        const fetchTollData = async () => {
            const [porticosRes, matricesRes] = await Promise.all([
                supabase.from('porticos').select('*').eq('is_active', true),
                supabase.from('concession_matrices').select('*').eq('concession_name', 'AVO').eq('category', 3)
            ]);
            if (porticosRes.data && matricesRes.data) {
                setGlobalSettings((prev: any) => ({
                    ...prev,
                    porticos: porticosRes.data,
                    avoMatrix: matricesRes.data
                }));
            }
        };
        fetchSettings();
        fetchTollData();
    }, [supabase]);


    useEffect(() => {
        const calculateRoute = async () => {
          if (pickup.coords && delivery.coords) {
            try {
              const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pickup.coords.join(',')};${delivery.coords.join(',')}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
              ).then(res => res.json());
    
              if (response.routes && response.routes[0]) {
                const { distance, duration, geometry } = response.routes[0];
                setRouteDetails({ distance, duration, geometry });
              }
            } catch (error) {
              console.error("Error calculating route:", error);
              setRouteDetails({ distance: 0, duration: 0, geometry: null });
            }
          }
        };
    
        calculateRoute();
    }, [pickup.coords, delivery.coords]);

    // --- VORIAN CLIMATIC SENSOR ---
    useEffect(() => {
        const fetchWeather = async () => {
            if (pickup.coords && pickup.coords[0] && pickup.coords[1]) {
                try {
                    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
                    if (!apiKey || apiKey === 'TU_API_KEY_AQUI') return;

                    const res = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?lat=${pickup.coords[1]}&lon=${pickup.coords[0]}&appid=${apiKey}`
                    );
                    
                    if (!res.ok) {
                        const errorData = await res.json();
                        console.warn("🌦️ Vorian Sensor (Aviso): Esperando activación de API clima o clave inválida. Usando Clear por defecto.", errorData.message);
                        setWeatherCondition('Clear');
                        return;
                    }

                    const data = await res.json();
                    if (data.weather && data.weather[0]) {
                        console.log(`🌦️ Vorian Sensor: Clima en pickup: ${data.weather[0].main}`);
                        setWeatherCondition(data.weather[0].main);
                    }
                } catch (error) {
                    console.error("Error fetching weather:", error);
                    setWeatherCondition('Clear'); // Default safely
                }
            }
        };
        fetchWeather();
    }, [pickup.coords]);

    useEffect(() => {
        const calculatePrice = async () => {
            if (!routeDetails.distance || !routeDetails.duration || !vehicleType || !globalSettings) {
                setEstimatedPrice(0);
                setCarrierPayment(0);
                setPlatformFee(0);
                return;
            }
            
            setError(null);
            
            try {
                // --- VORIAN CENTRALIZED INTELLIGENCE (Supabase RPC) ---
                const rpcParams = {
                    p_km: Math.round((routeDetails.distance || 0) / 1000),
                    p_minutes: Math.round((routeDetails.duration || 0) / 60),
                    p_vehicle_type: vehicleType,
                    p_pickup_date: pickupDate?.toISOString() || new Date().toISOString(),
                    p_delivery_date: deliveryDate?.toISOString() || new Date().toISOString(),
                    p_weather_main: weatherCondition,
                    p_region_cod: pickupRegionCod,
                    p_route_geometry: routeDetails.geometry // Geometría cruda para PostGIS
                };

                console.log("🚛 Calculando precio Vorian con params:", rpcParams);

                const { data, error: rpcError } = await supabase.rpc('get_vorian_price', { params: rpcParams });

                if (rpcError) {
                    console.error("🚨 ERROR CRÍTICO SUPABASE RPC:", rpcError);
                    throw rpcError;
                }
                
                console.log("💰 Respuesta exitosa de Vorian Engine:", data);
                
                if (data.error) {
                    setError(data.error);
                    setEstimatedPrice(0);
                    setCarrierPayment(0);
                    setPlatformFee(0);
                    setTollsCount(0);
                    setTollCost(0);
                    return;
                }

                // --- CLIENT-SIDE PRECISION TOLL CALCULATION ---
                let localTollsCost = 0;
                let localTollsBreakdown: any[] = [];
                let localTollsCount = 0;
                let localTollsNames: string[] = [];

                if (globalSettings?.porticos?.length && routeDetails.geometry) {
                    const categoryKey = ['furgon', 'pickup', 'camioneta'].includes(vehicleType) ? 'cat1' : ['camion', 'simple', 'camion_simple'].includes(vehicleType) ? 'cat2' : 'cat3';
                    const tollResults = getTollsForRoute(
                        routeDetails.geometry,
                        globalSettings.porticos,
                        globalSettings.avoMatrix,
                        pickupDate || new Date(),
                        categoryKey
                    );
                    
                    localTollsCost = tollResults.tollsCost;
                    localTollsBreakdown = tollResults.breakdowns;
                    localTollsCount = tollResults.tollsCount;
                    localTollsNames = tollResults.tollNames;
                }

                // Update pricing states from centralized DB result + Local Precision Tolls
                setCarrierPayment(data.subtotal);
                setPlatformFee(data.commission);
                setEstimatedPrice(data.total - (data.tolls_cost || 0) + localTollsCost); // Replace RPC tolls with local tolls
                setTollsCount(localTollsCount);
                setTollCost(localTollsCost);
                setTollsNames(localTollsNames);
                setTollsBreakdown(localTollsBreakdown);
                
                // --- END VORIAN INTELLIGENCE ---
            } catch (err: any) {
                console.error("Error calculating price via RPC:", err.message || err);
                setEstimatedPrice(0);
                setCarrierPayment(0);
                setPlatformFee(0);
                setError("No se pudo calcular el precio en tiempo real.");
            }
        };

        calculatePrice();
    }, [supabase, routeDetails, vehicleType, globalSettings, pickupDate, deliveryDate, weatherCondition, pickupRegionCod]);


    const handleAddressChange = async (value: string, type: 'pickup' | 'delivery') => {
        const setAddress = type === 'pickup' ? setPickup : setDelivery;
        const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;

        setAddress({ address: value, coords: null });
        setRouteDetails({ distance: 0, duration: 0, geometry: null });

        if (value.length < 3) {
        setSuggestions([]);
        return;
        }

        try {
            // 1. Local Search for Vorian Ports
            const searchTerm = value.toLowerCase();
            const localMatches = VORIAN_PORTS.filter(p => 
                p.place_name.toLowerCase().includes(searchTerm) || 
                searchTerm.includes("puerto") ||
                (searchTerm.includes("sti") && p.id.includes("sti")) ||
                (searchTerm.includes("dp") && p.id.includes("dp"))
            );

            // 2. Mapbox Search
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                value
                )}.json?access_token=${MAPBOX_TOKEN}&country=CL&autocomplete=true&limit=5`
            ).then((res) => res.json());
            
            // 3. Combine results, prioritizing local ports
            const combined = [...localMatches, ...(response.features || [])];
            setSuggestions(combined);
        } catch (err) {
            setSuggestions([]);
        }
    };

    const handleSelectSuggestion = (suggestion: any, type: 'pickup' | 'delivery') => {
        const setAddress = type === 'pickup' ? setPickup : setDelivery;
        const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;
        
        setAddress({ address: suggestion.place_name, coords: suggestion.center });

        // Si es pickup, detectamos la Región para el Diésel Regional
        if (type === 'pickup' && suggestion.context) {
            const regionContext = suggestion.context.find((c: any) => c.id.startsWith('region.'));
            if (regionContext && regionContext.short_code) {
                const regionCod = CHILE_REGIONS_MAP[regionContext.short_code.toUpperCase()];
                if (regionCod) {
                    console.log(`📍 Región detectada: ${regionContext.short_code} (Cód: ${regionCod})`);
                    setPickupRegionCod(regionCod);
                }
            }
        }

        setSuggestions([]);
    };
    
    const handleBookShipment = async () => {
        if (!user) {
            setError("Error: No has iniciado sesión.");
            return;
        }
        if (!pickup.coords || !delivery.coords) {
            setError("Por favor, selecciona una dirección de recogida y entrega válida.");
            return;
        }
        if (!pickupDate || !deliveryDate) {
            setError("Por favor, selecciona las fechas de recogida y entrega.");
            return;
        }
    
        setIsLoading(true);
        setError(null);
        
        // --- Generate Custom ID ---
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const folio = (now.getTime() % 1000000).toString().padStart(6, '0');
        const customShipmentId = `VOR-${year}-${month}-${folio}`;
        // --- End Generate Custom ID ---

        const finalBookingMethod = isInternalShipment ? 'instant' : bookingMethod;
    
        try {
          // Usamos la tabla consolidada 'shipments' con soporte PostGIS
          const { error: shipmentError } = await supabase.from('shipments').insert({
            id: customShipmentId,
            clientId: user.id,
            carrierId: isInternalShipment ? user.id : null,
            // Soporte PostGIS (Geography)
            origin: `POINT(${pickup.coords[0]} ${pickup.coords[1]})`,
            destination: `POINT(${delivery.coords[0]} ${delivery.coords[1]})`,
            originAddress: pickup.address,
            destinationAddress: delivery.address,
            estimatedPrice: finalBookingMethod === 'instant' ? estimatedPrice : 0,
            status: isInternalShipment ? 'Booked' : 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Consolidamos todos los detalles técnicos en JSONB
            details: {
              equipment,
              serviceType,
              pickupDate: pickupDate.toISOString(),
              pickupWindow,
              deliveryDate: deliveryDate.toISOString(),
              deliveryWindow,
              commodity,
              weightLbs: parseInt(weightLbs) || 0,
              cargoDetails: {
                pallets: parseInt(pallets) || 0,
                dimensions: dimensions,
                itemDescription,
                quantity: parseInt(quantity) || 0,
                dimensionsPerItem: dimensionsPerItem,
                totalVolume: parseFloat(totalVolume) || 0
              },
              specialHandling,
              accessorials,
              carrierRating: parseInt(carrierRating),
              uberFreightPreferred,
              cargoNotes,
              bookingMethod: finalBookingMethod,
              route: routeDetails.geometry // Guardar el trazado completo en el mapa
            }
          });

          if (shipmentError) throw shipmentError;
          
          router.push('/client');
        } catch (err: any) {
          console.error(err);
          setError("No se pudo crear el envío.");
        } finally {
          setIsLoading(false);
        }
    };
    
    return (
        <div className="max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-6">Crear Nuevo Envío - {step === 1 ? 'Ruta y Horario' : step === 2 ? 'Detalles de Carga' : 'Opciones y Reserva'}</h1>
            <div className="mb-8">
              <Stepper step={step} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
                
                {/* Left Column: Form Steps */}
                <div>
                  <form onSubmit={(e) => { e.preventDefault(); setStep(s => Math.min(s + 1, 3)); }}>
                    {step === 1 && (
                      <div className="space-y-10">
                        {/* Route & Schedule Section */}
                        <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Ruta y Horario</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pickup */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground">Recogida</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input value={pickup.address} onChange={(e) => handleAddressChange(e.target.value, 'pickup')} placeholder="Ubicación" className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary" autoComplete="off" />
                                        {pickupSuggestions.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                                {pickupSuggestions.map((s, i) => <div key={`${s.id}-${i}`} onMouseDown={() => handleSelectSuggestion(s, 'pickup')} className="p-3 cursor-pointer hover:bg-accent">{s.place_name}</div>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-4 mt-2">
                                        <div className="flex items-end gap-3 w-full">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Fecha</label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-semibold h-12 bg-muted/50 border-0 hover:bg-muted/80 transition-colors", !pickupDate && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {pickupDate ? format(pickupDate, "d 'de' MMMM") : <span>Fecha</span>}
                                                    </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus /></PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="w-32 space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Hora</label>
                                                <Input 
                                                    type="time" 
                                                    className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-bold text-center"
                                                    value={pickupDate ? format(pickupDate, "HH:mm") : ""}
                                                    onChange={(e) => {
                                                        if (pickupDate) {
                                                            const [hours, minutes] = e.target.value.split(':');
                                                            const newDate = new Date(pickupDate);
                                                            newDate.setHours(parseInt(hours), parseInt(minutes));
                                                            setPickupDate(newDate);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Delivery */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-foreground">Entrega</label>
                                        {pickupDate && deliveryDate && format(pickupDate, "yyyy-MM-dd") !== format(deliveryDate, "yyyy-MM-dd") && (
                                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold animate-pulse">
                                                +1 DÍA
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input value={delivery.address} onChange={(e) => handleAddressChange(e.target.value, 'delivery')} placeholder="Destino del envío" className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary" autoComplete="off" />
                                        {deliverySuggestions.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                                {deliverySuggestions.map((s, i) => <div key={`${s.id}-${i}`} onMouseDown={() => handleSelectSuggestion(s, 'delivery')} className="p-3 cursor-pointer hover:bg-accent">{s.place_name}</div>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-4 mt-2">
                                        <div className="flex items-end gap-3 w-full">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Fecha de Entrega</label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-semibold h-12 bg-muted/50 border-0 hover:bg-muted/80 transition-colors", !deliveryDate && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {deliveryDate ? format(deliveryDate, "d 'de' MMMM") : <span>Fecha</span>}
                                                    </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus /></PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="w-32 space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Hora</label>
                                                <Input 
                                                    type="time" 
                                                    className="h-12 bg-muted/50 border-0 focus-visible:ring-primary font-bold text-center"
                                                    value={deliveryDate ? format(deliveryDate, "HH:mm") : ""}
                                                    onChange={(e) => {
                                                        if (deliveryDate) {
                                                            const [hours, minutes] = e.target.value.split(':');
                                                            const newDate = new Date(deliveryDate);
                                                            newDate.setHours(parseInt(hours), parseInt(minutes));
                                                            setDeliveryDate(newDate);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Tipo de Equipamiento</h2>
                            <div className="flex items-center gap-0 mt-2 rounded-md overflow-hidden border">
                                <EquipmentButton icon={<Truck className="w-5 h-5" />} label="Caja Seca (53')" selected={equipment === 'Dry van'} onClick={() => setEquipment('Dry van')} />
                                <EquipmentButton icon={<Layers className="w-5 h-5" />} label="Plataforma" selected={equipment === 'Flatbed'} onClick={() => setEquipment('Flatbed')} />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Tipo de Servicio</h2>
                            <RadioGroup defaultValue="FTL" value={serviceType} onValueChange={setServiceType} className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="FTL" id="ftl" className="peer sr-only" />
                                    <Label htmlFor="ftl" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <Truck className="mb-3 h-6 w-6" />
                                        FTL (Carga Completa)
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="LTL" id="ltl" className="peer sr-only" />
                                    <Label htmlFor="ltl" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <Package className="mb-3 h-6 w-6" />
                                        LTL (Carga Parcial)
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Modalidad de Envío</h2>
                            <div className="flex items-center space-x-3 rounded-md border p-4">
                                <Switch id="internal-shipment" checked={isInternalShipment} onCheckedChange={setIsInternalShipment} />
                                <div className="space-y-0.5">
                                    <Label htmlFor="internal-shipment">Envío para mi propia flota</Label>
                                    <p className="text-xs text-muted-foreground">
                                        El envío será privado y no se publicará en el mercado de cargas.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mt-10 mb-4">Tipo de Vehículo (para Tarifa)</h2>
                            <Label>Vehículo</Label>
                            <Select onValueChange={setVehicleType} defaultValue={vehicleType}>
                                <SelectTrigger className="h-12 bg-muted/50 border-0 focus-visible:ring-primary mt-2">
                                    <SelectValue placeholder="Seleccionar un vehículo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Camion Rampla">Camión Rampla (Puerto/Contenedores)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">La selección del vehículo se utiliza para estimar la tarifa y no se guarda con el envío.</p>
                        </div>
                         <div className="flex justify-end pt-4">
                            <Button type="submit" size="lg" className="bg-foreground hover:bg-foreground/90 text-background h-12 px-6">
                                Continuar a Detalles de Carga <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                       <div className="space-y-10">
                          {/* CARGO DETAILS */}
                          <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Detalles de Carga</h2>
                            <div className="space-y-4">
                               <div>
                                    <label htmlFor="commodity" className="text-sm font-semibold text-foreground">Mercancía</label>
                                    <Input id="commodity" value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="ej. Carga General" className="mt-2 h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-semibold">Detalles de Carga</span>
                                  <div className="flex items-center gap-2 rounded-md bg-muted/50 p-1">
                                    <Button type="button" size="sm" variant={cargoDetailsType === 'Pallets' ? 'secondary' : 'ghost'} onClick={() => setCargoDetailsType('Pallets')} className="flex gap-2"><Package className="w-4 h-4" /> Pallets</Button>
                                    <Button type="button" size="sm" variant={cargoDetailsType === 'Weight' ? 'secondary' : 'ghost'} onClick={() => setCargoDetailsType('Weight')} className="flex gap-2"><Weight className="w-4 h-4" /> Peso</Button>
                                    <Button type="button" size="sm" variant={cargoDetailsType === 'Dimensions' ? 'secondary' : 'ghost'} onClick={() => setCargoDetailsType('Dimensions')} className="flex gap-2"><Ruler className="w-4 h-4" /> Dimensiones</Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <Input value={pallets} onChange={e => setPallets(e.target.value)} placeholder="Pallets" className="h-12 bg-muted/50 border-0"/>
                                  <Input value={dimensions} onChange={e => setDimensions(e.target.value)} placeholder="Dimensiones" className="h-12 bg-muted/50 border-0"/>
                                </div>
                                 <Input id="weight" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} type="number" placeholder="Peso (lbs)" className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                            </div>
                          </div>

                          {/* PALLET & ITEM INFORMATION */}
                          <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Información de Pallet e Ítem</h2>
                            <div className="grid grid-cols-2 gap-4">
                               <Input value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="Descripción del Ítem" className="h-12 bg-muted/50 border-0"/>
                               <Input value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Cantidad" className="h-12 bg-muted/50 border-0"/>
                            </div>
                            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 mt-4">
                               <Input value={dimensionsPerItem} onChange={e => setDimensionsPerItem(e.target.value)} placeholder="Dimensiones por ítem" className="h-12 bg-muted/50 border-0"/>
                               <span className="text-muted-foreground">x</span>
                               <Input placeholder="40x" className="h-12 bg-muted/50 border-0"/>
                                <span className="text-muted-foreground">=</span>
                                <div className="relative">
                                  <Input value={totalVolume} onChange={e => setTotalVolume(e.target.value)} placeholder="Entrada" className="h-12 bg-muted/50 border-0 pr-8"/>
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ft³</span>
                                </div>
                            </div>
                          </div>

                          {/* SPECIAL HANDLING & PERMITS */}
                          <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Manejo Especial y Permisos</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="hazardous" checked={specialHandling.hazardous} onCheckedChange={(checked) => setSpecialHandling(s => ({...s, hazardous: !!checked}))} />
                                <Label htmlFor="hazardous">Materiales Peligrosos</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="requiresPermit" checked={specialHandling.requiresPermit} onCheckedChange={(checked) => setSpecialHandling(s => ({...s, requiresPermit: !!checked}))} />
                                <Label htmlFor="requiresPermit">Requiere Permiso</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="oversize" checked={specialHandling.oversize} onCheckedChange={(checked) => setSpecialHandling(s => ({...s, oversize: !!checked}))} />
                                <Label htmlFor="oversize">Sobredimensionado/Sobrepeso</Label>
                              </div>
                              <div className="col-span-full md:col-span-1"></div>
                              <div className="flex items-start space-x-2 col-span-full md:col-span-2">
                                <Checkbox id="requiresTarping" checked={specialHandling.requiresTarping} onCheckedChange={(checked) => setSpecialHandling(s => ({...s, requiresTarping: !!checked}))} />
                                <div className="grid gap-1.5 leading-none">
                                  <Label htmlFor="requiresTarping">Requiere Lona</Label>
                                   <RadioGroup value={specialHandling.tarpType} onValueChange={(value) => setSpecialHandling(s => ({...s, tarpType: value}))} className="mt-2" disabled={!specialHandling.requiresTarping}>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rew Tarp" id="tarp-rew" />
                                        <Label htmlFor="tarp-rew">Lona Nueva</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Convening/Tarp" id="tarp-convening" />
                                        <Label htmlFor="tarp-convening">Lona de Convenio</Label>
                                      </div>
                                    </RadioGroup>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* CARGO PHOTOGRAPHS */}
                          <div>
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Fotografías de la Carga (Opcional)</h2>
                             <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                                        <p className="text-xs text-muted-foreground">SVG, PNG, JPG o GIF (MÁX. 800x400px)</p>
                                    </div>
                                    <input id="dropzone-file" type="file" className="hidden" />
                                </label>
                            </div> 
                          </div>

                           <div className="flex justify-between items-center pt-4">
                            <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12 px-6">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                            </Button>
                            <Button type="submit" size="lg" className="bg-foreground hover:bg-foreground/90 text-background h-12 px-6">
                                Continuar a Opciones y Reserva <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                       </div>
                    )}
                    
                    {step === 3 && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    {/* ACCESSORIALS */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Servicios Adicionales</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                {id: 'forklift', label: 'Servicio de Montacargas'},
                                                {id: 'driverAssist', label: 'Asistencia del Conductor'},
                                                {id: 'insideDelivery1', label: 'Entrega Interior'},
                                                {id: 'palletExchange', label: 'Intercambio de Pallets'},
                                                {id: 'appointment', label: 'Cita'},
                                                {id: 'liftgate1', label: 'Servicio de Plataforma Elevadora'},
                                            ].map(item => (
                                                <div key={item.id} className="flex items-center space-x-2">
                                                    <Checkbox id={item.id} checked={(accessorials as any)[item.id]} onCheckedChange={(checked) => setAccessorials(s => ({...s, [item.id]: !!checked}))} />
                                                    <Label htmlFor={item.id} className="text-sm font-medium">{item.label}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                     {/* CARGO PHOTOGRAPHS */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Fotografías de la Carga (Opcional)</h3>
                                        <div className="flex items-center justify-center w-full">
                                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                                                </div>
                                                <input id="dropzone-file" type="file" className="hidden" />
                                            </label>
                                        </div> 
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* CARRIER PREFERENCES */}
                                    {!isInternalShipment && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Preferencias de Transportista</h3>
                                        <div className="p-4 border rounded-md">
                                            <Label className="font-semibold">Calificación del Transportista</Label>
                                            <RadioGroup value={carrierRating} onValueChange={setCarrierRating} className="flex items-center justify-between mt-2">
                                                <Label>Cualquiera</Label>
                                                <div className="flex items-center gap-1">
                                                    {[1,2,3,4,5].map(rating => <Star key={rating} className={cn("w-5 h-5", parseInt(carrierRating) >= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")}/>)}
                                                </div>
                                            </RadioGroup>
                                             <div className="flex items-center space-x-2 mt-4">
                                                <Checkbox id="uberFreightPreferred" checked={uberFreightPreferred} onCheckedChange={(checked) => setUberFreightPreferred(!!checked)} />
                                                <Label htmlFor="uberFreightPreferred">Transportistas Preferidos de Vorian</Label>
                                            </div>
                                        </div>
                                    </div>
                                    )}

                                    {/* CARGO NOTES */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Notas de la Carga</h3>
                                        <Textarea value={cargoNotes} onChange={e => setCargoNotes(e.target.value)} placeholder="Añade cualquier instrucción especial para el transportista..." className="bg-muted/50 border-0 min-h-[120px]" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* BOOKING METHOD */}
                             {!isInternalShipment && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Método de Reserva</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className={cn("cursor-pointer", bookingMethod === 'instant' ? "border-primary ring-1 ring-primary" : "")} onClick={() => setBookingMethod('instant')}>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-base"><Bolt className="w-4 h-4 text-primary"/> Reserva Instantánea</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">Reservar con una Tarifa Garantizada</p>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-2xl font-bold mt-2">${(estimatedPrice || 0).toLocaleString()}</p>
                                                        {estimatedPrice > 0 && <span className="text-base font-medium text-muted-foreground">+ IVA</span>}
                                                    </div>
                                                    {tollsNames.length > 0 && (
                                                        <p className="text-[10px] text-primary font-medium mt-1">
                                                            Incluye {tollsNames.length} peajes: {tollsNames.slice(0, 3).join(', ')}{tollsNames.length > 3 ? '...' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className={cn("cursor-pointer", bookingMethod === 'quote' ? "border-primary ring-1 ring-primary" : "")} onClick={() => setBookingMethod('quote')}>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="w-4 h-4 text-muted-foreground"/> Solicitud de Cotización</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">Abierto a Ofertas</p>
                                                <p className="text-2xl font-bold mt-2 text-muted-foreground">Obtener Cotizaciones</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                             )}

                            <div className="flex justify-between items-center pt-4">
                                <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-12 px-6">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                </Button>
                                <Button type="button" onClick={handleBookShipment} size="lg" className="bg-foreground hover:bg-foreground/90 text-background h-12 px-6" disabled={isLoading}>
                                    {isLoading ? 'Reservando...' : 'Revisar y Confirmar Envío'}
                                </Button>
                            </div>
                        </div>
                    )}
                  </form>
                </div>

                {/* Right Column: Map and Summary */}
                <div className="space-y-6">
                    <div className="h-64 w-full rounded-lg overflow-hidden border">
                        <Map 
                            route={routeDetails.geometry} 
                            origin={pickup.coords} 
                            destination={delivery.coords} 
                            activeTolls={tollsBreakdown} 
                            vehicleType={vehicleType}
                        />
                    </div>
                    <Card className="bg-card border shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Resumen del Envío</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Tarifa Garantizada</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold tracking-tight">${estimatedPrice > 0 ? estimatedPrice.toLocaleString() : '----'}</p>
                                {estimatedPrice > 0 && <span className="text-lg font-medium text-muted-foreground">+ IVA</span>}
                            </div>

                            <div className="mt-6 space-y-2 text-sm border-t pt-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Distancia</span>
                                    <span className="font-medium text-foreground">{(routeDetails.distance / 1000).toFixed(1)} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Equipamiento</span>
                                    <span className="font-medium text-foreground">{equipment}</span>
                                </div>
                                {!isInternalShipment && estimatedPrice > 0 && (
                                    <>
                                        <div className="flex justify-between pt-2 mt-2 border-t">
                                            <span className="font-semibold text-muted-foreground">Pago a Transportista</span>
                                            <span className="font-semibold text-foreground">${(carrierPayment || 0).toLocaleString()}</span>
                                        </div>
                                        {tollCost > 0 && (
                                            <div className="space-y-1 pb-1">
                                                <div 
                                                    className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity" 
                                                    onClick={() => setShowTollsDetail(!showTollsDetail)}
                                                >
                                                    <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Peajes (TAG)</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-semibold text-foreground text-sm">${(tollCost || 0).toLocaleString()}</span>
                                                        <span className={cn("text-[10px] transition-transform", showTollsDetail ? "rotate-90" : "")}>▶</span>
                                                    </div>
                                                </div>
                                                {showTollsDetail && (
                                                    <div className="space-y-1 mt-1">
                                                        {tollsBreakdown.map((toll, idx) => (
                                                            <div key={`${toll.name}-${idx}`} className="flex justify-between items-start text-[10px] py-1 border-b border-dashed">
                                                                <div className="flex flex-col">
                                                                    <span className="text-muted-foreground font-medium">{toll.name}</span>
                                                                    {toll.tag && <span className="text-[9px] text-primary/70 italic font-bold uppercase tracking-tight">{toll.tag}</span>}
                                                                </div>
                                                                <span className="font-mono font-bold text-foreground text-xs">${(toll.cost || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Comisión Vorian (10%)</span>
                                            <span className="font-medium text-foreground">${(platformFee || 0).toLocaleString()}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <Button className="w-full h-12 mt-6 font-bold text-lg bg-foreground hover:bg-foreground/90 text-background" onClick={handleBookShipment} disabled={isLoading || (bookingMethod === 'instant' && estimatedPrice <= 0) || step !== 3}>
                                {isLoading ? "Reservando..." : "Reservar Envío"}
                            </Button>
                            {error && <p className="text-destructive text-sm mt-4 text-center">{error}</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
