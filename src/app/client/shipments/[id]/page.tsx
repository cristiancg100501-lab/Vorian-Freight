"use client";

import { useEffect, useState, useMemo, use, useRef, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Truck, CheckCircle, Clock, Package, FileText, Lock, KeyRound, Bell, X } from "lucide-react";
import ShipmentTrackingMap from "@/components/shipment-tracking-map";
import { SignalIndicator } from "@/components/signal-indicator";

// Haversine distance in meters between two [lon, lat] points
function haversineMeters(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEOFENCE_RADIUS_M = 40; // 40 metres

const statusLabels: { [key: string]: string } = {
  "PENDING": "Pendiente",
  "ACCEPTED": "Aceptado",
  "EN_ROUTE_TO_PICKUP": "En ruta a recogida",
  "ARRIVED_AT_PICKUP": "En punto de recogida",
  "IN_TRANSIT": "En tránsito",
  "ARRIVED_AT_DROPOFF": "Entregado",
  "DELIVERED": "Entregado",
  "CANCELLED": "Cancelado",
};

const statusStyles: { [key: string]: string } = {
  "PENDING": "bg-orange-100 text-orange-700",
  "ACCEPTED": "bg-blue-100 text-blue-700",
  "IN_TRANSIT": "bg-sky-100 text-sky-800",
  "DELIVERED": "bg-green-100 text-green-700",
  "ARRIVED_AT_DROPOFF": "bg-green-100 text-green-700",
  "CANCELLED": "bg-red-100 text-red-700",
};

export default function ClientShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const shipmentId = unwrappedParams.id;
  const { supabase } = useSupabase();

  const [shipment, setShipment] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedRoute, setFetchedRoute] = useState<any>(null);

  // Geofence alert state
  const [geofenceAlert, setGeofenceAlert] = useState<{
    type: 'pickup' | 'delivery';
    address: string;
  } | null>(null);
  const geofenceTriggered = useRef<Set<string>>(new Set()); // prevent repeated alerts

  // Cargar Envío
  useEffect(() => {
    const fetchShipment = async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("id", shipmentId)
        .single();

      if (error) {
        console.error("Error fetching shipment:", error);
      } else if (data) {
        const driverId = data.driverId || data.driver_id || data.carrierId || data.carrier_id;
        data.effectiveDriverId = driverId;
        if (driverId) {
          const { data: driverData } = await supabase
            .from("userProfiles")
            .select("id, name")
            .eq("id", driverId)
            .single();
          data.driver = driverData || { id: driverId, name: 'Transportista Vorian' };
        } else {
          data.driver = null;
        }
        setShipment(data);
      }
      setIsLoading(false);
    };
    fetchShipment();
  }, [shipmentId, supabase]);

  // Realtime — estado del envío
  useEffect(() => {
    if (!shipmentId) return;
    const channel = supabase
      .channel(`client-shipment-${shipmentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shipments", filter: `id=eq.${shipmentId}` },
        (payload) => setShipment((prev: any) => ({ ...prev, ...payload.new }))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shipmentId, supabase]);

  // Realtime — ubicación del conductor
  useEffect(() => {
    const activeDriverId = shipment?.effectiveDriverId || shipment?.driverId || shipment?.driver_id || shipment?.carrierId;
    if (!activeDriverId) return;
    const fetchInitialLocation = async () => {
      const { data } = await supabase
        .from('driverProfiles')
        .select('currentLatitude, currentLongitude, lastLocationUpdate, updatedAt')
        .eq('id', activeDriverId)
        .maybeSingle();
      if (data?.currentLatitude && data?.currentLongitude) {
        setDriverLocation([data.currentLongitude, data.currentLatitude]);
        const ts = data.lastLocationUpdate || data.updatedAt;
        if (ts) {
          const parsed = new Date(ts).getTime();
          // Si el timestamp es mayor a 5 minutos, refrescar con Date.now() si tiene coordenadas vivas
          setLastGpsUpdate(isNaN(parsed) || (Date.now() - parsed > 300000) ? Date.now() : parsed);
        } else {
          setLastGpsUpdate(Date.now());
        }
      }
    };
    fetchInitialLocation();

    const channel = supabase
      .channel(`client-driver-${activeDriverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driverProfiles", filter: `id=eq.${activeDriverId}` },
        (payload) => {
          if (payload.new.currentLatitude && payload.new.currentLongitude) {
            const dLon = payload.new.currentLongitude;
            const dLat = payload.new.currentLatitude;
            setDriverLocation([dLon, dLat]);
            setLastGpsUpdate(Date.now());

            // --- Geofence checks ---
            const status = shipment?.status;
            const pickupStates = ['ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'];
            const transitStates = ['IN_TRANSIT'];

            if (pickupStates.includes(status) && shipment?.pickup_longitude && shipment?.pickup_latitude) {
              const dist = haversineMeters(dLon, dLat, shipment.pickup_longitude, shipment.pickup_latitude);
              if (dist <= GEOFENCE_RADIUS_M && !geofenceTriggered.current.has('pickup')) {
                geofenceTriggered.current.add('pickup');
                setGeofenceAlert({ type: 'pickup', address: shipment.originAddress || 'Punto de recogida' });

                fetch('/api/notifications/notify-status-change', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    shipmentId,
                    newStatus: 'ARRIVED_AT_PICKUP',
                    previousStatus: status,
                  })
                }).catch(err => console.error("Error sending pickup arrival notification:", err));
              }
            }

            if (transitStates.includes(status) && shipment?.delivery_longitude && shipment?.delivery_latitude) {
              const dist = haversineMeters(dLon, dLat, shipment.delivery_longitude, shipment.delivery_latitude);
              if (dist <= GEOFENCE_RADIUS_M && !geofenceTriggered.current.has('delivery')) {
                geofenceTriggered.current.add('delivery');
                setGeofenceAlert({ type: 'delivery', address: shipment.destinationAddress || 'Punto de entrega' });

                fetch('/api/notifications/notify-status-change', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    shipmentId,
                    newStatus: 'ARRIVED_AT_DROPOFF',
                    previousStatus: status,
                  })
                }).catch(err => console.error("Error sending delivery arrival notification:", err));
              }
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shipment?.effectiveDriverId, shipment?.driverId, shipment?.driver_id, shipment?.carrierId, supabase]);

  // Parsear coordenadas para el mapa
  const { originCoords, destCoords, routeGeo } = useMemo(() => {
    if (!shipment) return { originCoords: null, destCoords: null, routeGeo: null };

    let origin: [number, number] | null = null;
    let dest: [number, number] | null = null;
    let route: any = null;

    // Coordenadas desde campos numéricos
    if (shipment.pickup_longitude && shipment.pickup_latitude) {
      origin = [shipment.pickup_longitude, shipment.pickup_latitude];
    }
    if (shipment.delivery_longitude && shipment.delivery_latitude) {
      dest = [shipment.delivery_longitude, shipment.delivery_latitude];
    }

    return { originCoords: origin, destCoords: dest, routeGeo: route };
  }, [shipment]);

  // Solicitar ruta a Mapbox si tenemos coords
  useEffect(() => {
    if (originCoords && destCoords && !routeGeo && !fetchedRoute) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&overview=full&access_token=pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ`
          );
          const data = await res.json();
          if (data.routes?.[0]?.geometry) {
            setFetchedRoute(data.routes[0].geometry);
          }
        } catch (e) {
          console.warn('No se pudo obtener la ruta:', e);
        }
      };
      fetchRoute();
    }
  }, [originCoords, destCoords, routeGeo, fetchedRoute]);

  const finalRoute = routeGeo || fetchedRoute;
  const isPending = shipment?.status === "PENDING";
  const isDelivered = shipment?.status === "DELIVERED" || shipment?.status === "ARRIVED_AT_DROPOFF";

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando detalles del envío...</div>;
  }

  if (!shipment) {
    return <div className="p-8 text-center text-red-500">Envío no encontrado.</div>;
  }

  return (
    <div className="space-y-6">

      {/* Geofence Arrival Alert Banner */}
      {geofenceAlert && (
        <div
          className="relative flex items-start gap-4 p-5 rounded-2xl border border-white/40 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-500"
          style={{
            background: geofenceAlert.type === 'pickup'
              ? 'linear-gradient(135deg, rgba(254,243,199,0.9) 0%, rgba(253,230,138,0.9) 100%)'
              : 'linear-gradient(135deg, rgba(209,250,229,0.9) 0%, rgba(167,243,208,0.9) 100%)',
            borderColor: geofenceAlert.type === 'pickup' ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)',
          }}
        >
          <div
            className="flex-shrink-0 h-14 w-14 rounded-full flex items-center justify-center shadow-inner"
            style={{ background: geofenceAlert.type === 'pickup' ? '#fbbf24' : '#10b981' }}
          >
            {geofenceAlert.type === 'pickup'
              ? <Truck className="h-7 w-7 text-white drop-shadow-md" />
              : <CheckCircle className="h-7 w-7 text-white drop-shadow-md" />}
          </div>
          <div className="flex-1 pt-1">
            <p className="font-bold text-lg" style={{ color: geofenceAlert.type === 'pickup' ? '#92400e' : '#065f46' }}>
              {geofenceAlert.type === 'pickup' ? '🚛 ¡El camión llegó al punto de recogida!' : '✅ ¡El camión llegó al destino!'}
            </p>
            <p className="text-sm mt-0.5" style={{ color: geofenceAlert.type === 'pickup' ? '#b45309' : '#047857' }}>
              {geofenceAlert.address}
            </p>
            <p className="text-xs mt-1 font-medium opacity-70" style={{ color: geofenceAlert.type === 'pickup' ? '#92400e' : '#065f46' }}>
              {geofenceAlert.type === 'pickup'
                ? 'El transportista está a menos de 40 metros. Entregue el código PIN de recogida.'
                : 'El transportista está a menos de 40 metros. Confirme la entrega con el PIN.'}
            </p>
          </div>
          <button
            onClick={() => setGeofenceAlert(null)}
            className="absolute top-4 right-4 p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 transition-all"
          >
            <X className="h-5 w-5" style={{ color: geofenceAlert.type === 'pickup' ? '#92400e' : '#065f46' }} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/client/shipments">
            <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Envíos
            </Button>
          </Link>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Package className="h-7 w-7 text-primary" />
            </div>
            Envío {shipment.id}
            <span className={`text-sm px-4 py-1.5 rounded-full font-bold shadow-sm ${statusStyles[shipment.status] || 'bg-muted text-muted-foreground'}`}>
              {statusLabels[shipment.status] || shipment.status}
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Panel lateral de información */}
        <div className="space-y-6 lg:col-span-1">
          {/* Ruta */}
          <Card className="bg-background/60 backdrop-blur-xl border-white/20 shadow-xl overflow-hidden rounded-2xl">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Detalles del Envío
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Origen</div>
                  <div className="text-muted-foreground">{shipment.originAddress || '—'}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Destino</div>
                  <div className="text-muted-foreground">{shipment.destinationAddress || '—'}</div>
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de servicio:</span>
                  <span className="font-medium">{shipment.serviceType || 'FTL'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descripción:</span>
                  <span className="font-medium">{shipment.itemDescription || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financiero */}
          <Card className="bg-background/60 backdrop-blur-xl border-white/20 shadow-xl overflow-hidden rounded-2xl">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio neto:</span>
                <span className="font-medium">
                  {shipment.client_price ? `$${Number(shipment.client_price).toLocaleString('es-CL')}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (19%):</span>
                <span className="font-medium">
                  {shipment.client_iva ? `$${Number(shipment.client_iva).toLocaleString('es-CL')}` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total con IVA:</span>
                <span className="text-primary">
                  {shipment.client_total ? `$${Number(shipment.client_total).toLocaleString('es-CL')}` : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* PIN de Confirmación */}
          {(() => {
            const st = shipment.status;
            const pickupStates = ['PENDING', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'];
            const deliveryStates = ['IN_TRANSIT', 'ARRIVED_AT_DROPOFF'];
            const isPickupPin = pickupStates.includes(st);
            const isDeliveryPin = deliveryStates.includes(st);
            const code = isPickupPin ? shipment.pickup_code : isDeliveryPin ? shipment.delivery_code : null;
            if (!code) return null;
            return (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-xl shadow-primary/5 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-primary/10 border-b border-primary/10">
                  <CardTitle className="text-base flex items-center gap-2 text-primary font-bold">
                    <KeyRound className="h-5 w-5" />
                    {isPickupPin ? 'PIN de Recogida' : 'PIN de Entrega'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-4">
                    {isPickupPin
                      ? 'Comparta este código con el transportista al momento del retiro de la carga.'
                      : 'Comparta este código con el transportista para confirmar la entrega.'}
                  </p>
                  <div className="flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-background border border-primary/20 shadow-inner">
                    <Lock className="h-6 w-6 text-primary/60" />
                    <span className="font-mono text-4xl font-black tracking-[0.3em] text-primary drop-shadow-sm">{code}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Transportista */}
          {(shipment.driver || shipment.effectiveDriverId || shipment.status === 'ACCEPTED' || shipment.status === 'IN_TRANSIT' || shipment.status === 'EN_ROUTE_TO_PICKUP') ? (
            <Card className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/50 dark:border-green-800/50 shadow-xl rounded-2xl overflow-hidden backdrop-blur-md">
              <CardHeader className="bg-green-500/10 dark:bg-green-500/5 pb-3 border-b border-green-200/30 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-green-800 dark:text-green-400 font-bold">
                  <CheckCircle className="h-5 w-5" />
                  Transportista Asignado
                </CardTitle>
                <SignalIndicator lastUpdatedMs={lastGpsUpdate} />
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center shadow-sm">
                      <Truck className="h-6 w-6 text-green-700 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{shipment.driver?.name || 'Transportista Vorian'}</div>
                      <div className="text-sm text-green-700/80 dark:text-green-400/80 font-medium">Conductor asignado</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isPending ? (
            <Card className="bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200/50 shadow-xl rounded-2xl overflow-hidden backdrop-blur-md">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse shadow-inner">
                    <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="font-black text-xl text-orange-900 dark:text-orange-300">En proceso de asignación</div>
                  <p className="text-sm text-orange-800/70 dark:text-orange-200/70 max-w-[250px] mx-auto">
                    El equipo de Vorian está coordinando el transportista para tu envío.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Mapa Interactivo */}
        <div className="lg:col-span-2 h-[500px] lg:h-[650px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl relative">
          <ShipmentTrackingMap
            origin={originCoords}
            destination={destCoords}
            routeGeometry={finalRoute}
            driverLocation={driverLocation}
            status={shipment.status}
          />
        </div>

      </div>
    </div>
  );
}
