"use client";

import { useSupabase, useUser } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardContent, 
    CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    MapPin, 
    Truck, 
    Calendar, 
    Weight, 
    CheckCircle, 
    Loader2, 
    Search, 
    Navigation, 
    Package, 
    ChevronRight,
    X,
    Maximize2,
    Map as MapIcon,
    List as ListIcon,
    Zap
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { getCustomerBadge } from "@/lib/badges";
import { BadgeIcon } from "@/components/badge-icon";

interface ShipmentLoad {
    id: string;
    clientId: string;
    customerId?: string;
    origin: string;
    destination: string;
    originCoords: { lat: number; lng: number };
    destinationCoords: { lat: number; lng: number };
    routeGeometry?: any;
    status: string;
    price: number;
    createdAt: any;
    equipment?: string;
    weight_lbs?: number;
}

const getThemeStylesForBadge = (badgeKey: string) => {
  switch (badgeKey) {
    case "BRONZE":
      return {
        cardBorder: "border-amber-500/30 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]",
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
        bgGradient: "bg-gradient-to-br from-card via-card to-amber-500/[0.03] dark:to-amber-500/[0.015]",
        textGlow: "text-amber-600 dark:text-amber-500 font-bold",
        label: "Socio Bronce",
        shineColor: "from-transparent via-amber-500/10 to-transparent",
      };
    case "SILVER":
      return {
        cardBorder: "border-slate-400/30 hover:border-slate-400/50 hover:shadow-[0_0_20px_rgba(148,163,184,0.12)]",
        badgeBg: "bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/20",
        bgGradient: "bg-gradient-to-br from-card via-card to-slate-400/[0.03] dark:to-slate-400/[0.015]",
        textGlow: "text-slate-500 dark:text-slate-400 font-bold",
        label: "Socio Plata",
        shineColor: "from-transparent via-slate-300/15 to-transparent",
      };
    case "GOLD":
      return {
        cardBorder: "border-yellow-500/40 hover:border-yellow-500/60 hover:shadow-[0_0_25px_rgba(234,179,8,0.22)]",
        badgeBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 animate-pulse",
        bgGradient: "bg-gradient-to-br from-card via-card to-yellow-500/[0.05] dark:to-yellow-500/[0.025]",
        textGlow: "text-yellow-600 dark:text-yellow-400 font-black tracking-wide",
        label: "Socio Oro",
        shineColor: "from-transparent via-yellow-400/20 to-transparent",
      };
    case "BLACK_DIAMOND":
      return {
        cardBorder: "border-indigo-500/40 hover:border-indigo-500/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.28)]",
        badgeBg: "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 font-bold",
        bgGradient: "bg-gradient-to-br from-card via-card to-indigo-950/[0.08] dark:to-indigo-950/[0.04]",
        textGlow: "text-indigo-500 dark:text-indigo-400 font-black tracking-wide",
        label: "Socio Diamante Negro",
        shineColor: "from-transparent via-indigo-400/25 to-transparent",
      };
    default:
      return {
        cardBorder: "border-border hover:border-primary/50",
        badgeBg: "hidden",
        bgGradient: "bg-card",
        textGlow: "text-muted-foreground",
        label: "",
        shineColor: "from-transparent via-white/5 to-transparent",
      };
  }
};

