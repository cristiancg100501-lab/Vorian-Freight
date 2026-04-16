"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, Zap, Clock3, CalendarDays, Loader2, Navigation, PenSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface Portico {
    id: string;
    name: string;
    reference_code: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
    tariffs_json: any;
}

export default function TollsMapPage() {
    const { supabase } = useSupabase();
    const { theme } = useTheme();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    
    const [porticos, setPorticos] = useState<Portico[]>([]);
    const [selectedPorticoId, setSelectedPorticoId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchPorticos = async () => {
        setIsLoading(true);
        // Get all porticos
        const { data, error } = await supabase
            .from("porticos")
            .select("*");
            
        if (!error && data) {
            setPorticos(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPorticos();
    }, []);

    // Initialize Map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c',
            center: [-70.6693, -33.4489], 
            zoom: 11,
        });

        // Add Navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        return () => {
            map.current?.remove();
            map.current = null;
        }
    }, []);

    // Handle Theme changes
    useEffect(() => {
        if (!map.current) return;
        const mapStyle = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c';
        map.current.setStyle(mapStyle, { diff: false } as any);
    }, [theme]);

    // Update Markers when porticos or selection changes
    useEffect(() => {
        if (!map.current || porticos.length === 0) return;
        
        const mapInstance = map.current;
        const activeIds = new Set(porticos.map(p => p.id));

        // Remove old markers
        markersRef.current.forEach((marker, id) => {
            if (!activeIds.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        const bounds = new mapboxgl.LngLatBounds();

        // Create or update markers
        porticos.forEach(portico => {
            if (!portico.latitude || !portico.longitude) return;
            
            
            bounds.extend([portico.longitude, portico.latitude]);
            
            const isSelected = selectedPorticoId === portico.id;
            const hasTariffs = portico.tariffs_json && typeof portico.tariffs_json === 'object' && Object.keys(portico.tariffs_json).length > 0;
            const markerColorClass = isSelected 
                ? "bg-purple-500 scale-150 z-50 ring-4 ring-purple-500/30" 
                : hasTariffs ? "bg-green-500 hover:scale-110" : "bg-red-500 hover:scale-110";

            let marker = markersRef.current.get(portico.id);

            if (marker) {
                // Update styling
                const el = marker.getElement();
                const body = el.querySelector('.portico-marker-body') as HTMLElement;
                if (body) {
                    body.className = `portico-marker-body relative w-6 h-6 rounded-full border-2 border-background shadow-lg flex items-center justify-center transition-all duration-300 ${markerColorClass}`;
                }
            } else {
                // Create new
                const el = document.createElement('div');
                el.className = 'w-8 h-8 flex items-center justify-center cursor-pointer';
                
                const body = document.createElement('div');
                body.className = `portico-marker-body relative w-6 h-6 rounded-full border-2 border-background shadow-lg flex items-center justify-center transition-all duration-300 ${markerColorClass}`;
                
                // Add a small icon inside
                const icon = document.createElement('div');
                icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
                body.appendChild(icon);
                
                el.appendChild(body);
                
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setSelectedPorticoId(portico.id);
                });

                const newMarker = new mapboxgl.Marker(el)
                    .setLngLat([portico.longitude, portico.latitude])
                    .addTo(mapInstance);
                    
                markersRef.current.set(portico.id, newMarker);
            }
        });

        // Fit bounds only if no marker is selected and we just loaded them
        if (!selectedPorticoId && !bounds.isEmpty()) {
            mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        }

    }, [porticos, selectedPorticoId]);

    // Fly to selected portico
    useEffect(() => {
        if (selectedPorticoId && map.current) {
            const portico = porticos.find(p => p.id === selectedPorticoId);
            if (portico && portico.longitude && portico.latitude) {
                map.current.flyTo({ 
                    center: [portico.longitude, portico.latitude], 
                    zoom: 15, 
                    duration: 1000 
                });
            }
        }
    }, [selectedPorticoId, porticos]);

    const selectedPortico = useMemo(() => {
        return porticos.find(p => p.id === selectedPorticoId) || null;
    }, [selectedPorticoId, porticos]);

    const renderTariffDetails = (data: any, title: string) => {
        if (!data) return null;
        return (
            <div className="space-y-3 mb-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-1">{title}</h4>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted p-2 rounded-md text-center">
                        <div className="text-[9px] uppercase font-bold text-muted-foreground">TBFP</div>
                        <div className="font-mono text-sm font-black">${data.price_tbfp || 0}</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md text-center">
                        <div className="text-[9px] uppercase font-bold text-yellow-600">TBP</div>
                        <div className="font-mono text-sm font-black text-yellow-600">${data.price_tbp || 0}</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md text-center">
                        <div className="text-[9px] uppercase font-bold text-red-500">TS</div>
                        <div className="font-mono text-sm font-black text-red-500">${data.price_ts || 0}</div>
                    </div>
                </div>
                {/* Ventanas Horarias */}
                <div className="space-y-1.5 mt-2">
                    {data.ts_laboral && (
                        <div className="flex items-start text-[10px] gap-2">
                            <Zap className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                            <div><span className="font-bold text-muted-foreground mr-1">TS LABORAL:</span> <span className="font-mono">{data.ts_laboral}</span></div>
                        </div>
                    )}
                    {data.ts_sabado && (
                        <div className="flex items-start text-[10px] gap-2">
                            <Zap className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                            <div><span className="font-bold text-muted-foreground mr-1">TS SÁBADO:</span> <span className="font-mono">{data.ts_sabado}</span></div>
                        </div>
                    )}
                    {data.ts_domingo && (
                        <div className="flex items-start text-[10px] gap-2">
                            <Zap className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                            <div><span className="font-bold text-muted-foreground mr-1">TS DOM:</span> <span className="font-mono">{data.ts_domingo}</span></div>
                        </div>
                    )}
                    {data.tbp_laboral && (
                        <div className="flex items-start text-[10px] gap-2">
                            <Clock3 className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                            <div><span className="font-bold text-muted-foreground mr-1">TBP LABORAL:</span> <span className="font-mono">{data.tbp_laboral}</span></div>
                        </div>
                    )}
                    {data.tbp_sabado && (
                        <div className="flex items-start text-[10px] gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <div><span className="font-bold text-muted-foreground mr-1">TBP SÁBADO:</span> <span className="font-mono">{data.tbp_sabado}</span></div>
                        </div>
                    )}
                    {data.tbp_domingo && (
                        <div className="flex items-start text-[10px] gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-blue-700 shrink-0 mt-0.5" />
                            <div><span className="font-bold text-muted-foreground mr-1">TBP DOM:</span> <span className="font-mono">{data.tbp_domingo}</span></div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-hidden -m-6 relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-500" />
                    <h1 className="text-xl font-black tracking-tight uppercase">Mapa de Pórticos (TAG)</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="px-3 py-1 font-bold">
                        {porticos.length} Pórticos en Mapa
                    </Badge>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Cargando Infraestructura...</span>
                    </div>
                </div>
            )}

            {/* Main Map */}
            <div className="flex-1 w-full bg-muted mt-16" ref={mapContainer} />

            {/* Detail Panel */}
            <AnimatePresence>
                {selectedPortico && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-20 right-6 w-80 lg:w-[400px] z-20 max-h-[calc(100vh-120px)] overflow-y-auto"
                    >
                        <Card className="shadow-2xl border-2 border-foreground/10 backdrop-blur-xl bg-background/95 pb-2">
                            <CardHeader className="pb-3 border-b bg-muted/20 sticky top-0 z-10">
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1 pr-6">
                                        <CardTitle className="text-lg font-black uppercase leading-tight">{selectedPortico.name}</CardTitle>
                                        <div className="text-sm text-muted-foreground font-mono flex items-center gap-2">
                                            <Badge variant="secondary" className="text-[10px]">{selectedPortico.reference_code}</Badge>
                                            {selectedPortico.is_active ? 
                                                <span className="text-green-500 font-bold uppercase text-[9px]">Activo</span> : 
                                                <span className="text-red-500 font-bold uppercase text-[9px]">Inactivo</span>
                                            }
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedPorticoId(null)}
                                        className="p-1.5 hover:bg-muted rounded-full transition-colors shrink-0 absolute right-4 top-4"
                                    >
                                        <Maximize2 className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 px-5">
                                <div className="flex items-center gap-2 mb-4 bg-primary/5 p-2 rounded-lg border border-primary/10">
                                    <Navigation className="h-4 w-4 text-primary shrink-0" />
                                    <div className="text-[10px] font-mono opacity-80 grid gap-0.5">
                                        <span>Lat: {selectedPortico.latitude}</span>
                                        <span>Lng: {selectedPortico.longitude}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {renderTariffDetails(selectedPortico.tariffs_json?.cat1, "Ligeros (CAT 1)")}
                                    {renderTariffDetails(selectedPortico.tariffs_json?.cat2, "Medianos (CAT 2)")}
                                    {renderTariffDetails(selectedPortico.tariffs_json?.cat3, "Pesados (CAT 3)")}
                                </div>
                                <Button className="w-full mt-4" onClick={() => router.push(`/admin/rates/tolls?id=${selectedPortico.id}`)}>
                                    <PenSquare className="w-4 h-4 mr-2" /> Editar Tarifas y Horarios
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Map Legend */}
            <div className="absolute bottom-6 left-6 z-20">
                <div className="bg-background/90 backdrop-blur-sm p-3 rounded-xl border shadow-lg space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500 border border-background shadow-sm" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Tarifa Configurada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500 border border-background shadow-sm" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Sin Configurar</span>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: hsl(var(--muted-foreground)/0.3);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}
