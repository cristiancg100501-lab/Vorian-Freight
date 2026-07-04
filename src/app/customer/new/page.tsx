'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSupabase, useUser } from '@/components/providers/supabase-provider';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Layers, Calendar as CalendarIcon, MapPin, ArrowRight, ArrowLeft, Upload, Package, Ruler, Weight, Check, Star, HelpCircle, Bolt, DollarSign } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const MAPBOX_TOKEN = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

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

export default function NewShipmentPage() {
    const { supabase } = useSupabase();
    const { user } = useUser();
    const router = useRouter();

    // Multi-step form state
    const [step, setStep] = useState(1);

    // Step 1 State
    const [isInternalShipment, setIsInternalShipment] = useState(false);
    const [equipment, setEquipment] = useState('Dry van');
    const [pickup, setPickup] = useState({ address: '', coords: null as any });
    const [delivery, setDelivery] = useState({ address: '', coords: null as any });
    const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    const [pickupWindow, setPickupWindow] = useState('8:00 AM - 12:00 PM');
    const [operationType, setOperationType] = useState('Nacional'); // 'Nacional', 'Exportación', 'Importación'
    const [depot, setDepot] = useState({ address: '', coords: null as any });
    const [depotSuggestions, setDepotSuggestions] = useState<any[]>([]);
    const [deliveryWindow, setDeliveryWindow] = useState('1:00 PM - 5:00 PM');
    const [vehicleType, setVehicleType] = useState('Camion Pesado');
    const [weatherCondition, setWeatherCondition] = useState('Clear');
    const [serviceType, setServiceType] = useState('FTL');
    
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
        forklift: false, insideDelivery1: false, appointment: false, driverAssist: false, palletExchange: false, liftgate1: false, insideDelivery2: false, liftgate2: false,
    });
    const [carrierRating, setCarrierRating] = useState('4');
    const [uberFreightPreferred, setUberFreightPreferred] = useState(false);
    const [cargoNotes, setCargoNotes] = useState('');
    const [bookingMethod, setBookingMethod] = useState('instant');
    
    // Managed Freight State
    // Managed Freight State removed for Customer
    
    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [deliverySuggestions, setDeliverySuggestions] = useState<any[]>([]);
    const [routeDetails, setRouteDetails] = useState({ distance: 0, duration: 0, geometry: null as any });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pricing state
    const [globalSettings, setGlobalSettings] = useState<any | null>(null);
    const [estimatedPrice, setEstimatedPrice] = useState(0);
    const [priceValidSeconds, setPriceValidSeconds] = useState<number>(0);
    const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [carrierPayment, setCarrierPayment] = useState(0);
    const [platformFee, setPlatformFee] = useState(0);
    
    // ML Pricing Engine states
    const [pricingFactors, setPricingFactors] = useState<any>(null);
    const [mlFactors, setMlFactors] = useState<any>(null);
    const [pricingLogId, setPricingLogId] = useState<string | null>(null);
    const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
    const [priceValidFor, setPriceValidFor] = useState(20);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase.from("settings").select().eq("id", "global").single();
            if (data) {
                setGlobalSettings(data);
            } else if (error) {
                setError("No se encontraron los ajustes globales para el cálculo de precio.");
            }
        };
        fetchSettings();
    }, [supabase]);

    useEffect(() => {
        const calculateRoute = async () => {
          if (pickup.coords && delivery.coords) {
            
            // Require depot for Import/Export
            if (operationType !== 'Nacional' && !depot.coords) {
                setRouteDetails({ distance: 0, duration: 0, geometry: null });
                return;
            }

            let waypoints = `${pickup.coords.join(',')};${delivery.coords.join(',')}`;
            
            if (operationType === 'Exportación' && depot.coords) {
                // Depot -> Pickup -> Delivery
                waypoints = `${depot.coords.join(',')};${pickup.coords.join(',')};${delivery.coords.join(',')}`;
            } else if (operationType === 'Importación' && depot.coords) {
                // Pickup -> Delivery -> Depot
                waypoints = `${pickup.coords.join(',')};${delivery.coords.join(',')};${depot.coords.join(',')}`;
            }

            try {
              const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
              ).then(res => res.json());
    
              if (response.routes && response.routes[0]) {
                const { distance, duration, geometry } = response.routes[0];
                setRouteDetails({ distance, duration, geometry });
              } else {
                setRouteDetails({ distance: 0, duration: 0, geometry: null });
              }
            } catch (error) {
              console.error("Error calculating route:", error);
              setRouteDetails({ distance: 0, duration: 0, geometry: null });
            }
          }
        };
    
        calculateRoute();
    }, [pickup.coords, delivery.coords, depot.coords, operationType]);

    // --- VORIAN CLIMATIC SENSOR (Con Forecast 5 Días) ---
    useEffect(() => {
        const fetchWeather = async () => {
            if (pickup.coords && pickup.coords[0] && pickup.coords[1]) {
                try {
                    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
                    if (!apiKey || apiKey === 'TU_API_KEY_AQUI') return;

                    // Usar endpoint de forecast para predicción a 5 días
                    const res = await fetch(
                        `https://api.openweathermap.org/data/2.5/forecast?lat=${pickup.coords[1]}&lon=${pickup.coords[0]}&appid=${apiKey}`
                    );
                    
                    if (!res.ok) {
                        const errorData = await res.json();
                        console.warn("🌦️ Vorian Sensor (Aviso): Esperando activación de API clima o clave inválida.", errorData.message);
                        setWeatherCondition('Clear');
                        return;
                    }

                    const data = await res.json();
                    if (data.list && data.list.length > 0) {
                        let selectedWeather = data.list[0].weather[0].main;
                        
                        if (pickupDate) {
                            // Buscar un forecast que coincida con el día elegido (UTC/Local timezone format match)
                            // Para facilitar: tomamos la fecha elegida
                            
                            let targetHour = 12; // Default to noon
                            if (pickupWindow && pickupWindow.includes(':')) {
                                try {
                                    const timePart = pickupWindow.split('-')[0].trim();
                                    const parts = timePart.split(' ');
                                    if (parts.length >= 1) {
                                        const [time, ampm] = parts;
                                        const [hourStr] = time.split(':');
                                        let parsedHour = parseInt(hourStr, 10);
                                        if (ampm && ampm.toUpperCase() === 'PM' && parsedHour < 12) parsedHour += 12;
                                        if (ampm && ampm.toUpperCase() === 'AM' && parsedHour === 12) parsedHour = 0;
                                        if (!isNaN(parsedHour)) targetHour = parsedHour;
                                    }
                                } catch(e) {}
                            }

                            // Calculate target unix timestamp in seconds based on local pickupDate and targetHour
                            const targetDate = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate(), targetHour, 0, 0);
                            const targetTimestamp = Math.floor(targetDate.getTime() / 1000);

                            // Find the closest forecast in the entire 5-day list by absolute time difference
                            let targetForecast = null;
                            if (data.list && data.list.length > 0) {
                                targetForecast = data.list.reduce((prev: any, curr: any) => {
                                    return (Math.abs(curr.dt - targetTimestamp) < Math.abs(prev.dt - targetTimestamp) ? curr : prev);
                                });
                            }
                            
                            if (targetForecast && targetForecast.weather && targetForecast.weather[0]) {
                                selectedWeather = targetForecast.weather[0].main;
                                console.log(`🌦️ Vorian Sensor: Pronóstico exacto para ${targetDate.toLocaleString()} es: ${selectedWeather}`);
                            } else {
                                console.log(`🌦️ Vorian Sensor: No se pudo encontrar forecast. Usando clima por defecto: ${selectedWeather}`);
                            }
                        }
                        setWeatherCondition(selectedWeather);
                    }
                } catch (error) {
                    console.error("Error fetching weather:", error);
                    setWeatherCondition('Clear'); // Default safely
                }
            }
        };
        fetchWeather();
    }, [pickup.coords, pickupDate, pickupWindow]);

    const calculatePrice = useCallback(async () => {
        if (!routeDetails.distance || !routeDetails.duration || !vehicleType || !globalSettings) {
            setEstimatedPrice(0);
            setCarrierPayment(0);
            setPlatformFee(0);
            return;
        }
        
        setError(null);
        setIsRefreshingPrice(true);
        
        try {
            // --- VORIAN HYBRID ML OPTIMIZER ---
            const response = await fetch('/api/pricing/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup_region: pickup.address.split(',').slice(-2, -1)[0]?.trim() || 'RM',
                    delivery_region: delivery.address.split(',').slice(-2, -1)[0]?.trim() || 'RM',
                    pickup_address: pickup.address,
                    delivery_address: delivery.address,
                    elevation_diff: 0,
                    distance_meters: routeDetails.distance,
                    duration_mins: routeDetails.duration / 60,
                    vehicle_type: vehicleType,
                    container_status: 'FCL',
                    weight_kgs: 0,
                    route_geometry: routeDetails.geometry,
                    service_mode: serviceType === 'FTL' ? 'exclusive' : 'consolidated',
                    cargo_units: 1,
                    weather_condition: weatherCondition,
                    special_handling: specialHandling,
                    accessorials: accessorials,
                    pickup_date: pickupDate?.toISOString() || new Date().toISOString(),
                    pickup_window: pickupWindow,
                    operation_type: operationType
                })
            });

            if (!response.ok) {
                throw new Error("Error en API de optimización de precios");
            }
            
            const data = await response.json();
            
            if (data.error) {
                setError(data.error);
                setEstimatedPrice(0);
                setCarrierPayment(0);
                setPlatformFee(0);
                return;
            }

            setCarrierPayment(data.carrier_payment);
            setPlatformFee(data.platform_fee);
            setEstimatedPrice(data.final_price); 
            setPriceValidSeconds(20 * 60); // 20 minutos
            setPricingFactors(data.factors.rpc_factors);
            setMlFactors({ ml_factor: data.factors.ml_factor, market_factor: data.factors.market_factor });
            setPricingLogId(data.log_id);
            setPriceBreakdown(data.breakdown);
            
        } catch (err: any) {
            console.error("Error calculating price via RPC:", err.message || err);
            setEstimatedPrice(0);
            setCarrierPayment(0);
            setPlatformFee(0);
            setError("No se pudo calcular el precio en tiempo real.");
        } finally {
            setIsRefreshingPrice(false);
        }
    }, [routeDetails, vehicleType, globalSettings, pickup.address, delivery.address, depot.address, weatherCondition, serviceType, specialHandling, accessorials, pickupDate, pickupWindow, operationType]);

    useEffect(() => {
        calculatePrice();
    }, [calculatePrice]);

    const calculatePriceRef = useRef(calculatePrice);
    useEffect(() => {
        calculatePriceRef.current = calculatePrice;
    }, [calculatePrice]);



    // Timer para expiración de cotización
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (priceValidSeconds > 0) {
            interval = setInterval(() => {
                setPriceValidSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [priceValidSeconds]);


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
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            value
            )}.json?access_token=${MAPBOX_TOKEN}&country=CL&autocomplete=true&limit=5`
        ).then((res) => res.json());
        setSuggestions(response.features || []);
        } catch (err) {
        setSuggestions([]);
        }
    };

    const handleDepotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDepot({ address: value, coords: null as any });
        setRouteDetails({ distance: 0, duration: 0, geometry: null as any });
        
        if (value.length < 3) {
            setDepotSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                value
                )}.json?access_token=${MAPBOX_TOKEN}&country=CL&autocomplete=true&limit=5`
            ).then((res) => res.json());
            setDepotSuggestions(response.features || []);
        } catch (err) {
            setDepotSuggestions([]);
        }
    };

    const handleSelectDepotSuggestion = (suggestion: any) => {
        setDepot({ address: suggestion.place_name, coords: suggestion.center });
        setRouteDetails({ distance: 0, duration: 0, geometry: null as any });
        setDepotSuggestions([]);
    };

    const handleSelectSuggestion = (suggestion: any, type: 'pickup' | 'delivery') => {
        const setAddress = type === 'pickup' ? setPickup : setDelivery;
        const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;
        setAddress({ address: suggestion.place_name, coords: suggestion.center });
        setRouteDetails({ distance: 0, duration: 0, geometry: null });
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
          const { error: insertError } = await supabase.from('shipments').insert({
            id: customShipmentId,
            clientId: user.id,
            carrierId: isInternalShipment ? user.id : null,
            // Coordenadas PostGIS
            origin: `POINT(${pickup.coords[0]} ${pickup.coords[1]})`,
            destination: `POINT(${delivery.coords[0]} ${delivery.coords[1]})`,
            originAddress: pickup.address,
            destinationAddress: delivery.address,
            // Precio y Estado
            estimatedPrice: finalBookingMethod === 'instant' ? estimatedPrice : 0,
            carrier_payment: finalBookingMethod === 'instant' ? carrierPayment : 0,
            vorian_commission: finalBookingMethod === 'instant' ? platformFee : 0,
            status: isInternalShipment ? 'BOOKED' : 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Todos los detalles técnicos en JSONB
            details: {
              equipment,
              serviceType,
              pickupDate: pickupDate.toISOString(),
              pickupWindow,
              deliveryDate: deliveryDate.toISOString(),
              deliveryWindow,
              commodity,
              weightLbs: parseInt(weightLbs) || 0,
              pallets: parseInt(pallets) || 0,
              dimensions,
              itemDescription,
              quantity: parseInt(quantity) || 0,
              dimensionsPerItem,
              totalVolume: parseFloat(totalVolume) || 0,
              specialHandling,
              accessorials,
              carrierRating: parseInt(carrierRating),
              uberFreightPreferred,
              cargoNotes,
              bookingMethod: finalBookingMethod,
              route: routeDetails.geometry,
              serviceMode: serviceType === 'FTL' ? 'exclusive' : 'consolidated',
              vehicleType,
            },
            // Campos adicionales de tracking
            customer_id: user.id,
            driverId: null,
            carrier_cost: carrierPayment,
            client_price: estimatedPrice,
          });
          
          if (insertError) {
            console.error('Supabase insert error:', JSON.stringify(insertError, null, 2));
            throw new Error(`[${insertError.code}] ${insertError.message}${insertError.details ? ' | ' + insertError.details : ''}`);
          }

          router.push('/customer');
        } catch (err: any) {
          console.error(err);
          setError("No se pudo crear el envío: " + (err.message || JSON.stringify(err)));
        } finally {
          setIsLoading(false);
        }
    };
    
    return (
        <div className="max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-6">Crear Nuevo Envío - {step === 1 ? 'Ruta y Horario' : step === 2 ? 'Detalles de Carga' : 'Opciones y Reserva'}</h1>
            
            {/* Mapa siempre visible - se actualiza a medida que el usuario ingresa direcciones */}
            <div className="h-80 w-full rounded-lg overflow-hidden border mb-8">
                <Map 
                  route={routeDetails.geometry} 
                  origin={pickup.coords || null} 
                  destination={delivery.coords || null} 
                  drivers={null} 
                />
            </div>

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
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Tipo de Operación</h2>
                            <RadioGroup defaultValue="Nacional" value={operationType} onValueChange={setOperationType} className="grid grid-cols-3 gap-4 mb-6">
                                <div>
                                    <RadioGroupItem value="Nacional" id="nacional" className="peer sr-only" />
                                    <Label htmlFor="nacional" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        Nacional
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="Exportación" id="exportacion" className="peer sr-only" />
                                    <Label htmlFor="exportacion" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        Exportación
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="Importación" id="importacion" className="peer sr-only" />
                                    <Label htmlFor="importacion" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        Importación
                                    </Label>
                                </div>
                            </RadioGroup>

                            {operationType !== 'Nacional' && (
                                <div className="mb-6 space-y-2 p-4 border rounded-xl bg-muted/30">
                                    <label className="text-sm font-semibold text-foreground">Depósito de Vacíos</label>
                                    <p className="text-xs text-muted-foreground mb-2">Ingresa la ubicación del depósito para el retiro o devolución del contenedor vacío.</p>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input value={depot.address} onChange={handleDepotChange} placeholder="Buscar depósito (ej. D&C San Antonio)" className="pl-10 h-12 bg-background border focus-visible:ring-primary" autoComplete="off" />
                                        {depotSuggestions.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                                {depotSuggestions.map(s => <div key={s.id} onMouseDown={() => handleSelectDepotSuggestion(s)} className="p-3 cursor-pointer hover:bg-accent">{s.place_name}</div>)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                                {pickupSuggestions.map(s => <div key={s.id} onMouseDown={() => handleSelectSuggestion(s, 'pickup')} className="p-3 cursor-pointer hover:bg-accent">{s.place_name}</div>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("justify-start text-left font-normal h-12 bg-muted/50 border-0", !pickupDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {pickupDate ? format(pickupDate, "PPP") : <span>Elige una fecha</span>}
                                            </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus /></PopoverContent>
                                        </Popover>
                                        <Input value={pickupWindow} onChange={e => setPickupWindow(e.target.value)} placeholder="Ventana de tiempo" className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                                    </div>
                                </div>
                                {/* Delivery */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground">Entrega</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input value={delivery.address} onChange={(e) => handleAddressChange(e.target.value, 'delivery')} placeholder="Ubicación" className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary" autoComplete="off" />
                                        {deliverySuggestions.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                                {deliverySuggestions.map(s => <div key={s.id} onMouseDown={() => handleSelectSuggestion(s, 'delivery')} className="p-3 cursor-pointer hover:bg-accent">{s.place_name}</div>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("justify-start text-left font-normal h-12 bg-muted/50 border-0", !deliveryDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {deliveryDate ? format(deliveryDate, "PPP") : <span>Elige una fecha</span>}
                                            </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus /></PopoverContent>
                                        </Popover>
                                        <Input value={deliveryWindow} onChange={e => setDeliveryWindow(e.target.value)} placeholder="Ventana de tiempo" className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" />
                                    </div>
                                </div>
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
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mt-10 mb-4">Tipo de Vehículo (para Tarifa)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                {/* Camion 3/4 */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setVehicleType('camion_3_4')}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-32 p-4 border-2 rounded-xl transition-all duration-200",
                                        vehicleType === 'camion_3_4' 
                                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                            : "border-muted bg-card hover:bg-accent/50 hover:border-accent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center justify-center h-12 mb-2">
                                        <Truck className={cn("w-7 h-7 transition-colors", vehicleType === 'camion_3_4' ? "text-primary" : "text-muted-foreground")} />
                                    </div>
                                    <span className={cn("font-bold text-xs text-center", vehicleType === 'camion_3_4' ? "text-foreground" : "")}>Camión 3/4<br/><span className="font-normal opacity-80">(3.5T - 5T)</span></span>
                                </Button>

                                {/* Camion Ligero */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setVehicleType('Camion Ligero')}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-32 p-4 border-2 rounded-xl transition-all duration-200",
                                        vehicleType === 'Camion Ligero' 
                                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                            : "border-muted bg-card hover:bg-accent/50 hover:border-accent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center justify-center h-12 mb-2">
                                        <Truck className={cn("w-9 h-9 transition-colors", vehicleType === 'Camion Ligero' ? "text-primary" : "text-muted-foreground")} />
                                    </div>
                                    <span className={cn("font-bold text-xs text-center", vehicleType === 'Camion Ligero' ? "text-foreground" : "")}>Camión Rígido<br/><span className="font-normal opacity-80">(CAT 2)</span></span>
                                </Button>

                                {/* Camion Pesado */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setVehicleType('Camion Pesado')}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-32 p-4 border-2 rounded-xl transition-all duration-200",
                                        vehicleType === 'Camion Pesado' 
                                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                            : "border-muted bg-card hover:bg-accent/50 hover:border-accent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center justify-center h-12 mb-2">
                                        <Truck className={cn("w-12 h-12 transition-colors", vehicleType === 'Camion Pesado' ? "text-primary" : "text-muted-foreground")} />
                                    </div>
                                    <span className={cn("font-bold text-xs text-center", vehicleType === 'Camion Pesado' ? "text-foreground" : "")}>Tracto-Camión<br/><span className="font-normal opacity-80">(CAT 3)</span></span>
                                </Button>
                            </div>
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
                                                <div className="flex items-baseline gap-2 min-h-[40px]">
                                                    {isRefreshingPrice ? (
                                                        <div className="flex items-center gap-2 text-primary mt-2">
                                                            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                            <span className="text-sm font-bold animate-pulse">Calculando...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col mt-2">
                                                            <p className="text-xs font-medium text-muted-foreground">Subtotal (Neto): ${estimatedPrice.toLocaleString()}</p>
                                                            <p className="text-2xl font-bold text-foreground">Total: ${Math.round(estimatedPrice * 1.19).toLocaleString()}</p>
                                                        </div>
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
                                <Button type="button" onClick={handleBookShipment} size="lg" className="bg-foreground hover:bg-foreground/90 text-background h-12 px-6" disabled={isLoading || (bookingMethod === 'instant' && priceValidSeconds === 0)}>
                                    {isLoading ? 'Reservando...' : 'Revisar y Confirmar Envío'}
                                </Button>
                            </div>
                        </div>
                    )}
                  </form>
                </div>

                {/* Right Column: Summary */}
                <div className="space-y-6">
                    <Card className="bg-card border shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Resumen del Envío</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Tarifa Garantizada</p>
                            <div className="flex items-baseline gap-2 min-h-[48px]">
                                {isRefreshingPrice ? (
                                    <div className="flex items-center gap-3 text-primary py-1">
                                        <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-base font-bold animate-pulse">Calculando tarifa dinámica...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col w-full">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">Subtotal (Neto): ${estimatedPrice > 0 ? estimatedPrice.toLocaleString() : '----'}</p>
                                        <p className="text-4xl font-bold tracking-tight text-foreground">Total: ${estimatedPrice > 0 ? Math.round(estimatedPrice * 1.19).toLocaleString() : '----'}</p>
                                    </div>
                                )}
                            </div>
                            
                            {estimatedPrice > 0 && priceValidSeconds > 0 && (
                                <div className="mt-4 mb-2">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Tarifa garantizada por:</span>
                                        <span className="font-mono">
                                            {Math.floor(priceValidSeconds / 60)}:{(priceValidSeconds % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full transition-all duration-1000 ease-linear", priceValidSeconds < 120 ? "bg-red-500" : "bg-primary")}
                                            style={{ width: `${(priceValidSeconds / 1200) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            {estimatedPrice > 0 && priceValidSeconds === 0 && (
                                <div className="mt-4 mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm font-medium flex items-center justify-between">
                                    <span>La cotización expiró.</span>
                                    <Button variant="outline" size="sm" onClick={calculatePrice} className="h-7 text-xs border-red-200 hover:bg-red-50 dark:hover:bg-red-950">
                                        Recalcular
                                    </Button>
                                </div>
                            )}

                            {/* NUEVO: DESGLOSE DE TARIFA TRANSPARENTE */}
                            {estimatedPrice > 0 && priceBreakdown && (
                                <div className="mt-4 border border-border/50 rounded-lg overflow-hidden bg-card/50">
                                    <div 
                                        className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                                        onClick={() => setShowBreakdown(!showBreakdown)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Desglose de Tarifa</span>
                                        </div>
                                        <span className={cn("text-xs transition-transform duration-200", showBreakdown ? "rotate-180" : "")}>▼</span>
                                    </div>
                                    
                                    {showBreakdown && (
                                        <div className="p-4 space-y-3 text-sm animate-in fade-in slide-in-from-top-2">
                                            <div className="flex justify-between items-center text-muted-foreground">
                                                <span>Flete Base Operativo</span>
                                                <span className="font-mono">${priceBreakdown.base_freight.toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-orange-600/80 dark:text-orange-400/80">
                                                <div className="flex items-center gap-1 group relative">
                                                    <span className="border-b border-dashed border-orange-600/50 cursor-help">Tarifa Dinámica Vorian</span>
                                                    <div className="absolute bottom-full left-0 mb-2 hidden w-64 rounded bg-popover text-popover-foreground text-xs p-3 shadow-lg border group-hover:block z-10 font-normal">
                                                        Ajuste automático en tiempo real. Incluye:
                                                        <ul className="mt-1 ml-4 list-disc text-[10px] text-muted-foreground">
                                                            <li>Congestión local (alta demanda en tu zona)</li>
                                                            <li>Disponibilidad global de flota</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                                <span className="font-mono">{(priceBreakdown.market_adjustment + priceBreakdown.supply_demand_adjustment) >= 0 ? '+ ' : '- '}${Math.abs(priceBreakdown.market_adjustment + priceBreakdown.supply_demand_adjustment).toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between items-center text-blue-600/80 dark:text-blue-400/80">
                                                <span>Factor Clima ({weatherCondition})</span>
                                                <span className="font-mono">{priceBreakdown.weather_adjustment >= 0 ? '+ ' : '- '}${Math.abs(priceBreakdown.weather_adjustment).toLocaleString()}</span>
                                            </div>

                                            {priceBreakdown.accessorials_total > 0 && (
                                                <div className="flex justify-between items-center text-primary/80">
                                                    <span>Servicios Adicionales</span>
                                                    <span className="font-mono">+ ${priceBreakdown.accessorials_total.toLocaleString()}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center text-muted-foreground pt-2 border-t border-dashed">
                                                <span>Peajes (TAG)</span>
                                                <span className="font-mono">+ ${priceBreakdown.tolls_cost.toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between items-center font-bold text-foreground pt-2 border-t">
                                                <span>Total a Pagar</span>
                                                <span className="font-mono">${estimatedPrice.toLocaleString()}</span>
                                            </div>

                                            {/* Detalles Técnicos Transparentes */}
                                            {pricingFactors && (
                                                <div className="mt-6 pt-4 border-t-2 border-primary/20 space-y-2 bg-muted/10 -mx-4 px-4 pb-2">
                                                    <div className="text-[10px] font-black uppercase text-primary tracking-[0.1em] mb-3 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                        Matemática del Flete Base Operativo
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                                                        <span>Costo Diésel Calculado (CNE)</span>
                                                        <span className="font-mono">${Math.round(pricingFactors.base_cost_diesel || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                                                        <span>Costo Conductor</span>
                                                        <span className="font-mono">${Math.round(pricingFactors.base_cost_driver || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                                                        <span>Mantenimiento & Neumáticos</span>
                                                        <span className="font-mono">${Math.round(pricingFactors.base_cost_maintenance || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                                                        <span>Margen Base Transportista</span>
                                                        <span className="font-mono">${Math.round(pricingFactors.base_margin || 0).toLocaleString()}</span>
                                                    </div>
                                                    
                                                    <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                                                        <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-1">
                                                            <span>Multiplicador Peso/Terreno</span>
                                                            <span className="font-mono">x {( (pricingFactors.weight_factor || 1.0) * (pricingFactors.terrain_factor || 1.0) ).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-6 space-y-2 text-sm border-t pt-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Distancia</span>
                                    <span className="font-medium text-foreground">{(routeDetails.distance / 1000).toFixed(1)} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Equipamiento</span>
                                    <span className="font-medium text-foreground">{vehicleType === 'camion_3_4' ? 'Camión 3/4' : vehicleType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Clima Detectado</span>
                                    <span className="font-medium text-foreground">
                                        {weatherCondition === 'Clear' ? '☀️ Despejado' : 
                                         weatherCondition === 'Clouds' ? '☁️ Nublado' : 
                                         weatherCondition === 'Rain' ? '🌧️ Lluvia' : 
                                         weatherCondition === 'Snow' ? '❄️ Nieve' : 
                                         weatherCondition === 'Fog' || weatherCondition === 'Mist' ? '🌫️ Neblina' :
                                         weatherCondition}
                                    </span>
                                </div>
                                {!isInternalShipment && estimatedPrice > 0 && (
                                    <>
                                        <div className="flex justify-between pt-2 mt-2 border-t">
                                            <span className="font-semibold text-muted-foreground">Pago a Transportista</span>
                                            <span className="font-semibold text-foreground">${carrierPayment.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Comisión Vorian (10%)</span>
                                            <span className="font-medium text-foreground">${platformFee.toLocaleString()}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <Button className="w-full h-12 mt-6 font-bold text-lg bg-foreground hover:bg-foreground/90 text-background" onClick={handleBookShipment} disabled={isLoading || (bookingMethod === 'instant' && (estimatedPrice <= 0 || priceValidSeconds === 0)) || step !== 3}>
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
