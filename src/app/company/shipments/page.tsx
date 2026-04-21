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
    List as ListIcon
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";



interface ShipmentLoad {
    id: string;
    clientId: string;
    origin: string;
    destination: string;
    originCoords: { lat: number; lng: number };
    destinationCoords: { lat: number; lng: number };
    status: string;
    price: number;
    createdAt: any;
    equipment?: string;
    weight_lbs?: number;
}

const SearchWidget = ({ loads, onSelectLoad }: { loads: ShipmentLoad[], onSelectLoad: (load: ShipmentLoad) => void }) => {
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
                        return (
                            <motion.button
                                key={load.id}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onSelectLoad(load)}
                                className="w-full text-left p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors group relative overflow-hidden"
                            >
                                {isNew && (
                                    <div className="absolute top-0 right-0">
                                        <div className="bg-primary text-primary-foreground text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">
                                            NUEVO
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-mono text-muted-foreground">#{load.id.substring(0, 8)}</span>
                                    <span className="text-sm font-bold text-primary">${load.price.toLocaleString('es-CL')}</span>
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
    
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});

    // Query for available loads (shipments) from Supabase
    const queryFn = useCallback((query: any) => query.eq("status", "Pending"), []);
    const { data: shipmentsData, isLoading } = useSupabaseCollection<any>("shipments", queryFn);
    
    // Adapt shipments to the UI ShipmentLoad interface
    const availableLoads = useMemo(() => {
        if (!shipmentsData) return [];
        return shipmentsData.map((s: any) => ({
            id: s.id,
            clientId: s.clientId,
            origin: s.originAddress,
            destination: s.destinationAddress,
            // Las coordenadas vendrán en el JSONB details si las guardamos ahí,
            // o se pueden extraer del campo origin (geography)
            originCoords: s.details?.originCoords || { lat: 0, lng: 0 },
            destinationCoords: s.details?.destinationCoords || { lat: 0, lng: 0 },
            status: s.status,
            price: s.estimatedPrice || 0,
            createdAt: s.createdAt,
            equipment: s.details?.equipment,
            weight_lbs: s.details?.weightLbs
        }));
    }, [shipmentsData]);

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
                style: resolvedTheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c',
                center: [-70.6483, -33.4489], // Santiago, Chile
                zoom: 11,
                pitch: 45,
            });

            map.current.on('style.load', () => {
                const layers = map.current?.getStyle()?.layers || [];
                for (const layer of layers) {
                    if (
                        layer.id.includes('poi') || 
                        layer.id.includes('building') || 
                        layer.id.includes('park') ||
                        layer.id.includes('landuse')
                    ) {
                        map.current?.setLayoutProperty(layer.id, 'visibility', 'none');
                    }
                }
                map.current?.resize();
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
            map.current.setStyle(resolvedTheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c');
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
                                $${(load.price || 0).toLocaleString('es-CL')}
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
        
        let lng: number | undefined = load.originCoords?.lng;
        let lat: number | undefined = load.originCoords?.lat;

        if (map.current && lng !== undefined && lat !== undefined) {
            map.current.flyTo({
                center: [lng, lat],
                zoom: 14,
                essential: true
            });
        }
    };

    const handleAcceptLoad = async () => {
        if (!supabase || !user || !selectedLoad) return;
        
        setIsAccepting(true);
        try {
            // Actualizamos la tabla consolidada 'shipments'
            const { error } = await supabase.from("shipments").update({
                status: "Booked",
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
                                                <p className="text-lg font-bold text-primary">${selectedLoad.price.toLocaleString('es-CL')}</p>
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
                                    <CardFooter className="px-4 pb-4">
                                        <Button 
                                            className="w-full h-10 text-sm font-bold shadow-md shadow-primary/20"
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
                        {availableLoads.map((load) => (
                            <Card key={load.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">#{load.id.substring(0, 8)}</CardTitle>
                                        <span className="text-lg font-bold text-primary">${load.price.toLocaleString('es-CL')}</span>
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
                        ))}

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
