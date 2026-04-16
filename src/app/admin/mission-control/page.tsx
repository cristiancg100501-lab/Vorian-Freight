"use client";

import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Activity, 
  Truck, 
  User, 
  MapPin, 
  Navigation, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  Maximize2
} from "lucide-react";
import VorianMap from "@/components/map";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export default function MissionControlPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Fetch all driver profiles for real-time tracking
  const { data: rawDrivers, isLoading: isLoadingDrivers } = useSupabaseCollection("driverProfiles");

  // Fetch user profiles to get names
  const filterUsers = useCallback((q: any) => {
    return q.eq("role", "driver");
  }, []);
  const { data: users, isLoading: isLoadingUsers } = useSupabaseCollection("userProfiles", filterUsers);

  const drivers = useMemo(() => {
    // If we have no raw driver profiles, we have nothing to show
    if (!rawDrivers) return null;

    // We can show drivers even if user profiles are missing, we'll just have no names
    return rawDrivers.map(profile => {
      const u = users?.find(u => u.id === profile.id);
      
      // PARSE COORDINATES: Supabase numeric fields sometimes come as strings
      const lat = typeof profile.currentLatitude === 'string' ? parseFloat(profile.currentLatitude) : profile.currentLatitude;
      const lng = typeof profile.currentLongitude === 'string' ? parseFloat(profile.currentLongitude) : profile.currentLongitude;

      return {
        ...profile,
        id: profile.id,
        fullName: u ? `${u.firstName} ${u.lastName}` : `Conductor (${profile.id.substring(0,5)})`,
        vehiclePlate: profile.vehiclePlate || profile.licensePlate || "S/P",
        isAvailable: profile.isAvailable || false,
        currentLatitude: lat,
        currentLongitude: lng,
        lastLocationUpdate: profile.lastLocationUpdate || null,
        currentLocationName: profile.currentLocationName || null,
        currentOrderId: profile.currentOrderId || null,
        speed: profile.speed || profile.current_speed || 0,
        heading: profile.heading || 0
      };
    });
  }, [rawDrivers, users]);

  // Fetch active shipments
  const filterActiveShipments = useCallback((q: any) => {
    return q.in("status", ["In transit", "Booked"]);
  }, []);
  const { data: activeShipments } = useSupabaseCollection("shipments", filterActiveShipments);

  const activeDrivers = useMemo(() => {
    if (!drivers) return [];
    // Only show drivers that are currently available (online) and have coordinates
    // We use a loose check for coordinates to ensure (0,0) is handled if needed
    const filtered = drivers.filter((d: any) => 
      d.isAvailable === true && 
      d.currentLatitude !== null && 
      d.currentLongitude !== null &&
      !isNaN(d.currentLatitude) &&
      !isNaN(d.currentLongitude)
    );
    return filtered;
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    if (!drivers) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return drivers.filter((d: any) => 
      (d.fullName || "").toLowerCase().includes(lowerSearch) ||
      (d.vehiclePlate || "").toLowerCase().includes(lowerSearch)
    );
  }, [drivers, searchTerm]);

  const selectedDriver = useMemo(() => {
    if (!selectedDriverId || !drivers) return null;
    return drivers.find((d: any) => d.id === selectedDriverId);
  }, [selectedDriverId, drivers]);

  const stats = useMemo(() => {
    if (!drivers) return { totalActive: 0, inTransit: 0, available: 0, alerts: 0 };
    return {
      totalActive: drivers.filter((d: any) => d.isAvailable).length,
      inTransit: activeShipments?.length || 0,
      available: drivers.filter((d: any) => d.isAvailable && !d.currentOrderId).length,
      alerts: 0 
    };
  }, [drivers, activeShipments]);

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-hidden -m-6">
      {/* Header / Stats Bar */}
      <div className="bg-background/80 backdrop-blur-md border-b p-4 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight">Mission Control</h1>
          </div>
          <div className="hidden md:flex items-center gap-6 ml-8">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Vehículos Activos</span>
              <span className="text-lg font-mono font-bold">{stats.totalActive}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">En Tránsito</span>
              <span className="text-lg font-mono font-bold">{stats.inTransit}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Disponibles</span>
              <span className="text-lg font-mono font-bold">{stats.available}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64 hidden lg:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar conductor o placa..."
              className="pl-9 bg-muted/50 border-none h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 px-2 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-80 border-r bg-card flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Flota en Tiempo Real ({filteredDrivers.length})
              </span>
              <Filter className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(isLoadingDrivers || isLoadingUsers) ? (
              <div className="p-4 space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground italic">
                  {searchTerm ? "No se encontraron conductores para su búsqueda." : "No hay conductores registrados en el sistema."}
                </p>
              </div>
            ) : (
              filteredDrivers.map((driver: any) => (
                <motion.div
                  layout
                  key={driver.id}
                  onClick={() => setSelectedDriverId(driver.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedDriverId === driver.id 
                      ? "bg-foreground text-background border-foreground" 
                      : "hover:bg-muted border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedDriverId === driver.id ? "bg-background/20" : "bg-muted"
                    }`}>
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm truncate">{driver.fullName}</p>
                        <div className="flex items-center gap-1">
                          <div className={`h-2 w-2 rounded-full ${
                            !driver.isAvailable 
                              ? "bg-muted-foreground/30" 
                              : driver.currentOrderId 
                                ? "bg-orange-500" 
                                : "bg-green-500"
                          }`} />
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${
                            selectedDriverId === driver.id ? "border-background/30 text-background" : ""
                          }`}>
                            {driver.vehiclePlate}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Navigation className={`h-3 w-3 ${selectedDriverId === driver.id ? "text-background/60" : "text-muted-foreground"}`} />
                        <p className={`text-[10px] truncate ${selectedDriverId === driver.id ? "text-background/60" : "text-muted-foreground"}`}>
                          {driver.currentLocationName || "Ubicación desconocida"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Main Map View */}
        <div className="flex-1 relative bg-muted">
          <VorianMap 
            drivers={activeDrivers} 
            selectedDriver={selectedDriver}
            onDriverSelect={(id) => setSelectedDriverId(id)}
            route={null} 
            origin={null} 
            destination={null} 
          />
          
          {/* Floating Info Panel */}
          <AnimatePresence>
            {selectedDriver && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-6 left-6 right-6 lg:left-auto lg:w-[400px] z-20"
              >
                <Card className="shadow-2xl border-2 border-foreground/10 backdrop-blur-xl bg-background/95">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedDriver.fullName}</CardTitle>
                          <CardDescription className="font-mono text-xs">{selectedDriver.vehiclePlate} • {selectedDriver.vehicleType}</CardDescription>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDriverId(null)}
                        className="p-1 hover:bg-muted rounded-full transition-colors"
                      >
                        <Maximize2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Estado</span>
                        </div>
                        <Badge className={cn(
                          "border-none",
                          !selectedDriver.isAvailable 
                            ? "bg-muted text-muted-foreground" 
                            : selectedDriver.currentOrderId 
                              ? "bg-orange-500/20 text-orange-600" 
                              : "bg-green-500/20 text-green-600"
                        )}>
                          {!selectedDriver.isAvailable 
                            ? "Desconectado" 
                            : selectedDriver.currentOrderId 
                              ? "En Ruta" 
                              : "Disponible"}
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Última Act.</span>
                        </div>
                        <p className="text-sm font-mono font-bold">
                          {selectedDriver.lastLocationUpdate 
                            ? new Date(selectedDriver.lastLocationUpdate).toLocaleTimeString()
                            : "N/A"}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Velocidad</span>
                        </div>
                        <p className="text-sm font-mono font-bold">
                          {selectedDriver.speed 
                            ? `${selectedDriver.speed.toFixed(0)} km/h`
                            : "0 km/h"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Ubicación Actual</p>
                          <p className="text-xs font-medium leading-tight">{selectedDriver.currentLocationName || "No disponible"}</p>
                        </div>
                      </div>
                      {selectedDriver.currentOrderId && (
                        <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Orden Activa</p>
                            <p className="text-xs font-medium">#{selectedDriver.currentOrderId.substring(0, 12)}...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Legend / Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2">
            <div className="bg-background/90 backdrop-blur-sm p-3 rounded-lg border shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Conductor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground">En Ruta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Desconectado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
