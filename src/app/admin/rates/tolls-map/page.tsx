"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, Zap, Clock3, CalendarDays, Loader2, Navigation, PenSquare, Save, Plus, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

interface Portico {
    id: string;
    name: string;
    reference_code: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
    tariffs_json: any;
    concession_name?: string;
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
    const [isDraggingPortico, setIsDraggingPortico] = useState(false);
    const [draggedCoords, setDraggedCoords] = useState<{lat: number, lng: number} | null>(null);
    const [isSavingPosition, setIsSavingPosition] = useState(false);
    
    // Create Portico State
    const [isAddingPortico, setIsAddingPortico] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newPorticoData, setNewPorticoData] = useState({ name: "", reference_code: "", latitude: 0, longitude: 0, concession_name: "" });
    const [isCreating, setIsCreating] = useState(false);
    
    const router = useRouter();

    const fetchPorticos = async () => {
        setIsLoading(true);
        // Get all porticos
        const { data, error } = await supabase
            .from("porticos")
            .select("*, concession_name");
            
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
        });

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
            const isAVO = portico.concession_name === 'AVO';
            const isRuta78 = portico.concession_name === 'Ruta 78';
            const hasTariffs = portico.tariffs_json && typeof portico.tariffs_json === 'object' && Object.keys(portico.tariffs_json).length > 0;
            
            const markerColorClass = isSelected 
                ? "bg-purple-500 scale-150 z-50 ring-4 ring-purple-500/30" 
                : isAVO ? "bg-yellow-500 hover:scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                : isRuta78 ? "bg-blue-500 hover:scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
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

                const newMarker = new mapboxgl.Marker({ element: el })
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
    
    // Handle Toggle Draggable for Selected Portico
    useEffect(() => {
        if (!map.current || !selectedPorticoId) return;
        
        const marker = markersRef.current.get(selectedPorticoId);
        if (!marker) return;

        if (isDraggingPortico) {
            marker.setDraggable(true);
            
            // Listen for drag events
            const onDrag = () => {
                const lngLat = marker.getLngLat();
                setDraggedCoords({ lat: lngLat.lat, lng: lngLat.lng });
            };
            
            marker.on('drag', onDrag);
            return () => {
                marker.setDraggable(false);
                marker.off('drag', onDrag);
            };
        } else {
            marker.setDraggable(false);
        }
    }, [isDraggingPortico, selectedPorticoId]);

    // Handle Map Click for New Portico
    useEffect(() => {
        if (!map.current || !isAddingPortico) return;

        const mapInstance = map.current;
        mapInstance.getCanvas().style.cursor = 'crosshair';

        const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
            const { lng, lat } = e.lngLat;
            setNewPorticoData({
                name: "",
                reference_code: "",
                latitude: lat,
                longitude: lng,
                concession_name: ""
            });
            setIsAddingPortico(false);
            setShowCreateDialog(true);
        };

        mapInstance.on('click', handleMapClick);

        return () => {
            mapInstance.off('click', handleMapClick);
            mapInstance.getCanvas().style.cursor = '';
        };
    }, [isAddingPortico]);

    const handleCreatePortico = async () => {
        if (!newPorticoData.name || !newPorticoData.reference_code) {
            alert("Nombre y Código son obligatorios");
            return;
        }

        if (isNaN(newPorticoData.latitude) || isNaN(newPorticoData.longitude)) {
            alert("Las coordenadas deben ser números válidos");
            return;
        }

        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('porticos')
                .insert({
                    name: newPorticoData.name,
                    reference_code: newPorticoData.reference_code,
                    latitude: Number(newPorticoData.latitude),
                    longitude: Number(newPorticoData.longitude),
                    concession_name: newPorticoData.concession_name || null,
                    is_active: true,
                    tariffs_json: { cat1: {}, cat2: {}, cat3: {} },
                    location: `SRID=4326;POINT(${newPorticoData.longitude} ${newPorticoData.latitude})`
                })
                .select()
                .single();

            if (error) throw error;

            // Refresh and select
            await fetchPorticos();
            setShowCreateDialog(false);
            if (data) setSelectedPorticoId(data.id);
            
        } catch (err) {
            console.error("Error creating portico:", err);
            alert("Error al crear el pórtico");
        } finally {
            setIsCreating(false);
        }
    };

    const handleAddClick = () => {
        const center = map.current?.getCenter() || { lng: -70.6693, lat: -33.4489 };
        setNewPorticoData({
            name: "",
            reference_code: "",
            latitude: center.lat,
            longitude: center.lng,
            concession_name: ""
        });
        setShowCreateDialog(true);
    };

    const handlePickFromMap = () => {
        setShowCreateDialog(false);
        setIsAddingPortico(true);
    };

    const handleStartDragging = () => {
        if (!selectedPortico) return;
        setDraggedCoords({ lat: selectedPortico.latitude, lng: selectedPortico.longitude });
        setIsDraggingPortico(true);
    };

    const handleCancelDragging = () => {
        if (!selectedPorticoId) return;
        const marker = markersRef.current.get(selectedPorticoId);
        if (marker && selectedPortico) {
            marker.setLngLat([selectedPortico.longitude, selectedPortico.latitude]);
        }
        setIsDraggingPortico(false);
        setDraggedCoords(null);
    };

    const handleSavePosition = async () => {
        if (!selectedPorticoId || !draggedCoords) return;
        
        setIsSavingPosition(true);
        try {
            const { error } = await supabase
                .from('porticos')
                .update({
                    latitude: draggedCoords.lat,
                    longitude: draggedCoords.lng,
                    location: `SRID=4326;POINT(${draggedCoords.lng} ${draggedCoords.lat})`
                })
                .eq('id', selectedPorticoId);

            if (error) throw error;
            
            // Success
            await fetchPorticos();
            setIsDraggingPortico(false);
            setDraggedCoords(null);
        } catch (err) {
            console.error("Error saving position:", err);
            alert("Error al guardar la nueva ubicación");
        } finally {
            setIsSavingPosition(false);
        }
    };

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
            {/* Instrucciones Modo Añadir */}
            <AnimatePresence>
                {isAddingPortico && (
                    <motion.div 
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md">
                            <MapPin className="h-5 w-5 animate-bounce" />
                            <span className="text-sm font-black uppercase tracking-widest">Haz clic en el mapa para situar el nuevo pórtico</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsAddingPortico(false)}
                                className="h-6 w-6 rounded-full hover:bg-white/20 pointer-events-auto ml-2"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Buttons */}
            <div className="absolute top-24 right-6 z-20 flex flex-col gap-2">
                <Button 
                    onClick={handleAddClick}
                    className="h-12 w-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-all duration-300"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>

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
                                            {selectedPortico.concession_name === 'AVO' && (
                                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 text-[9px] font-bold uppercase">AVO</Badge>
                                            )}
                                            {selectedPortico.concession_name === 'Ruta 78' && (
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-[9px] font-bold uppercase">Ruta 78</Badge>
                                            )}
                                            {selectedPortico.is_active ? 
                                                <span className="text-green-500 font-bold uppercase text-[9px]">Activo</span> : 
                                                <span className="text-red-500 font-bold uppercase text-[9px]">Inactivo</span>
                                            }
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (isDraggingPortico) handleCancelDragging();
                                            setSelectedPorticoId(null);
                                        }}
                                        className="p-1.5 hover:bg-muted rounded-full transition-colors shrink-0 absolute right-4 top-4"
                                    >
                                        <Maximize2 className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 px-5">
                                <div className={`flex items-center gap-2 mb-4 p-2 rounded-lg border transition-all ${isDraggingPortico ? 'bg-yellow-500/10 border-yellow-500/50 animate-pulse' : 'bg-primary/5 border-primary/10'}`}>
                                    <Navigation className={`h-4 w-4 shrink-0 ${isDraggingPortico ? 'text-yellow-600' : 'text-primary'}`} />
                                    <div className="text-[10px] font-mono opacity-80 grid gap-0.5 flex-1">
                                        <div className="flex justify-between">
                                            <span>Lat:</span>
                                            <span className={isDraggingPortico ? 'font-bold text-yellow-700' : ''}>
                                                {isDraggingPortico ? draggedCoords?.lat.toFixed(6) : selectedPortico.latitude}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Lng:</span>
                                            <span className={isDraggingPortico ? 'font-bold text-yellow-700' : ''}>
                                                {isDraggingPortico ? draggedCoords?.lng.toFixed(6) : selectedPortico.longitude}
                                            </span>
                                        </div>
                                    </div>
                                    {isDraggingPortico && <Badge className="bg-yellow-500 text-[8px] h-4">MOVIENDO</Badge>}
                                </div>

                                {selectedPortico.concession_name === 'AVO' && (
                                    <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock3 className="h-4 w-4 text-yellow-600" />
                                            <span className="text-xs font-bold text-yellow-700 uppercase">Horario Punta (TBP)</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-yellow-800 dark:text-yellow-200">
                                            <div className="bg-yellow-100/50 dark:bg-yellow-900/20 p-1.5 rounded text-center">07:30 - 09:30</div>
                                            <div className="bg-yellow-100/50 dark:bg-yellow-900/20 p-1.5 rounded text-center">17:30 - 19:30</div>
                                        </div>
                                        <p className="text-[9px] mt-2 text-yellow-600 italic">Tarifas aplicables según matriz de tramos AVO</p>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {renderTariffDetails(selectedPortico.tariffs_json?.cat1, "Ligeros (CAT 1)")}
                                    {renderTariffDetails(selectedPortico.tariffs_json?.cat2, "Medianos (CAT 2)")}
                                    {renderTariffDetails(selectedPortico.tariffs_json?.cat3, "Pesados (CAT 3)")}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {isDraggingPortico ? (
                                        <>
                                            <Button 
                                                variant="outline"
                                                onClick={handleCancelDragging}
                                                className="uppercase text-[10px] font-black"
                                                disabled={isSavingPosition}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button 
                                                onClick={handleSavePosition}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-white uppercase text-[10px] font-black"
                                                disabled={isSavingPosition}
                                            >
                                                {isSavingPosition ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                                                Guardar
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button 
                                                variant="outline"
                                                onClick={handleStartDragging}
                                                className="uppercase text-[10px] font-black"
                                            >
                                                <Maximize2 className="h-3 w-3 mr-2" /> Mover
                                            </Button>
                                            <Button 
                                                onClick={() => router.push(`/admin/rates/tolls?id=${selectedPortico.id}`)}
                                                className="uppercase text-[10px] font-black"
                                            >
                                                <PenSquare className="h-3 w-3 mr-2" /> Editar
                                            </Button>
                                        </>
                                    )}
                                </div>
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
                        <div className="h-3 w-3 rounded-full bg-yellow-500 border border-background shadow-sm" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Concesión AVO</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500 border border-background shadow-sm" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Ruta 78</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500 border border-background shadow-sm" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Sin Configurar</span>
                    </div>
                </div>
            </div>
            
            
            {/* Dialogo de Creación */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-8 border-2">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">Nuevo Pórtico Tag</DialogTitle>
                        <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                            Configura los detalles básicos de la infraestructura
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase opacity-60 ml-1">Nombre Oficial</Label>
                            <Input 
                                id="name" 
                                value={newPorticoData.name}
                                onChange={(e) => setNewPorticoData({...newPorticoData, name: e.target.value})}
                                placeholder="Ej: Las Mercedes (Entrada)" 
                                className="h-12 rounded-xl border-2 font-bold"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="code" className="text-[10px] font-black uppercase opacity-60 ml-1">Código (ID)</Label>
                                <Input 
                                    id="code" 
                                    value={newPorticoData.reference_code}
                                    onChange={(e) => setNewPorticoData({...newPorticoData, reference_code: e.target.value})}
                                    placeholder="P101" 
                                    className="h-12 rounded-xl border-2 font-black uppercase text-primary bg-primary/5"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="concession" className="text-[10px] font-black uppercase opacity-60 ml-1">Concesión</Label>
                                <Input 
                                    id="concession" 
                                    value={newPorticoData.concession_name}
                                    onChange={(e) => setNewPorticoData({...newPorticoData, concession_name: e.target.value})}
                                    placeholder="AVO" 
                                    className="h-12 rounded-xl border-2 font-black uppercase bg-yellow-500/5 text-yellow-600"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="lat" className="text-[10px] font-black uppercase opacity-60 ml-1">Latitud</Label>
                                <Input 
                                    id="lat" 
                                    type="number"
                                    step="any"
                                    value={isNaN(newPorticoData.latitude) ? "" : newPorticoData.latitude}
                                    onChange={(e) => {
                                        const val = e.target.value === "" ? NaN : parseFloat(e.target.value);
                                        setNewPorticoData({...newPorticoData, latitude: val});
                                    }}
                                    className="h-12 rounded-xl border-2 font-mono"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lng" className="text-[10px] font-black uppercase opacity-60 ml-1">Longitud</Label>
                                <Input 
                                    id="lng" 
                                    type="number"
                                    step="any"
                                    value={isNaN(newPorticoData.longitude) ? "" : newPorticoData.longitude}
                                    onChange={(e) => {
                                        const val = e.target.value === "" ? NaN : parseFloat(e.target.value);
                                        setNewPorticoData({...newPorticoData, longitude: val});
                                    }}
                                    className="h-12 rounded-xl border-2 font-mono"
                                />
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            onClick={handlePickFromMap}
                            className="bg-muted hover:bg-primary/5 border-dashed border-2 py-6 rounded-2xl flex items-center justify-center gap-3"
                        >
                            <MapPin className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="text-xs font-black uppercase">Seleccionar en Mapa</div>
                                <div className="text-[9px] text-muted-foreground uppercase">Hacer clic visualmente para capturar</div>
                            </div>
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl h-12 uppercase font-black text-xs">Descartar</Button>
                        <Button 
                            onClick={handleCreatePortico} 
                            disabled={isCreating}
                            className="rounded-xl h-12 px-8 uppercase font-black text-xs bg-primary shadow-lg shadow-primary/20"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Crear e Instalar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
