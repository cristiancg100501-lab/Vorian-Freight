"use client";

import { useEffect, useState, useMemo, use, useRef, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Truck, CheckCircle, Clock, Package, FileText, Lock, KeyRound, Bell, X } from "lucide-react";
import ShipmentTrackingMap from "@/components/shipment-tracking-map";

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
        const driverId = data.driverId || data.driver_id;
        if (driverId) {
          const { data: driverData } = await supabase
            .from("userProfiles")
            .select("id, name")
            .eq("id", driverId)
            .single();
          data.driver = driverData || null;
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
    if (!shipment?.driverId) return;
    const fetchInitialLocation = async () => {
      const { data } = await supabase
        .from('driverProfiles')
        .select('currentLatitude, currentLongitude')
        .eq('id', shipment.driverId)
        .single();
      if (data?.currentLatitude && data?.currentLongitude) {
        setDriverLocation([data.currentLongitude, data.currentLatitude]);
      }
    };
    fetchInitialLocation();

    const channel = supabase
      .channel(`client-driver-${shipment.driverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driverProfiles", filter: `id=eq.${shipment.driverId}` },
        (payload) => {
          if (payload.new.currentLatitude && payload.new.currentLongitude) {
            const dLon = payload.new.currentLongitude;
            const dLat = payload.new.currentLatitude;
            setDriverLocation([dLon, dLat]);

            // --- Geofence checks ---
            const status = shipment?.status;
            const pickupStates = ['ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'];
            const transitStates = ['IN_TRANSIT'];

            if (pickupStates.includes(status) && shipment?.pickup_longitude && shipment?.pickup_latitude) {
              const dist = haversineMeters(dLon, dLat, shipment.pickup_longitude, shipment.pickup_latitude);
              if (dist <= GEOFENCE_RADIUS_M && !geofenceTriggered.current.has('pickup')) {
                geofenceTriggered.current.add('pickup');
                setGeofenceAlert({ type: 'pickup', address: shipment.originAddress || 'Punto de recogida' });

                // Disparar correo electrónico y notificación in-app de llegada a origen
                fetch('/api/notifications/notify-status-change', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    shipmentId,
                    newStatus: 'ARRIVED_AT_PICKUP',
                    previousStatus: status,
                  })
                }).catch(err => console.error("Error sending arrival notification email:", err));
              }
            }

            if (transitStates.includes(status) && shipment?.delivery_longitude && shipment?.delivery_latitude) {
              const dist = haversineMeters(dLon, dLat, shipment.delivery_longitude, shipment.delivery_latitude);
              if (dist <= GEOFENCE_RADIUS_M && !geofenceTriggered.current.has('delivery')) {
                geofenceTriggered.current.add('delivery');
                setGeofenceAlert({ type: 'delivery', address: shipment.destinationAddress || 'Punto de entrega' });

                // Disparar correo electrónico y notificación in-app de llegada a destino
                fetch('/api/notifications/notify-status-change', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    shipmentId,
                    newStatus: 'ARRIVED_AT_DROPOFF',
                    previousStatus: status,
                  })
                }).catch(err => console.error("Error sending arrival notification email:", err));
              }
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shipment?.driverId, supabase]);

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
          className="relative flex items-start gap-4 p-4 rounded-xl border-2 animate-pulse"
          style={{
            background: geofenceAlert.type === 'pickup'
              ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
              : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            borderColor: geofenceAlert.type === 'pickup' ? '#f59e0b' : '#10b981',
          }}
        >
          <div
            className="flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center"
            style={{ background: geofenceAlert.type === 'pickup' ? '#fbbf24' : '#10b981' }}
          >
            {geofenceAlert.type === 'pickup'
              ? <Truck className="h-6 w-6 text-white" />
              : <CheckCircle className="h-6 w-6 text-white" />}
          </div>
          <div className="flex-1">
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
            className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" style={{ color: geofenceAlert.type === 'pickup' ? '#92400e' : '#065f46' }} />
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
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-7 w-7" />
            Envío {shipment.id}
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusStyles[shipment.status] || 'bg-muted text-muted-foreground'}`}>
              {statusLabels[shipment.status] || shipment.status}
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Panel lateral de información */}
        <div className="space-y-4 lg:col-span-1">
          {/* Ruta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalles del Envío</CardTitle>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
              <Card className="border-primary/30 shadow-md shadow-primary/5">
                <CardHeader className="pb-3 bg-primary/5 rounded-t-lg">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <KeyRound className="h-4 w-4" />
                    {isPickupPin ? 'PIN de Recogida' : 'PIN de Entrega'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    {isPickupPin
                      ? 'Comparta este código con el transportista al momento del retiro de la carga.'
                      : 'Comparta este código con el transportista para confirmar la entrega.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary/10 border border-primary/20">
                    <Lock className="h-5 w-5 text-primary" />
                    <span className="font-mono text-3xl font-black tracking-[0.25em] text-primary">{code}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Transportista */}
          {shipment.driver ? (
            <Card className="border-green-200">
              <CardHeader className="bg-green-50/50 pb-3 rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  Transportista Asignado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <div className="font-semibold">{shipment.driver.name || 'Transportista Vorian'}</div>
                    <div className="text-xs text-muted-foreground">Conductor asignado</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isPending ? (
            <Card className="border-orange-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="font-bold">En proceso de asignación</div>
                  <p className="text-sm text-muted-foreground">
                    El equipo de Vorian está coordinando el transportista para tu envío.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Mapa Interactivo */}
        <div className="lg:col-span-2 h-[500px] lg:h-[650px] rounded-xl overflow-hidden border shadow-sm relative">
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
