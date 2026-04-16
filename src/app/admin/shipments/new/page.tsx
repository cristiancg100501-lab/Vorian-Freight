'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSupabase, useUser } from '@/components/providers/supabase-provider';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Layers, Calendar as CalendarIcon, MapPin, ArrowRight, ArrowLeft, Upload, Package, Ruler, Weight, Check, Star, HelpCircle, Bolt } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import Map from '@/components/map';
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
    const [clientId, setClientId] = useState('');
    const [isInternalShipment, setIsInternalShipment] = useState(false);
    const [equipment, setEquipment] = useState('Dry van');
    const [pickup, setPickup] = useState({ address: '', coords: null as any });
    const [delivery, setDelivery] = useState({ address: '', coords: null as any });
    const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    const [pickupWindow, setPickupWindow] = useState('8:00 AM - 12:00 PM');
    const [deliveryWindow, setDeliveryWindow] = useState('1:00 PM - 5:00 PM');
    const [vehicleType, setVehicleType] = useState('Camion Pesado');
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
            try {
              const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pickup.coords.join(',')};${delivery.coords.join(',')}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
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
                const { data: rateData, error: rateError } = await supabase.from("vehicleRates").select().eq("id", vehicleType).single();

                if (rateData) {
                    const dKm = routeDetails.distance / 1000;
                    const eTime = Math.round(routeDetails.duration / 60);
                    const dieselPrice = globalSettings.dieselCostPerLiter || 0;

                    const { baseFare = 0, costPerKm = 0, costPerMinute = 0, fuelEfficiency = 0, overnightStay = 0 } = rateData;

                    if (fuelEfficiency <= 0) {
                         setError(`Rendimiento para "${vehicleType}" no está configurado.`);
                         setEstimatedPrice(0);
                         setCarrierPayment(0);
                         setPlatformFee(0);
                         return;
                    }
                    if (dieselPrice <= 0) {
                        setError(`Precio del combustible no está configurado.`);
                        setEstimatedPrice(0);
                        setCarrierPayment(0);
                        setPlatformFee(0);
                        return;
                    }

                    const fuelCost = (dKm / fuelEfficiency) * dieselPrice;
                    const wearAndTearCost = dKm * costPerKm;
                    const driverTimeCost = eTime * costPerMinute;
                    const overnightCost = (eTime > 8 * 60) ? overnightStay : 0;
                    
                    const calculatedPrice = baseFare + fuelCost + wearAndTearCost + driverTimeCost + overnightCost;
                    const commission = calculatedPrice * 0.10;
                    const finalPrice = calculatedPrice + commission;

                    setCarrierPayment(Math.round(calculatedPrice));
                    setPlatformFee(Math.round(commission));
                    setEstimatedPrice(Math.round(finalPrice));

                } else {
                    setEstimatedPrice(0);
                    setCarrierPayment(0);
                    setPlatformFee(0);
                    setError(`No se encontraron tarifas para "${vehicleType}".`);
                }
            } catch (err) {
                console.error("Error calculating price:", err);
                setEstimatedPrice(0);
                setCarrierPayment(0);
                setPlatformFee(0);
                setError("No se pudo calcular el precio.");
            }
        };

        calculatePrice();
    }, [supabase, routeDetails, vehicleType, globalSettings]);


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

    const handleSelectSuggestion = (suggestion: any, type: 'pickup' | 'delivery') => {
        const setAddress = type === 'pickup' ? setPickup : setDelivery;
        const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;
        setAddress({ address: suggestion.place_name, coords: suggestion.center });
        setSuggestions([]);
    };
    
    const handleBookShipment = async () => {
        if (!user) {
            setError("Error: No has iniciado sesión.");
            return;
        }
        if (!clientId) {
            setError("Por favor, ingrese el ID del cliente.");
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
            clientId: clientId,
            carrierId: isInternalShipment ? clientId : null,
            // Step 1 Data
            equipment: equipment,
            serviceType: serviceType,
            pickup_address: pickup.address,
            pickup_latitude: pickup.coords[1],
            pickup_longitude: pickup.coords[0],
            delivery_address: delivery.address,
            delivery_latitude: delivery.coords[1],
            delivery_longitude: delivery.coords[0],
            pickup_date: pickupDate.toISOString(),
            pickup_window: pickupWindow,
            delivery_date: deliveryDate.toISOString(),
            delivery_window: deliveryWindow,
             // Step 2 Data
            commodity,
            weight_lbs: parseInt(weightLbs) || 0,
            pallets: parseInt(pallets) || 0,
            dimensions: dimensions,
            itemDescription,
            quantity: parseInt(quantity) || 0,
            dimensionsPerItem: dimensionsPerItem,
            totalVolume: parseFloat(totalVolume) || 0,
            ...specialHandling,
            // Step 3 Data
            accessorials,
            carrierRating: parseInt(carrierRating),
            uberFreightPreferred,
            cargoNotes,
            bookingMethod: finalBookingMethod,
            // Metadata
            estimated_price: finalBookingMethod === 'instant' ? estimatedPrice : 0,
            status: isInternalShipment ? 'Booked' : 'Pending',
            createdAt: new Date().toISOString(),
          });
          
          if (insertError) throw insertError;

          router.push('/admin');
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
            
            <div className="h-80 w-full rounded-lg overflow-hidden border mb-8">
                <Map route={routeDetails.geometry} origin={pickup.coords} destination={delivery.coords} drivers={null} />
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
                            <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Ruta y Horario</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Client ID */}
                                <div className="space-y-2 col-span-full">
                                    <label className="text-sm font-semibold text-foreground">Client ID</label>
                                    <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="User ID of the client creating the shipment" className="h-12 bg-muted/50 border-0 focus-visible:ring-primary" required />
                                </div>
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
                                    <Label htmlFor="internal-shipment">Envío para flota propia del cliente</Label>
                                    <p className="text-xs text-muted-foreground">
                                        El envío será privado y asignado al mismo cliente como transportista.
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
                                    <SelectItem value="Camion Ligero">Camión Ligero</SelectItem>
                                    <SelectItem value="Camion Pesado">Camión Pesado</SelectItem>
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
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-2xl font-bold mt-2">${estimatedPrice.toLocaleString()}</p>
                                                    {estimatedPrice > 0 && <span className="text-base font-medium text-muted-foreground">+ IVA</span>}
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

                {/* Right Column: Summary */}
                <div className="space-y-6">
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
                                            <span className="font-semibold text-foreground">${carrierPayment.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Comisión Vorian (10%)</span>
                                            <span className="font-medium text-foreground">${platformFee.toLocaleString()}</span>
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
