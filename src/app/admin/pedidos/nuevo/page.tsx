"use client";

import { useState, useEffect, useMemo } from "react";
import { useFirebase } from "@/firebase";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Map from "@/components/map";

const MAPBOX_TOKEN = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

export default function NuevoPedidoAdminPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();

  const [clientId, setClientId] = useState("");
  const [vehicleType, setVehicleType] = useState("Auto");
  const [origin, setOrigin] = useState<{ address: string; coords: [number, number] | null }>({ address: "", coords: null });
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destination, setDestination] = useState<{ address: string; coords: [number, number] | null }>({ address: "", coords: null });
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);

  const [totalPrice, setTotalPrice] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState("");
  const [route, setRoute] = useState<any>(null);
  
  const [globalSettings, setGlobalSettings] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    const fetchSettings = async () => {
        const settingsRef = doc(firestore, "settings", "global");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            setGlobalSettings(settingsSnap.data());
        } else {
            setError("No se encontraron los ajustes globales (precio combustible). Por favor, configúrelos en la sección de Tarifas.");
        }
    };
    fetchSettings();
  }, [firestore]);

  const handleAddressChange = async (value: string, type: 'origin' | 'destination') => {
    const setAddress = type === 'origin' ? setOrigin : setDestination;
    const setSuggestions = type === 'origin' ? setOriginSuggestions : setDestinationSuggestions;

    setAddress({ address: value, coords: null });
    setRoute(null);
    setDistanceKm('');
    setEstimatedTimeMinutes('');
    setTotalPrice('');

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

  const handleSelectSuggestion = (suggestion: any, type: 'origin' | 'destination') => {
    const setAddress = type === 'origin' ? setOrigin : setDestination;
    const setSuggestions = type === 'origin' ? setOriginSuggestions : setDestinationSuggestions;
    setAddress({ address: suggestion.place_name, coords: suggestion.center });
    setSuggestions([]);
  };

  useEffect(() => {
    const calculateRoute = async () => {
      if (origin.coords && destination.coords) {
        try {
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.coords.join(',')};${destination.coords.join(',')}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
          ).then(res => res.json());

          if (response.routes && response.routes[0]) {
            const { distance, duration, geometry } = response.routes[0];
            setDistanceKm((distance / 1000).toFixed(1));
            setEstimatedTimeMinutes(Math.round(duration / 60).toString());
            setRoute({ geometry });
          }
        } catch (error) {
          console.error("Error calculating route:", error);
          setRoute(null);
        }
      }
    };

    calculateRoute();
  }, [origin.coords, destination.coords]);

  useEffect(() => {
    const calculatePrice = async () => {
        if (!firestore || !distanceKm || !estimatedTimeMinutes || !vehicleType || !globalSettings) {
            setTotalPrice("");
            return;
        }
        setError(null);
        try {
            const rateRef = doc(firestore, "vehicleRates", vehicleType);
            const rateSnap = await getDoc(rateRef);

            if (rateSnap.exists()) {
                const rateData = rateSnap.data();
                const dKm = parseFloat(distanceKm);
                const eTime = parseInt(estimatedTimeMinutes, 10);
                const dieselPrice = globalSettings.dieselCostPerLiter || 0;

                const {
                    baseFare = 0,
                    costPerKm = 0,
                    costPerMinute = 0,
                    fuelEfficiency = 0,
                    overnightStay = 0,
                } = rateData;

                if (fuelEfficiency <= 0) {
                    setError(`El rendimiento (km/L) para "${vehicleType}" no está configurado o es cero. No se puede calcular el costo de combustible.`);
                    setTotalPrice("0");
                    return;
                }
                if (dieselPrice <= 0) {
                    setError(`El precio del combustible no está configurado en los Ajustes Globales.`);
                    setTotalPrice("0");
                    return;
                }

                const baseCost = baseFare;
                const fuelCost = (dKm / fuelEfficiency) * dieselPrice;
                const wearAndTearCost = dKm * costPerKm;
                const driverTimeCost = eTime * costPerMinute;
                const overnightCost = (eTime > 8 * 60) ? overnightStay : 0;
                const tollCost = 0; // TODO: Integrar una API de peajes

                const calculatedPrice = baseCost + fuelCost + wearAndTearCost + driverTimeCost + overnightCost + tollCost;

                setTotalPrice(Math.round(calculatedPrice).toString());

            } else {
                setTotalPrice("0");
                setError(`No se encontraron tarifas para "${vehicleType}". Por favor, configúrelas en la sección de Tarifas.`);
            }
        } catch (err) {
            console.error("Error calculating price:", err);
            setTotalPrice("");
            setError("No se pudo calcular el precio.");
        }
    };

    calculatePrice();
  }, [firestore, distanceKm, estimatedTimeMinutes, vehicleType, globalSettings]);


  const handleCreatePedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) {
      setError("Error: Firebase no está disponible.");
      return;
    }
    
    if (!clientId || !origin.address || !destination.address || !totalPrice || !distanceKm || !estimatedTimeMinutes || !vehicleType) {
        setError("Por favor, complete todos los campos, incluyendo la selección de direcciones válidas.");
        return;
    }
    if (!origin.coords || !destination.coords) {
        setError("Las direcciones de origen y destino deben ser válidas desde las sugerencias.");
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pedidosCollection = collection(firestore, "pedidos");
      const newPedidoRef = doc(pedidosCollection);

      const newPedidoData = {
        id: newPedidoRef.id,
        clientId,
        originAddress: origin.address,
        destinationAddress: destination.address,
        totalPrice: parseFloat(totalPrice),
        distanceKm: parseFloat(distanceKm),
        estimatedTimeMinutes: parseInt(estimatedTimeMinutes, 10),
        status: "pending",
        createdAt: new Date().toISOString(),
        originLatitude: origin.coords[1],
        originLongitude: origin.coords[0],
        destinationLatitude: destination.coords[1],
        destinationLongitude: destination.coords[0],
        vehicleType: vehicleType,
        driverId: null,
        assignedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        driverLatitude: null,
        driverLongitude: null,
      };

      await setDoc(newPedidoRef, newPedidoData);
      
      router.push("/admin/pedidos");

    } catch (err: any) {
      setError(err.message || "No se pudo crear el pedido. Verifique los permisos.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card border text-card-foreground">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Link href="/admin/pedidos">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <div>
                <CardTitle>Crear un Nuevo Pedido</CardTitle>
                <CardDescription className="mt-1">
                Use el mapa y el formulario para generar un nuevo pedido.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full rounded-lg overflow-hidden mb-6 border">
            <Map 
              origin={origin.coords}
              destination={destination.coords}
              route={route}
              drivers={null}
            />
          </div>

          <form onSubmit={handleCreatePedido} className="space-y-4 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientId">
                      ID de Usuario del Cliente
                    </Label>
                    <Input
                      id="clientId"
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Pegue aquí el UID del cliente"
                      required
                      className="mt-1 bg-background border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleType">Tipo de Vehículo</Label>
                    <Select onValueChange={setVehicleType} defaultValue={vehicleType}>
                        <SelectTrigger id="vehicleType" className="mt-1 bg-background border">
                            <SelectValue placeholder="Seleccionar un vehículo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Auto">Auto</SelectItem>
                            <SelectItem value="Motocicleta">Motocicleta</SelectItem>
                            <SelectItem value="Van">Van</SelectItem>
                            <SelectItem value="Furgon">Furgón</SelectItem>
                            <SelectItem value="Camion Ligero">Camión Ligero</SelectItem>
                            <SelectItem value="Camion Pesado">Camión Pesado</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Label htmlFor="originAddress">
                        Dirección de Origen
                      </Label>
                      <Input
                        id="originAddress"
                        type="text"
                        value={origin.address}
                        onChange={(e) => handleAddressChange(e.target.value, 'origin')}
                        placeholder="Ej: Av. Principal 123, Ciudad"
                        required
                        className="mt-1 bg-background border"
                        autoComplete="off"
                      />
                      {originSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                          {originSuggestions.map(s => <div key={s.id} onMouseDown={() => handleSelectSuggestion(s, 'origin')} className="p-2 cursor-pointer hover:bg-accent text-sm">{s.place_name}</div>)}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Label htmlFor="destinationAddress">
                        Dirección de Destino
                      </Label>
                      <Input
                        id="destinationAddress"
                        type="text"
                        value={destination.address}
                        onChange={(e) => handleAddressChange(e.target.value, 'destination')}
                        placeholder="Ej: Calle Secundaria 456, Otra Ciudad"
                        required
                        className="mt-1 bg-background border"
                        autoComplete="off"
                      />
                      {destinationSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                          {destinationSuggestions.map(s => <div key={s.id} onMouseDown={() => handleSelectSuggestion(s, 'destination')} className="p-2 cursor-pointer hover:bg-accent text-sm">{s.place_name}</div>)}
                        </div>
                      )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="distanceKm">
                            Distancia (km)
                        </Label>
                        <Input
                            id="distanceKm"
                            type="number"
                            value={distanceKm}
                            onChange={(e) => setDistanceKm(e.target.value)}
                            placeholder="Automático"
                            required
                            readOnly
                            className="mt-1 bg-muted/50 border"
                        />
                    </div>
                    <div>
                        <Label htmlFor="estimatedTimeMinutes">
                            Tiempo Estimado (min)
                        </Label>
                        <Input
                            id="estimatedTimeMinutes"
                            type="number"
                            value={estimatedTimeMinutes}
                            onChange={(e) => setEstimatedTimeMinutes(e.target.value)}
                            placeholder="Automático"
                            required
                            readOnly
                            className="mt-1 bg-muted/50 border"
                        />
                    </div>
                    <div>
                        <Label htmlFor="totalPrice">
                            Precio Total ($)
                        </Label>
                        <Input
                            id="totalPrice"
                            type="number"
                            value={totalPrice}
                            onChange={(e) => setTotalPrice(e.target.value)}
                            placeholder="Automático"
                            required
                            readOnly
                            className="mt-1 bg-muted/50 border"
                        />
                    </div>
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}
                
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        className="font-semibold px-6"
                        disabled={isLoading || !route || !totalPrice || totalPrice === "0"}
                    >
                        {isLoading ? "Creando..." : "Crear Pedido"}
                    </Button>
                </div>
          </form>
        </CardContent>
    </Card>
  );
}

    