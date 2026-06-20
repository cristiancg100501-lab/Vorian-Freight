'use client';

import { useState, useEffect } from 'react';
import { useSupabase, useUser } from '@/components/providers/supabase-provider';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, MapPin, DollarSign, Calendar as CalendarIcon, Save, ArrowLeft, User, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});

const MAPBOX_TOKEN = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

export default function ManagedShipmentPage() {
    const { supabase } = useSupabase();
    const { user } = useUser();
    const router = useRouter();

    // Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [pickup, setPickup] = useState({ address: '', coords: null as any });
    const [delivery, setDelivery] = useState({ address: '', coords: null as any });
    const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
    const [manualCarrierCost, setManualCarrierCost] = useState<string>('');
    const [manualClientPrice, setManualClientPrice] = useState<string>('');
    const [description, setDescription] = useState('Carga General');

    // Data State
    const [customers, setCustomers] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
    const [deliverySuggestions, setDeliverySuggestions] = useState<any[]>([]);
    const [routeDetails, setRouteDetails] = useState({ distance: 0, duration: 0, geometry: null as any });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const { data: usersData } = await supabase.from("userProfiles").select("id, name, role, email");
            if (usersData) {
                setCustomers(usersData.filter((u: any) => u.role === 'customer' || u.role === 'client'));
                setDrivers(usersData.filter((u: any) => u.role === 'driver'));
            }
        };
        fetchData();
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
            }
          }
        };
        calculateRoute();
    }, [pickup.coords, delivery.coords]);

    const handleAddressChange = async (value: string, type: 'pickup' | 'delivery') => {
        const setAddress = type === 'pickup' ? setPickup : setDelivery;
        const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;

        setAddress({ address: value, coords: null });
        if (value.length < 3) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&country=CL&autocomplete=true&limit=5`
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

    const handleSave = async () => {
        if (!selectedCustomerId || !pickup.coords || !delivery.coords || !manualCarrierCost || !manualClientPrice) {
            setError("Por favor completa todos los campos obligatorios.");
            return;
        }

        setIsLoading(true);
        setError(null);

        const customId = `MNG-${Date.now().toString().slice(-6)}`;

        try {
            const { data, error: insertError } = await supabase.from('shipments').insert({
                id: customId,
                customer_id: selectedCustomerId,
                driver_id: selectedDriverId || null,
                clientId: user?.id,
                originAddress: pickup.address,
                pickup_latitude: pickup.coords[1],
                pickup_longitude: pickup.coords[0],
                destinationAddress: delivery.address,
                delivery_latitude: delivery.coords[1],
                delivery_longitude: delivery.coords[0],
                pickup_date: pickupDate?.toISOString(),
                carrier_cost: parseFloat(manualCarrierCost),
                client_price: parseFloat(manualClientPrice),
                itemDescription: description,
                status: 'Booked',
                equipment: 'Dry van',
                serviceType: 'FTL',
                bookingMethod: 'instant',
                estimatedPrice: parseFloat(manualClientPrice),
                estimated_price: parseFloat(manualClientPrice),
                createdAt: new Date().toISOString(),
            }).select();

            if (insertError) {
                console.error("DETAILED INSERT ERROR:", insertError);
                throw new Error(`DB Error: ${insertError.message} (${insertError.code}) - ${insertError.details}`);
            }
            router.push('/admin/shipments');
        } catch (err: any) {
            console.error(err);
            setError(`Error: ${err.message || "Error al crear el envío gestionado"}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nuevo Envío Gestionado</h1>
                    <p className="text-muted-foreground">Cree un envío directo asignando mandante, chofer y precios.</p>
                </div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-6">
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Asignación de Actores</CardTitle>
                            <CardDescription>Seleccione a quién pertenece la carga y quién la llevará.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Empresa Mandante (Cliente)</label>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Seleccionar Mandante" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Chofer de Confianza (Opcional)</label>
                                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Asignar Chofer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name || d.email}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Ruta y Carga</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Origen</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        value={pickup.address} 
                                        onChange={(e) => handleAddressChange(e.target.value, 'pickup')} 
                                        placeholder="Dirección de recogida" 
                                        className="pl-10 h-12" 
                                        autoComplete="off" 
                                    />
                                    {pickupSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                            {pickupSuggestions.map(s => <div key={s.id} onMouseDown={() => handleSelectSuggestion(s, 'pickup')} className="p-3 cursor-pointer hover:bg-accent">{s.place_name}</div>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Destino</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        value={delivery.address} 
                                        onChange={(e) => handleAddressChange(e.target.value, 'delivery')} 
                                        placeholder="Dirección de entrega" 
                                        className="pl-10 h-12" 
                                        autoComplete="off" 
                                    />
                                    {deliverySuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                            {deliverySuggestions.map(s => <div key={s.id} onMouseDown={() => handleSelectSuggestion(s, 'delivery')} className="p-3 cursor-pointer hover:bg-accent">{s.place_name}</div>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Fecha</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full h-12 justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {pickupDate ? format(pickupDate, "PPP") : "Seleccionar"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Descripción</label>
                                    <Input value={description} onChange={e => setDescription(e.target.value)} className="h-12" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-500/20 bg-green-500/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-green-500" /> Control de Precios
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-red-400">Costo (Pago a Chofer)</label>
                                <Input 
                                    type="number" 
                                    value={manualCarrierCost} 
                                    onChange={e => setManualCarrierCost(e.target.value)} 
                                    placeholder="0" 
                                    className="h-12 border-red-500/30 bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-green-400">Precio (Cobro a Cliente)</label>
                                <Input 
                                    type="number" 
                                    value={manualClientPrice} 
                                    onChange={e => setManualClientPrice(e.target.value)} 
                                    placeholder="0" 
                                    className="h-12 border-green-500/30 bg-background"
                                />
                            </div>
                            <div className="col-span-full pt-2 border-t mt-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Margen Proyectado:</span>
                                    <span className="font-bold text-lg text-primary">
                                        ${((parseFloat(manualClientPrice) || 0) - (parseFloat(manualCarrierCost) || 0)).toLocaleString('es-CL')}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                    <Button 
                        size="lg" 
                        className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20" 
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Guardando...' : 'Confirmar y Crear Envío'}
                        {!isLoading && <Save className="ml-2 h-5 w-5" />}
                    </Button>
                </div>

                {/* Mapa y Resumen */}
                <div className="space-y-6">
                    <Card className="h-[400px] overflow-hidden">
                        <Map 
                            route={routeDetails.geometry} 
                            origin={pickup.coords} 
                            destination={delivery.coords} 
                            drivers={null} 
                        />
                    </Card>

                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-base">Detalles del Viaje</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Distancia:</span>
                                <span className="font-semibold">{(routeDetails.distance / 1000).toFixed(1)} km</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Duración Est.:</span>
                                <span className="font-semibold">{Math.round(routeDetails.duration / 60)} min</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
