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
import { Button } from "@/components/ui/button";
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
import dynamic from 'next/dynamic';
const VorianMap = dynamic(() => import('@/components/map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-muted rounded-xl animate-pulse"><span className="text-muted-foreground font-medium">Cargando mapa interactivo...</span></div>
});
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
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-hidden -m-6 relative">
      {/* Main Map View - Now FULL WIDTH */}
      <div className="absolute inset-0 z-0">
        <VorianMap 
          drivers={activeDrivers} 
          selectedDriver={selectedDriver}
          onDriverSelect={setSelectedDriverId}
          route={null} 
          origin={null} 
          destination={null} 
        />
      </div>

      {/* Floating Header / Stats Overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-card/80 backdrop-blur-xl border shadow-2xl p-2 px-6 rounded-full">
        <div className="flex items-center gap-2 pr-4 border-r">
          <Activity className="h-4 w-4 text-primary animate-pulse" />
          <h1 className="text-sm font-black uppercase tracking-widest">Mission Control</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Activos</span>
            <span className="text-sm font-mono font-black text-primary">{stats.totalActive}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">En Ruta</span>
            <span className="text-sm font-mono font-black text-orange-500">{stats.inTransit}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Libres</span>
            <span className="text-sm font-mono font-black text-green-500">{stats.available}</span>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 px-2 py-0.5 ml-2 text-[10px] font-bold">
          <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </Badge>
      </div>

      {/* Floating Driver List Widget */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute top-6 left-6 bottom-6 w-80 z-20 flex flex-col pointer-events-none"
      >
        <div className="bg-card/80 backdrop-blur-xl border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-full pointer-events-auto">
          <div className="p-4 border-b bg-muted/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Flota en Tiempo Real
              </span>
              <Filter className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre o placa..."
                className="pl-9 bg-background/50 border-none h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(isLoadingDrivers || isLoadingUsers) ? (
              <div className="p-2 space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-14 bg-muted/50 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[10px] text-muted-foreground italic font-medium">
                  Sin resultados para "{searchTerm}"
                </p>
              </div>
            ) : (
              filteredDrivers.map((driver: any) => (
                <motion.div
                  key={driver.id}
                  onClick={() => setSelectedDriverId(driver.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border group ${
                    selectedDriverId === driver.id 
                      ? "bg-foreground text-background border-foreground shadow-lg" 
                      : "hover:bg-muted/50 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      selectedDriverId === driver.id ? "bg-background/20" : "bg-background"
                    }`}>
                      <User className={`h-4 w-4 ${selectedDriverId === driver.id ? "text-background" : "text-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs truncate uppercase tracking-tight">{driver.fullName}</p>
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          !driver.isAvailable 
                            ? "bg-muted-foreground/30" 
                            : driver.currentOrderId 
                              ? "bg-orange-500" 
                              : "bg-green-500"
                        }`} />
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-[9px] font-mono font-bold ${selectedDriverId === driver.id ? "text-background/60" : "text-muted-foreground"}`}>
                          {driver.vehiclePlate}
                        </p>
                        {driver.speed > 0 && (
                          <span className={`text-[9px] font-black ${selectedDriverId === driver.id ? "text-background/80" : "text-primary"}`}>
                            {driver.speed.toFixed(0)} KM/H
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Floating Detail Panel (Bottom Right) */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="absolute bottom-6 right-6 w-96 z-20"
          >
            <Card className="shadow-2xl border backdrop-blur-xl bg-card/80 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight">{selectedDriver.fullName}</CardTitle>
                      <CardDescription className="font-mono text-[10px] font-bold opacity-70">
                        {selectedDriver.vehiclePlate} • {selectedDriver.vehicleType || 'GENERAL'}
                      </CardDescription>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDriverId(null)}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Estado', value: selectedDriver.currentOrderId ? 'En Ruta' : 'Libre', color: selectedDriver.currentOrderId ? 'text-orange-500' : 'text-green-500' },
                    { label: 'Velocidad', value: `${selectedDriver.speed?.toFixed(0) || 0} km/h` },
                    { label: 'Señal', value: 'Excelente', color: 'text-green-500' },
                  ].map((item, i) => (
                    <div key={i} className="p-2 bg-muted/20 rounded-xl border">
                      <p className="text-[8px] uppercase font-black text-muted-foreground mb-1">{item.label}</p>
                      <p className={cn("text-[11px] font-bold", item.color)}>{String(item.value)}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-muted/20 p-3 rounded-xl border">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[8px] uppercase font-black text-muted-foreground mb-0.5">Ubicación Actual</p>
                      <p className="text-[10px] font-bold leading-tight">
                        {selectedDriver.currentLocationName || `${selectedDriver.currentLatitude?.toFixed(6)}, ${selectedDriver.currentLongitude?.toFixed(6)}`}
                      </p>
                    </div>
                  </div>
                  
                  {selectedDriver.currentOrderId && (
                    <div className="flex items-start gap-2 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[8px] uppercase font-black text-orange-600 mb-0.5">Orden en Curso</p>
                        <p className="text-[10px] font-bold text-orange-700">#{selectedDriver.currentOrderId.substring(0, 12).toUpperCase()}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button className="w-full h-9 text-xs font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground">
                  Ver Detalles Completos
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating System Events (Top Right) */}
      <motion.div 
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute top-6 right-6 w-72 z-20"
      >
        <div className="bg-card/80 backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Eventos del Sistema</span>
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="p-3 space-y-3">
            {[
              { time: '12:45', msg: 'Conductor 8A263 entró en zona de carga', type: 'info' },
              { time: '12:42', msg: 'Alerta: Vehículo 4B92 retrasado en Ruta 78', type: 'warn' },
            ].map((ev, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[9px] font-mono opacity-40 mt-0.5">{ev.time}</span>
                <p className={cn(
                  "text-[10px] font-medium leading-snug",
                  ev.type === 'warn' ? 'text-orange-500' : 'text-foreground/70'
                )}>{ev.msg}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating Legend (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-4 bg-card/80 backdrop-blur-xl border p-2 px-4 rounded-full shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">En Servicio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">En Ruta</span>
        </div>
      </div>
    </div>
  );
}
