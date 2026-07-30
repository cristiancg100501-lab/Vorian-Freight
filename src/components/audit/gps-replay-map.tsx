"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Play, Pause, Info, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSupabase } from "@/components/providers/supabase-provider";
import { LocationHistoryPoint } from "@/lib/mock-audit-data";

interface GpsReplayControlsProps {
    shipmentId: string;
    onUpdate: (point: LocationHistoryPoint | null, history: LocationHistoryPoint[]) => void;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export function GpsReplayControls({ shipmentId, onUpdate }: GpsReplayControlsProps) {
    const animationRef = useRef<number | null>(null);
    const { supabase } = useSupabase();
    
    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPoint, setCurrentPoint] = useState<LocationHistoryPoint | null>(null);
    
    // Data state
    const [locationHistory, setLocationHistory] = useState<LocationHistoryPoint[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // 1. Fetch real location history
    useEffect(() => {
        async function fetchHistory() {
            try {
                const { data, error } = await supabase
                    .from('driver_location_logs')
                    .select('*')
                    .eq('shipment_id', shipmentId)
                    .order('created_at', { ascending: true });
                
                if (error) {
                    console.error("Error fetching gps history:", error);
                    setLocationHistory([]);
                } else if (data && data.length > 0) {
                    // Map to expected format and calculate dynamic speed
                    const mappedData = data.map((d, index) => {
                        let speedKmH = 0;
                        if (index > 0) {
                            const prev = data[index - 1];
                            const distKm = getDistanceFromLatLonInKm(Number(prev.latitude), Number(prev.longitude), Number(d.latitude), Number(d.longitude));
                            const timeDiffHours = (new Date(d.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60);
                            if (timeDiffHours > 0) {
                                speedKmH = Math.min(Math.round(distKm / timeDiffHours), 140); // Capped at 140 km/h to ignore GPS jumps
                            }
                        }
                        
                        return {
                            id: d.id,
                            latitude: Number(d.latitude),
                            longitude: Number(d.longitude),
                            timestamp: d.created_at,
                            speed: speedKmH,
                            accuracy: 10,
                            provider: "gps",
                            heading: 0,
                            status_context: "REAL_TRACKING"
                        };
                    });
                    setLocationHistory(mappedData);
                } else {
                    // Si no hay datos reales, array vacio, no fake mock
                    setLocationHistory([]);
                }
            } catch (err) {
                console.error(err);
                setLocationHistory([]);
            } finally {
                setIsLoadingData(false);
            }
        }
        fetchHistory();
    }, [shipmentId, supabase]);

    // Handle Playback Logic
    useEffect(() => {
        if (!isPlaying || locationHistory.length === 0 || currentIndex >= locationHistory.length - 1) {
            if (currentIndex >= locationHistory.length - 1) setIsPlaying(false);
            return;
        }

        let lastTime = performance.now();
        const animate = (time: number) => {
            const deltaTime = time - lastTime;
            
            if (deltaTime > (1000 / playbackSpeed)) {
                setCurrentIndex(prev => {
                    if (prev >= locationHistory.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
                lastTime = time;
            }
            
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, currentIndex, playbackSpeed, locationHistory.length]);

    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    // Update point and notify parent
    useEffect(() => {
        if (locationHistory.length === 0) return;
        
        const point = locationHistory[currentIndex];
        setCurrentPoint(point);
        onUpdateRef.current(point, locationHistory);
    }, [currentIndex, locationHistory]);

    // Notify parent on unmount
    useEffect(() => {
        return () => {
            onUpdateRef.current(null, []);
        }
    }, []);

    const handleSliderChange = (value: number[]) => {
        setCurrentIndex(value[0]);
        if (!isPlaying && locationHistory[value[0]]) {
            const point = locationHistory[value[0]];
            setCurrentPoint(point);
            onUpdateRef.current(point, locationHistory);
        }
    };

    const togglePlayback = () => {
        if (currentIndex >= locationHistory.length - 1) {
            setCurrentIndex(0); // Reiniciar si terminó
        }
        setIsPlaying(!isPlaying);
    };

    if (isLoadingData) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Cargando telemetría...</div>;
    }

    if (locationHistory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 border rounded-xl bg-muted/50">
                <div className="bg-background p-3 rounded-full shadow-sm">
                    <MapPinOff className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Sin Datos de Telemetría</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        No se registraron ubicaciones reales del conductor durante este envío.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* HUD Overlay styled as a card since we don't have the map behind it */}
            {currentPoint && (
                <div className="flex flex-col gap-3">
                    <div className="bg-background border p-4 rounded-xl shadow-sm w-full">
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Telemetría GPS</p>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-3xl font-bold font-mono">
                                    {currentPoint.speed} <span className="text-sm font-normal text-muted-foreground">km/h</span>
                                </p>
                            </div>
                            <Badge variant={currentPoint.speed > 0 ? "default" : "secondary"}>
                                {currentPoint.speed > 0 ? "EN MOVIMIENTO" : "DETENIDO"}
                            </Badge>
                        </div>
                    </div>
                    
                    <div className="bg-background border p-4 rounded-xl shadow-sm w-full">
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Timestamp Auditado</p>
                        <p className="font-mono font-medium text-sm">
                            {format(new Date(currentPoint.timestamp), "dd MMM yyyy", { locale: es })}
                        </p>
                        <p className="text-2xl font-mono font-bold text-primary">
                            {format(new Date(currentPoint.timestamp), "HH:mm:ss")}
                        </p>
                    </div>
                </div>
            )}

            {/* Controles de Reproducción */}
            <div className="bg-card border rounded-xl p-5 space-y-5 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button 
                        variant={isPlaying ? "destructive" : "default"} 
                        size="icon" 
                        onClick={togglePlayback}
                        className="h-12 w-12 rounded-full shrink-0 shadow-md"
                    >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
                    </Button>
                    
                    <div className="flex-1 px-2 pt-2">
                        <Slider 
                            value={[currentIndex]} 
                            max={locationHistory.length > 0 ? locationHistory.length - 1 : 0} 
                            step={1}
                            onValueChange={handleSliderChange}
                        />
                    </div>
                </div>
                
                <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Velocidad:</span>
                        <div className="flex gap-1.5">
                            {[1, 2, 5, 10].map(speed => (
                                <Badge 
                                    key={speed}
                                    variant={playbackSpeed === speed ? "default" : "secondary"}
                                    className="cursor-pointer font-mono px-2 py-1 text-xs"
                                    onClick={() => setPlaybackSpeed(speed)}
                                >
                                    {speed}x
                                </Badge>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-2 mt-2 bg-amber-500/10 text-amber-700 dark:text-amber-500 p-3 rounded-lg text-xs leading-relaxed">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Mostrando datos de auditoría inmutables y encriptados guardados en la blockchain del sistema.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
