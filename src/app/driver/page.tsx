"use client";

import { useState, useEffect, useRef } from "react";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Power, PowerOff, Check } from "lucide-react";

const AvailableJobs = () => {
  const { user } = useUser();
  const firestore = useFirestore();

  const pedidosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "pedidos"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
  }, [firestore]);

  const { data: availablePedidos, isLoading } = useCollection(pedidosQuery);

  const handleAcceptJob = (pedidoId: string) => {
    if (!firestore || !user) return;
    const pedidoRef = doc(firestore, "pedidos", pedidoId);
    updateDoc(pedidoRef, {
      status: "assigned",
      driverId: user.uid,
      assignedAt: new Date().toISOString(),
    });
  };

  return (
    <Card className="w-full max-w-4xl bg-card border mt-8">
      <CardHeader>
        <CardTitle>Pedidos Disponibles</CardTitle>
        <CardDescription>
          Estos son los trabajos actualmente disponibles para ser aceptados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Cargando pedidos...</p>}
        {!isLoading && (!availablePedidos || availablePedidos.length === 0) && (
          <p className="text-muted-foreground text-center py-8">
            No hay pedidos disponibles en este momento.
          </p>
        )}
        <div className="space-y-4">
          {!isLoading &&
            availablePedidos?.map((pedido: any) => (
              <div
                key={pedido.id}
                className="p-4 bg-muted rounded-lg flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-bold">
                    {pedido.originAddress} a {pedido.destinationAddress}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Distancia: {pedido.distanceKm} km | Precio: ${pedido.totalPrice}
                  </p>
                </div>
                <Button
                  onClick={() => handleAcceptJob(pedido.id)}
                  variant="default"
                >
                  <Check className="mr-2 h-4 w-4" /> Aceptar
                </Button>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function DriverPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationWatchId = useRef<number | null>(null);

  const driverProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "driverProfiles", user.uid);
  }, [firestore, user]);

  const { data: driverProfile, isLoading: isProfileLoading } =
    useDoc(driverProfileRef);

  const isAvailable = driverProfile ? (driverProfile as any).isAvailable : false;

  useEffect(() => {
    setIsTracking(isAvailable);
  }, [isAvailable]);

  useEffect(() => {
    if (isTracking) {
      if (!navigator.geolocation) {
        setLocationError("La geolocalización no es compatible con su navegador.");
        setIsTracking(false);
        return;
      }

      locationWatchId.current = navigator.geolocation.watchPosition(
        (position) => {
          if (driverProfileRef && user && firestore) {
            const { latitude, longitude } = position.coords;
            updateDoc(driverProfileRef, {
              currentLatitude: latitude,
              currentLongitude: longitude,
              lastLocationUpdate: new Date().toISOString(),
            });
            setLocationError(null);
            
            const activePedidoQuery = query(collection(firestore, 'pedidos'), where('driverId', '==', user.uid), where('status', 'in', ['assigned', 'in_progress']));
            getDocs(activePedidoQuery).then(snapshot => {
                snapshot.forEach(pedidoDoc => {
                    const pedidoRef = doc(firestore, 'pedidos', pedidoDoc.id);
                    updateDoc(pedidoRef, {
                        driverLatitude: latitude,
                        driverLongitude: longitude
                    });
                })
            });
          }
        },
        (error) => {
          setLocationError(`Error de ubicación: ${error.message}`);
          setIsTracking(false);
          if (driverProfileRef) {
            updateDoc(driverProfileRef, { isAvailable: false });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    }

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, [isTracking, driverProfileRef, user, firestore]);

  const handleToggleAvailability = () => {
    if (!driverProfileRef) return;
    const newAvailability = !isAvailable;
    updateDoc(driverProfileRef, {
      isAvailable: newAvailability,
    });
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Cargando panel de conductor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full p-4">
      <Card className="w-full max-w-md bg-card border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Panel del Conductor</span>
            <span
              className={`px-3 py-1 text-xs rounded-full ${
                isAvailable
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {isAvailable ? "Disponible" : "Desconectado"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-6 p-10">
          <p className="text-muted-foreground text-center">
            {isAvailable
              ? "Estás en línea y compartiendo tu ubicación."
              : "Conéctate para empezar a recibir solicitudes de trabajo."}
          </p>
          <Button
            onClick={handleToggleAvailability}
            size="lg"
            variant={isAvailable ? "destructive" : "default"}
            className="w-40 h-14 text-base font-bold transition-all"
          >
            {isAvailable ? (
              <PowerOff className="mr-2 h-5 w-5" />
            ) : (
              <Power className="mr-2 h-5 w-5" />
            )}
            {isAvailable ? "Desconectarse" : "Conectarse"}
          </Button>
          {locationError && (
            <p className="text-destructive text-sm mt-4">{locationError}</p>
          )}
          {(driverProfile as any)?.currentLatitude && isAvailable && (
            <div className="flex items-center text-muted-foreground text-sm pt-4">
              <MapPin className="h-4 w-4 mr-2" />
              <span>
                Lat: {(driverProfile as any).currentLatitude.toFixed(4)}, Long:{" "}
                {(driverProfile as any).currentLongitude.toFixed(4)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {isAvailable && <AvailableJobs />}
    </div>
  );
}