const SearchWidget = ({ loads, onSelectLoad, customerTripsMap }: { loads: ShipmentLoad[], onSelectLoad: (load: ShipmentLoad) => void, customerTripsMap: Record<string, number> }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
        >
            <div className="p-4 border-b bg-muted/50 flex items-center justify-between relative overflow-hidden">
                <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-12"
                />
                <div className="flex items-center gap-2 relative z-10">
                    <div className="relative">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <motion.div 
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -inset-1 bg-primary/20 rounded-full -z-10"
                        />
                    </div>
                    <span className="font-semibold text-sm">Buscando Cargas...</span>
                </div>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse relative z-10">
                    LIVE
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {loads.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Esperando nuevas publicaciones...</p>
                    </div>
                ) : (
                    loads.map((load) => {
                        const isNew = load.createdAt && (new Date().getTime() - new Date(load.createdAt).getTime()) < 300000; // 5 minutes
                        const trips = customerTripsMap[load.customerId || ''] || 0;
                        const customerBadge = getCustomerBadge(trips);
                        const theme = getThemeStylesForBadge(customerBadge.key);

                        return (
                             <motion.button
                                key={load.id}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onSelectLoad(load)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-all duration-300 group relative overflow-hidden",
                                    theme.cardBorder,
                                    theme.bgGradient
                                )}
                            >
                                {/* Shine Sweep Effect */}
                                <div className={cn(
                                    "absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out bg-gradient-to-r skew-x-12 pointer-events-none",
                                    theme.shineColor
                                )} />

                                {isNew && (
                                    <div className="absolute top-0 right-0">
                                        <div className="bg-primary text-primary-foreground text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">
                                            NUEVO
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-mono text-muted-foreground">#{load.id.substring(0, 8)}</span>
                                        {customerBadge.key !== "NONE" && (
                                            <span className={cn("text-[8px] font-extrabold uppercase mt-0.5 tracking-wider", theme.textGlow)}>
                                                {theme.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-primary">CLP {(load.price || 0).toLocaleString('es-CL')}</span>
                                        {customerBadge.key !== "NONE" && (
                                            <div className={cn("w-5 h-5 rounded-full overflow-hidden border text-white shrink-0 shadow-sm", customerBadge.className, customerBadge.glowClass)}>
                                                <BadgeIcon type={customerBadge.key} className="w-full h-full" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <span className="truncate text-muted-foreground">{(load.origin || '').split(',')[0]}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <span className="truncate text-muted-foreground">{(load.destination || '').split(',')[0]}</span>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2">
                                    <div className="flex items-center gap-1">
                                        <Truck className="h-3 w-3" />
                                        <span>{load.equipment || 'Estándar'}</span>
                                    </div>
                                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </motion.button>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
};

export default function CompanyShipmentsPage() {
    const { supabase } = useSupabase();
    const { user } = useUser();
    const { resolvedTheme } = useTheme();
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [selectedLoad, setSelectedLoad] = useState<ShipmentLoad | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const [rejectedLoads, setRejectedLoads] = useState<string[]>([]);
    
    useEffect(() => {
        const saved = localStorage.getItem('rejectedLoads');
        if (saved) {
            try {
                setRejectedLoads(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);

    const handleRejectLoad = () => {
        if (!selectedLoad) return;
        const newRejected = [...rejectedLoads, selectedLoad.id];
        setRejectedLoads(newRejected);
        localStorage.setItem('rejectedLoads', JSON.stringify(newRejected));
        setSelectedLoad(null);
    };
    
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});

    // Query for available loads (shipments) from Supabase
    const queryFn = useCallback((query: any) => query.eq("status", "PENDING"), []);
    const { data: shipmentsData, isLoading } = useSupabaseCollection<any>("shipments", queryFn);

    // Map de viajes completados por cliente
    const [customerTripsMap, setCustomerTripsMap] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!shipmentsData || shipmentsData.length === 0) return;
        
        const fetchCustomerTrips = async () => {
            const customerIds = Array.from(new Set(
                shipmentsData
                    .map((s: any) => s.customer_id || s.clientId)
                    .filter((id): id is string => !!id)
            ));
            
            if (customerIds.length === 0) return;

            const map: Record<string, number> = {};
            
            await Promise.all(
                customerIds.map(async (cid) => {
                    const { count, error } = await supabase
                        .from("shipments")
                        .select("id", { count: "exact", head: true })
                        .eq("customer_id", cid)
                        .eq("status", "COMPLETED");
                    
                    if (!error && count !== null) {
                        map[cid] = count;
                    } else {
                        map[cid] = 0;
                    }
                })
            );

            setCustomerTripsMap(map);
        };

        fetchCustomerTrips();
    }, [shipmentsData, supabase]);
    
    // Adapt shipments to the UI ShipmentLoad interface
    const availableLoads = useMemo(() => {
        if (!shipmentsData) return [];
        return shipmentsData.filter((s: any) => !rejectedLoads.includes(s.id)).map((s: any) => {
            // Parse coordinates from GeoJSON route
            let originCoords = { lat: 0, lng: 0 };
            let destinationCoords = { lat: 0, lng: 0 };
            const route = s.details?.route;
            if (route && route.coordinates && route.coordinates.length > 0) {
                const coords = route.coordinates;
                originCoords = { lng: coords[0][0], lat: coords[0][1] };
                destinationCoords = { lng: coords[coords.length - 1][0], lat: coords[coords.length - 1][1] };
            }
            return {
                id: s.id,
                clientId: s.clientId,
                customerId: s.customer_id || s.clientId,
                origin: s.originAddress,
                destination: s.destinationAddress,
                originCoords,
                destinationCoords,
                routeGeometry: route,
                status: s.status,
                price: s.estimatedPrice || 0,
                createdAt: s.createdAt,
                equipment: s.details?.equipment,
                weight_lbs: s.details?.weightLbs
            };
        });
    }, [shipmentsData, rejectedLoads]);

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        if (!mapboxgl.supported()) {
            if (mapContainer.current) {
                mapContainer.current.innerHTML = '<div class="flex items-center justify-center h-full bg-muted text-muted-foreground p-4 text-center">Tu navegador no soporta WebGL, el cual es necesario para mostrar el mapa.</div>';
            }
            return;
        }

        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: resolvedTheme === 'dark' ? 'mapbox://styles/vorianglobal/cmqivdlco006p01r34g0lhrmv' : 'mapbox://styles/vorianglobal/cmqiz50lq004601s65k48addr',
                center: [-70.6483, -33.4489], // Santiago, Chile
                zoom: 11,
                pitch: 0,
                maxPitch: 0,
                bearing: 0,
                dragRotate: false,
                pitchWithRotate: false,
                projection: { name: 'mercator' } as any,
            });

            map.current.on('style.load', () => {
                const mapInstance = map.current;
                if (!mapInstance) return;

                // Disable all forms of rotation and pitch
                mapInstance.dragRotate.disable();
                mapInstance.touchZoomRotate.disableRotation();
                mapInstance.keyboard.disable();

                // Remove atmosphere
                if (mapInstance.getStyle().layers) {
                    (mapInstance as any).setAtmosphere?.(null);
                }

                const layers = mapInstance.getStyle()?.layers || [];
                for (const layer of layers) {
                    if (
                        layer.id.includes('poi') || 
                        layer.id.includes('building') || 
                        layer.id.includes('park') ||
                        layer.id.includes('landuse') ||
                        layer.type === 'fill-extrusion'
                    ) {
                        mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
                    }
                }
                mapInstance.resize();
            });

            map.current.on('error', (e) => {
                // Silently handle mapbox errors
            });

            map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");
            
            const attribution = document.querySelector('.mapboxgl-ctrl-attrib-inner');
            if (attribution) {
                (attribution as HTMLElement).style.display = 'none';
            }
        } catch (error) {
            // Silently handle mapbox initialization errors
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []); // Empty dependency array for initialization only

    // Update map style when theme changes
    useEffect(() => {
        if (map.current) {
            map.current.setStyle(resolvedTheme === 'dark' ? 'mapbox://styles/vorianglobal/cmqivdlco006p01r34g0lhrmv' : 'mapbox://styles/vorianglobal/cmqiz50lq004601s65k48addr');
        }
    }, [resolvedTheme]);

    // Resize map when viewMode changes
    useEffect(() => {
        if (viewMode === 'map' && map.current) {
            setTimeout(() => {
                map.current?.resize();
            }, 100);
        }
    }, [viewMode]);

    // Update Markers
    useEffect(() => {
        if (!map.current) return;

        try {
            const currentIds = new Set(availableLoads.map(l => l.id));
            Object.keys(markers.current).forEach(id => {
                if (!currentIds.has(id)) {
                    markers.current[id].remove();
                    delete markers.current[id];
                }
            });

            availableLoads.forEach((load: any) => {
                let lng: number | undefined = load.originCoords?.lng;
                let lat: number | undefined = load.originCoords?.lat;

                if (lng === undefined || lat === undefined || (lng === 0 && lat === 0)) {
                    return;
                }

                if (!markers.current[load.id]) {
                    const el = document.createElement('div');
                    el.className = 'load-marker';
                    el.innerHTML = `
                        <div class="relative group cursor-pointer">
                            <div class="absolute -inset-2 bg-primary/20 rounded-full animate-ping"></div>
                            <div class="relative bg-primary text-primary-foreground p-2 rounded-full shadow-lg border-2 border-background transition-transform hover:scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            </div>
                            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-background border rounded px-2 py-1 text-[10px] font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                CLP {(load.price || 0).toLocaleString('es-CL')}
                            </div>
                        </div>
                    `;

                    el.onclick = () => setSelectedLoad(load);

                    markers.current[load.id] = new mapboxgl.Marker(el)
                        .setLngLat([lng, lat])
                        .addTo(map.current!);
                } else {
                    markers.current[load.id].setLngLat([lng, lat]);
                }
            });
        } catch (error) {
            // Silently handle mapbox marker errors
        }
    }, [availableLoads]);

    const handleSelectLoad = (load: any) => {
        setSelectedLoad(load);
    };

    // Draw route when load is selected
    useEffect(() => {
        if (!map.current) return;
        const mapInstance = map.current;

        if (!selectedLoad) {
            if (mapInstance.getSource('route')) {
                (mapInstance.getSource('route') as mapboxgl.GeoJSONSource).setData({
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: [] }
                });
            }
            return;
        }

        if (selectedLoad.routeGeometry) {
            const geojson = {
                type: 'Feature',
                properties: {},
                geometry: selectedLoad.routeGeometry
            };

            if (mapInstance.getSource('route')) {
                (mapInstance.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson as any);
            } else {
                mapInstance.addSource('route', {
                    type: 'geojson',
                    data: geojson as any
                });
                mapInstance.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#f97316', // orange-500
                        'line-width': 4,
                        'line-opacity': 0.8
                    }
                });
            }

            // Fit bounds
            const coordinates = selectedLoad.routeGeometry.coordinates;
            if (coordinates && coordinates.length > 0) {
                const bounds = new mapboxgl.LngLatBounds(
                    coordinates[0],
                    coordinates[0]
                );
                for (const coord of coordinates) {
                    bounds.extend(coord as [number, number]);
                }
                mapInstance.fitBounds(bounds, { padding: 50, duration: 1000 });
            }
        } else {
            let lng: number | undefined = selectedLoad.originCoords?.lng;
            let lat: number | undefined = selectedLoad.originCoords?.lat;
            if (lng !== undefined && lat !== undefined && lng !== 0 && lat !== 0) {
                mapInstance.flyTo({ center: [lng, lat], zoom: 14, essential: true });
            }
        }
    }, [selectedLoad]);

    const handleAcceptLoad = async () => {
        if (!supabase || !user || !selectedLoad) return;
        
        setIsAccepting(true);
        try {
            // Actualizamos la tabla consolidada 'shipments'
            const { error } = await supabase.from("shipments").update({
                status: "ACCEPTED",
                carrierId: user.id,
                updatedAt: new Date().toISOString()
            }).eq('id', selectedLoad.id);

            if (error) throw error;

            setSelectedLoad(null);
        } catch (error) {
            console.error("Error updating document:", error);
            alert("No se pudo aceptar la carga.");
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 relative overflow-hidden rounded-xl border bg-background shadow-inner">
            {/* Header Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button 
                    variant={viewMode === 'map' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                    className="shadow-lg"
                >
                    <MapIcon className="h-4 w-4 mr-2" />
                    Mapa
                </Button>
                <Button 
                    variant={viewMode === 'list' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="shadow-lg"
                >
                    <ListIcon className="h-4 w-4 mr-2" />
                    Lista
                </Button>
            </div>

            {/* Map View */}
            <div className={cn("flex-1 flex flex-row relative min-h-[400px] w-full bg-muted/50", viewMode !== 'map' && "hidden")}>
                
                {/* Left Sidebar */}
                <div className="w-80 md:w-96 h-full bg-background border-r flex flex-col z-10 shadow-lg">
                    <SearchWidget 
                        loads={availableLoads} 
                        onSelectLoad={handleSelectLoad} 
                        customerTripsMap={customerTripsMap}
                    />
                    
                    {/* Load Detail Overlay */}
                    <AnimatePresence>
                        {selectedLoad && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t bg-muted/10 overflow-hidden shrink-0"
                            >
                                <Card className="shadow-none border-none bg-transparent rounded-none">
                                    <CardHeader className="pb-2 relative px-4 pt-4">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute right-2 top-2 h-8 w-8"
                                            onClick={() => setSelectedLoad(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <div className="flex justify-between items-center pr-6">
                                            <div>
                                                <CardTitle className="text-base">Carga Seleccionada</CardTitle>
                                                <CardDescription className="text-xs">ID: {selectedLoad.id.substring(0, 8)}</CardDescription>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-primary">CLP {(selectedLoad.price || 0).toLocaleString('es-CL')}</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 px-4 pb-2">
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2">
                                                <div className="mt-1 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Origen</p>
                                                    <p className="text-xs line-clamp-2">{selectedLoad.origin}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Destino</p>
                                                    <p className="text-xs line-clamp-2">{selectedLoad.destination}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-background rounded-lg p-2 grid grid-cols-2 gap-2 content-center border">
                                            <div className="text-center">
                                                <Truck className="h-3 w-3 mx-auto mb-1 text-primary" />
                                                <p className="text-[10px] font-bold">{selectedLoad.equipment || 'N/A'}</p>
                                            </div>
                                            <div className="text-center">
                                                <Weight className="h-3 w-3 mx-auto mb-1 text-primary" />
                                                <p className="text-[10px] font-bold">{selectedLoad.weight_lbs?.toLocaleString() || 'N/A'} lbs</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="px-4 pb-4 flex gap-3">
                                        <Button 
                                            variant="outline"
                                            className="flex-1 h-10 text-sm font-bold text-destructive hover:bg-destructive/10"
                                            onClick={handleRejectLoad}
                                        >
                                            <X className="mr-2 h-4 w-4" />
                                            Rechazar
                                        </Button>
                                        <Button 
                                            className="flex-1 h-10 text-sm font-bold shadow-md shadow-primary/20"
                                            onClick={handleAcceptLoad}
                                            disabled={isAccepting}
                                        >
                                            {isAccepting ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Aceptar Carga
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                <div className="flex-1 relative p-4">
                    <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden shadow-md border" />
                </div>
            </div>

            {/* List View */}
            <div className={cn("flex-1 overflow-y-auto p-6", viewMode !== 'list' && "hidden")}>
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Cargas Disponibles</h2>
                        <p className="text-sm text-muted-foreground">{availableLoads.length} cargas encontradas</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableLoads.map((load) => {
                            const trips = customerTripsMap[load.customerId || ''] || 0;
                            const customerBadge = getCustomerBadge(trips);
                            const theme = getThemeStylesForBadge(customerBadge.key);

                            return (
                                <Card 
                                    key={load.id} 
                                    className={cn(
                                        "transition-all duration-300 border bg-card relative overflow-hidden group", 
                                        theme.cardBorder, 
                                        theme.bgGradient
                                    )}
                                >
                                    {/* Shine Sweep Effect */}
                                    <div className={cn(
                                        "absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out bg-gradient-to-r skew-x-12 pointer-events-none",
                                        theme.shineColor
                                    )} />

                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1.5">
                                                <CardTitle className="text-lg">#{load.id.substring(0, 8)}</CardTitle>
                                                {customerBadge.key !== "NONE" && (
                                                    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] border font-black uppercase tracking-wider shadow-sm", theme.badgeBg)}>
                                                        <div className={cn("w-3.5 h-3.5 rounded-full overflow-hidden text-white border shrink-0", customerBadge.className)}>
                                                            <BadgeIcon type={customerBadge.key} className="w-full h-full" />
                                                        </div>
                                                        {theme.label}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-primary">CLP {(load.price || 0).toLocaleString('es-CL')}</span>
                                                <div className="flex items-center justify-end text-[10px] text-orange-500 font-bold gap-1 mt-0.5">
                                                    <Zap className="h-3 w-3 fill-orange-500" /> Tarifa Dinámica
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                                                <span className="text-muted-foreground">{load.origin}</span>
                                            </div>
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                                                <span className="text-muted-foreground">{load.destination}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs pt-4 border-t">
                                            <div className="flex items-center gap-1">
                                                <Truck className="h-3 w-3" />
                                                <span>{load.equipment || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Weight className="h-3 w-3" />
                                                <span>{load.weight_lbs?.toLocaleString() || 'N/A'} lbs</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" onClick={() => handleSelectLoad(load)}>
                                            Ver en Mapa
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}

                        {availableLoads.length === 0 && !isLoading && (
                            <div className="col-span-full py-20 text-center">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground">No hay cargas disponibles en este momento.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .load-marker {
                    z-index: 1;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                }
            `}</style>
        </div>
    );
}
