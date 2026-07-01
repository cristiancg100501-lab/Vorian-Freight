"use client";

import { useEffect, useState, use } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, MapPin, Truck, CheckCircle, Clock } from "lucide-react";
import ShipmentTrackingMap from "@/components/shipment-tracking-map";
import { PriorityBoostModal } from "@/components/priority-boost-modal";
import confetti from "canvas-confetti";

export default function ShipmentTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const shipmentId = unwrappedParams.id;
  const { supabase } = useSupabase();
  const router = useRouter();

  const [shipment, setShipment] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar Envío
  useEffect(() => {
    const fetchShipment = async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          *,
          driver:userProfiles!shipments_driverId_fkey(
            id, fullName, phone, fcmToken
          )
        `)
        .eq("id", shipmentId)
        .single();

      if (error) {
        console.error("Error fetching shipment:", error);
      } else {
        setShipment(data);
      }
      setIsLoading(false);
    };

    fetchShipment();
  }, [shipmentId, supabase]);

  // Escuchar cambios en el estado del envío en tiempo real
  useEffect(() => {
    if (!shipmentId) return;
    const channel = supabase
      .channel(`shipment-${shipmentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shipments", filter: `id=eq.${shipmentId}` },
        (payload) => {
          setShipment((prev: any) => {
            // Disparar confeti si pasó de PENDING a ACCEPTED
            const wasPending = prev?.status === "Pending" || prev?.status === "PENDING";
            const isNowAccepted = payload.new.status !== "Pending" && payload.new.status !== "PENDING";
            
            if (wasPending && isNowAccepted) {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#3b82f6', '#f59e0b']
              });
            }
            
            return { ...prev, ...payload.new };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipmentId, supabase]);

  // Escuchar ubicación del conductor asignado en tiempo real
  useEffect(() => {
    if (!shipment || !shipment.driverId) return;

    // Obtener la última ubicación inicial
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
      .channel(`driver-location-${shipment.driverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driverProfiles", filter: `id=eq.${shipment.driverId}` },
        (payload) => {
          if (payload.new.currentLatitude && payload.new.currentLongitude) {
            setDriverLocation([payload.new.currentLongitude, payload.new.currentLatitude]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipment?.driverId, supabase]);

  if (isLoading) {
    return <div className="p-8 text-center">Cargando detalles del envío...</div>;
  }

  if (!shipment) {
    return <div className="p-8 text-center text-red-500">Envío no encontrado.</div>;
  }

  const isPending = shipment.status === "Pending" || shipment.status === "PENDING";
  
  // Parsear coordenadas para el mapa
  let originCoords: [number, number] | null = null;
  let destCoords: [number, number] | null = null;
  try {
    const parsed = typeof shipment.routeGeometry === 'string' ? JSON.parse(shipment.routeGeometry) : shipment.routeGeometry;
    if (parsed && parsed.coordinates && parsed.coordinates.length > 0) {
      originCoords = parsed.coordinates[0];
      destCoords = parsed.coordinates[parsed.coordinates.length - 1];
    }
  } catch (e) {
    // Fallback: Si no hay geometry, intentar extraer de detalles
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/customer">
            <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Envíos
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Envío #{shipment.id.substring(0, 8)}
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              {shipment.status}
            </span>
          </h1>
        </div>
        {isPending && (
          <PriorityBoostModal 
            shipmentId={shipment.id}
            basePrice={Number(shipment.estimatedPrice || 0)}
            currentBoost={Number(shipment.priorityBoost || 0)}
            onBoostApplied={() => { /* actualiza via realtime */ }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Info lateral */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles de la Carga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">Origen</div>
                  <div className="text-sm text-muted-foreground">{shipment.originAddress}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">Destino</div>
                  <div className="text-sm text-muted-foreground">{shipment.destinationAddress}</div>
                </div>
              </div>
              <div className="border-t pt-4 mt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Vehículo solicitado:</span>
                  <span className="font-medium">{shipment.details?.vehicleType || 'Camión'}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Precio Acordado:</span>
                  <span className="font-medium font-mono text-base">CLP {Number(shipment.estimatedPrice).toLocaleString('es-CL')}</span>
                </div>
                {Number(shipment.priorityBoost) > 0 && (
                   <div className="flex justify-between text-sm mb-2 text-orange-600 font-bold">
                     <span>🔥 Bono Incluido:</span>
                     <span>+CLP {Number(shipment.priorityBoost).toLocaleString('es-CL')}</span>
                   </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del Conductor (Si ya fue asignado) */}
          {!isPending && shipment.driver && (
            <Card className="border-green-200 shadow-sm shadow-green-100">
              <CardHeader className="bg-green-50/50 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  Transportista Asignado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{shipment.driver.fullName}</div>
                    <div className="text-sm text-muted-foreground">{shipment.driver.phone || 'Teléfono oculto'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isPending && (
             <Card className="border-orange-200">
             <CardContent className="pt-6">
               <div className="flex flex-col items-center text-center space-y-3">
                 <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
                   <Clock className="h-6 w-6 text-orange-600" />
                 </div>
                 <div className="font-bold">Buscando conductor...</div>
                 <p className="text-sm text-muted-foreground">
                   Hemos emitido tu solicitud a la red Vorian. Te notificaremos apenas un transportista acepte el viaje.
                 </p>
               </div>
             </CardContent>
           </Card>
          )}
        </div>

        {/* Mapa Interactivo */}
        <div className="lg:col-span-2 h-[500px] lg:h-[700px] rounded-xl overflow-hidden border shadow-sm relative">
           <ShipmentTrackingMap 
             origin={originCoords}
             destination={destCoords}
             routeGeometry={shipment.routeGeometry}
             driverLocation={driverLocation}
             status={shipment.status}
           />
        </div>

      </div>
    </div>
  );
}
