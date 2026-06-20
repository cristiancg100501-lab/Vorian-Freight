'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Calendar, DollarSign, User, ArrowLeft, Save, Map as MapIcon, Activity, CheckCircle2, Clock } from 'lucide-react';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MAPBOX_TOKEN = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

export default function ShipmentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { supabase } = useSupabase();

    const [shipment, setShipment] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [customer, setCustomer] = useState<any>(null);
    const [driver, setDriver] = useState<any>(null);
    const [routeGeometry, setRouteGeometry] = useState<any>(null);

    useEffect(() => {
        const fetchShipment = async () => {
            const { data, error } = await supabase.from('shipments').select('*').eq('id', id).single();
            if (data) {
                setShipment(data);
                
                // Fetch Customer & Driver details
                if (data.customer_id) {
                    const { data: cust } = await supabase.from('userProfiles').select('*').eq('id', data.customer_id).single();
                    setCustomer(cust);
                }
                if (data.driver_id) {
                    const { data: drv } = await supabase.from('userProfiles').select('*').eq('id', data.driver_id).single();
                    setDriver(drv);
                }

                // Fetch Route
                const origin = [data.pickup_longitude || 0, data.pickup_latitude || 0];
                const destination = [data.delivery_longitude || 0, data.delivery_latitude || 0];
                if (origin[0] !== 0 && destination[0] !== 0) {
                    fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${origin.join(',')};${destination.join(',')}?geometries=geojson&access_token=${MAPBOX_TOKEN}`)
                        .then(res => res.json())
                        .then(json => {
                            if (json.routes?.[0]) setRouteGeometry(json.routes[0].geometry);
                        });
                }
            }
            setIsLoading(false);
        };
        fetchShipment();
    }, [id, supabase]);

    const handleUpdateStatus = async (newStatus: string) => {
        setIsSaving(true);
        const { error } = await supabase.from('shipments').update({ status: newStatus }).eq('id', id);
        if (!error) {
            setShipment({ ...shipment, status: newStatus });
        }
        setIsSaving(false);
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando detalles del envío...</div>;
    if (!shipment) return <div className="p-8 text-center text-red-500">Envío no encontrado.</div>;

    const margin = (shipment.client_price || 0) - (shipment.carrier_cost || 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            {shipment.id}
                            <Badge variant={shipment.status === 'Delivered' ? 'default' : 'secondary'} className="text-xs uppercase px-3">
                                {shipment.status}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground">Gestionado por Vorian Freight</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={shipment.status} onValueChange={handleUpdateStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Cambiar Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pending">Pendiente</SelectItem>
                            <SelectItem value="Booked">Reservado</SelectItem>
                            <SelectItem value="In transit">En Tránsito</SelectItem>
                            <SelectItem value="Delivered">Entregado</SelectItem>
                            <SelectItem value="Cancelled">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel de Seguimiento y Mapa */}
                <Card className="lg:col-span-2 overflow-hidden border-2 border-primary/10">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapIcon className="h-4 w-4 text-primary" /> Ruta y Seguimiento en Vivo
                        </CardTitle>
                    </CardHeader>
                    <div className="h-[450px] relative">
                        <Map 
                            route={routeGeometry} 
                            origin={[shipment.pickup_longitude, shipment.pickup_latitude]} 
                            destination={[shipment.delivery_longitude, shipment.delivery_latitude]}
                            drivers={shipment.current_latitude ? [{
                                userId: shipment.driver_id,
                                currentLatitude: shipment.current_latitude,
                                currentLongitude: shipment.current_longitude,
                                isAvailable: true
                            }] : null}
                        />
                        {shipment.current_latitude && (
                            <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg border shadow-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-3 w-3 bg-green-500 rounded-full animate-ping" />
                                    <span className="text-sm font-bold">Ubicación Actual del Chofer</span>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {shipment.current_latitude.toFixed(4)}, {shipment.current_longitude.toFixed(4)}
                                </span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Resumen Financiero y Actores */}
                <div className="space-y-6">
                    <Card className="border-green-500/20 bg-green-500/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase text-green-600 tracking-wider">Economía del Viaje</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Cobro a Cliente:</span>
                                <span className="font-bold text-lg">${(shipment.client_price || 0).toLocaleString('es-CL')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Pago a Chofer:</span>
                                <span className="font-bold text-lg text-red-500">-${(shipment.carrier_cost || 0).toLocaleString('es-CL')}</span>
                            </div>
                            <div className="pt-3 border-t border-green-500/10 flex justify-between items-center">
                                <span className="text-sm font-bold">Margen de Ganancia:</span>
                                <div className="text-right">
                                    <span className="font-black text-2xl text-green-600">${margin.toLocaleString('es-CL')}</span>
                                    <p className="text-[10px] text-green-600/70 font-bold">PROYECTADO</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Participantes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Mandante (Cliente)</p>
                                    <p className="font-bold">{customer?.name || customer?.email || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">{customer?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Transportista (Chofer)</p>
                                    <p className="font-bold">{driver?.name || driver?.email || 'No asignado'}</p>
                                    <p className="text-xs text-muted-foreground">{driver?.email || 'Esperando asignación'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Logística</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-bold">
                                    <div className="h-2 w-2 bg-green-500 rounded-full" /> Origen
                                </div>
                                <p className="text-xs pl-4 text-muted-foreground">{shipment.originAddress || shipment.pickup_address}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-bold">
                                    <div className="h-2 w-2 bg-red-500 rounded-full" /> Destino
                                </div>
                                <p className="text-xs pl-4 text-muted-foreground">{shipment.destinationAddress || shipment.delivery_address}</p>
                            </div>
                            <div className="pt-2 flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{shipment.pickup_date ? format(new Date(shipment.pickup_date), "PPP") : 'Sin fecha'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
