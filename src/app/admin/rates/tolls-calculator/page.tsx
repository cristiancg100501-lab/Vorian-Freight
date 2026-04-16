'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Clock, Truck, CircleDollarSign, AlertTriangle, Route } from 'lucide-react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useTheme } from 'next-themes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as turf from '@turf/turf'

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

const TOLL_MATCH_RADIUS_METERS = 3; // Radio de máxima precisión de 3 metros solicitado por el usuario

export default function TollsCalculatorPage() {
    const { supabase } = useSupabase();
    const { theme } = useTheme();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    
    // Markers
    const markerA = useRef<mapboxgl.Marker | null>(null);
    const markerB = useRef<mapboxgl.Marker | null>(null);
    const tollMarkersRef = useRef<mapboxgl.Marker[]>([]);

    // State
    const [porticos, setPorticos] = useState<any[]>([]);
    const [routeGeometry, setRouteGeometry] = useState<any>(null);
    const [routeDistance, setRouteDistance] = useState(0);
    const [routeDuration, setRouteDuration] = useState(0);
    
    // Config controls
    const [departureTime, setDepartureTime] = useState<string>(
        new Date().toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit' })
    );
    const [departureDate, setDepartureDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [selectedCategory, setSelectedCategory] = useState<'cat1'|'cat2'|'cat3'>('cat1');
    const [crossedTolls, setCrossedTolls] = useState<any[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        const loadPorticos = async () => {
            const { data } = await supabase.from('porticos').select('*').not('tariffs_json', 'is', null);
            setPorticos(data || []);
        };
        loadPorticos();
    }, []);

    useEffect(() => {
        if (!mapContainer.current) return;
        
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/vorianglobal/cmlldlha700ft01qx1i85by1c',
            center: [-70.6693, -33.4489], 
            zoom: 11,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add default markers
        const elA = document.createElement('div');
        elA.className = 'w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white';
        elA.innerText = 'A';
        markerA.current = new mapboxgl.Marker({ element: elA, draggable: true })
            .setLngLat([-70.655, -33.435])
            .addTo(map.current);
            
        const elB = document.createElement('div');
        elB.className = 'w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white';
        elB.innerText = 'B';
        markerB.current = new mapboxgl.Marker({ element: elB, draggable: true })
            .setLngLat([-70.585, -33.515])
            .addTo(map.current);

        const onDragEnd = () => fetchRoute();
        markerA.current.on('dragend', onDragEnd);
        markerB.current.on('dragend', onDragEnd);

        map.current.on('load', () => {
            // Setup Route Layer
            map.current?.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
            });

            map.current?.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#8b5cf6', 'line-width': 6, 'line-opacity': 0.8 }
            });

            fetchRoute();
        });

        return () => map.current?.remove();
    }, [theme]);

    useEffect(() => {
        if (routeGeometry) processTollIntersections();
    }, [routeGeometry, porticos, departureDate, departureTime, selectedCategory]);

    const fetchRoute = async () => {
        if (!markerA.current || !markerB.current) return;
        setIsCalculating(true);

        const lngLatA = markerA.current.getLngLat();
        const lngLatB = markerB.current.getLngLat();
        
        try {
            // overview=full asegura la máxima resolución de la línea de la carretera
            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${lngLatA.lng},${lngLatA.lat};${lngLatB.lng},${lngLatB.lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
            );
            const json = await query.json();
            const route = json.routes[0];
            
            if (route) {
                setRouteGeometry(route.geometry);
                setRouteDistance(route.distance);
                setRouteDuration(route.duration);
                
                if (map.current?.getSource('route')) {
                    (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(route.geometry);
                }
            }
        } catch (e) {
            console.error("Error routing", e);
        } finally {
            setIsCalculating(false);
        }
    };

    const processTollIntersections = () => {
        if (!routeGeometry || !porticos.length) return;

        // Clear existing map portico markers
        tollMarkersRef.current.forEach(m => m.remove());
        tollMarkersRef.current = [];

        const routeLine = turf.lineString(routeGeometry.coordinates);
        let potentialTolls: any[] = [];

        // 1. Initial rough intersection against all active porticos
        porticos.forEach(portico => {
            if (!portico.latitude || !portico.longitude) return;
            const pt = turf.point([portico.longitude, portico.latitude]);
            const dist = turf.pointToLineDistance(pt, routeLine, { units: 'meters' });
            
            if (dist <= TOLL_MATCH_RADIUS_METERS) {
                potentialTolls.push({ portico, dist });
            }
        });

        // 2. Deduplicate Tolls (Prevent charging both North and South lanes independently)
        // Group by Reference Code or Name, and only pick the one mathematically closest to the route line.
        const grouped = new Map<string, any>();
        potentialTolls.forEach(item => {
            const key = item.portico.reference_code || item.portico.name || item.portico.id;
            if (!grouped.has(key)) {
                grouped.set(key, item);
            } else {
                if (item.dist < grouped.get(key).dist) {
                    grouped.set(key, item);
                }
            }
        });

        const crossedArray = Array.from(grouped.values()).map(item => item.portico);

        // 3. Calculate Prices based on DateTime
        let travelDateObj = new Date(`${departureDate}T${departureTime}:00`);
        if (isNaN(travelDateObj.getTime())) travelDateObj = new Date();

        const pricedTolls = crossedArray.map(portico => {
            const pricing = calculateTollCost(portico, travelDateObj, selectedCategory);
            
            // Render to visual map
            const el = document.createElement('div');
            el.className = `w-6 h-6 border-2 border-background shadow-md rounded-full flex items-center justify-center hover:scale-125 transition-transform z-20 bg-${pricing.color}`;
            el.innerHTML = `<span class="text-[8px] font-black text-white">$</span>`;
            
            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([portico.longitude, portico.latitude])
                .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(`
                    <div class="p-2">
                        <div class="font-bold text-xs">${portico.name}</div>
                        <div class="text-xl font-black text-orange-500">$${pricing.price.toLocaleString('es-CL')}</div>
                        <div class="text-[10px] text-muted-foreground">${pricing.tag}</div>
                    </div>
                `))
                .addTo(map.current!);
            
            tollMarkersRef.current.push(marker);

            return { ...portico, ...pricing };
        });

        setCrossedTolls(pricedTolls);
    };

    /**
     * MOTOR DE CÁLCULO DE PRICING
     */
    const calculateTollCost = (portico: any, dateObj: Date, category: string) => {
        const data = portico.tariffs_json?.[category];
        if (!data) return { price: 0, tag: 'SIN TARIFA', color: 'gray-400' };

        const hh = dateObj.getHours().toString().padStart(2, '0');
        const mm = dateObj.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hh}:${mm}`;

        const isSaturday = dateObj.getDay() === 6;
        const isSunday = dateObj.getDay() === 0;
        const isWeekend = isSaturday || isSunday;

        const parsePrice = (val: any) => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'string') {
                return parseFloat(val.replace(',', '.'));
            }
            return parseFloat(val);
        };

        const timeToMinutes = (t: string) => {
            const clean = t.replace(/\s+/g, '').replace(/\./g, ':');
            const parts = clean.split(':').map(val => parseInt(val, 10));
            if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
            return parts[0] * 60 + parts[1];
        };

        const currentMinutes = timeToMinutes(timeStr);

        const isInWindow = (windowsStr: string | null) => {
            if (!windowsStr || currentMinutes === null) return false;
            
            const bands = windowsStr.split('/').map(s => s.trim());
            for (const b of bands) {
                const range = b.split('-').map(s => s.trim());
                if (range.length !== 2) continue;
                
                const startMins = timeToMinutes(range[0]);
                const endMins = timeToMinutes(range[1]);
                
                if (startMins === null || endMins === null) continue;

                if (startMins <= endMins) {
                    if (currentMinutes >= startMins && currentMinutes <= endMins) return true;
                } else {
                    if (currentMinutes >= startMins || currentMinutes <= endMins) return true;
                }
            }
            return false;
        }

        if (currentMinutes !== null) {
            if (!isWeekend) {
                if (isInWindow(data.ts_laboral)) return { price: parsePrice(data.price_ts), tag: 'TS LABORAL', color: 'red-500' };
                if (isInWindow(data.tbp_laboral)) return { price: parsePrice(data.price_tbp), tag: 'TBP LABORAL', color: 'amber-500' };
            } else if (isSaturday) {
                if (isInWindow(data.ts_sabado)) return { price: parsePrice(data.price_ts), tag: 'TS SÁBADO', color: 'red-500' };
                if (isInWindow(data.tbp_sabado)) return { price: parsePrice(data.price_tbp), tag: 'TBP SÁBADO', color: 'blue-500' };
            } else if (isSunday) {
                if (isInWindow(data.ts_domingo)) return { price: parsePrice(data.price_ts), tag: 'TS DOMINGO', color: 'red-500' };
                if (isInWindow(data.tbp_domingo)) return { price: parsePrice(data.price_tbp), tag: 'TBP DOMINGO', color: 'blue-500' };
            }
        }

        return { price: parsePrice(data.price_tbfp), tag: 'TBFP (Base)', color: 'green-500' };
    };

    const totalCost = crossedTolls.reduce((acc, t) => acc + Number(t.price || 0), 0);


    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.16))] overflow-hidden -m-6">
            
            {/* Control Panel (Left) */}
            <div className="w-full lg:w-96 bg-background border-r flex flex-col shadow-xl z-10 shrink-0">
                <div className="p-5 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-20">
                    <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 mb-4">
                        <Route className="text-orange-500 w-5 h-5" /> Simulador de Rutas
                    </h1>
                    
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Día Simulado</Label>
                            <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="h-9 font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Hora Simulada</Label>
                            <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="h-9 font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Tipo Vehículo</Label>
                            <div className="flex gap-2">
                                {['cat1', 'cat2', 'cat3'].map(c => (
                                    <Button 
                                        key={c}
                                        variant={selectedCategory === c ? 'default' : 'outline'}
                                        size="sm"
                                        className={`flex-1 text-xs uppercase font-bold ${selectedCategory === c ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                                        onClick={() => setSelectedCategory(c as any)}
                                    >
                                        <Truck className="w-3 h-3 mr-1"/> {c}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Receipt Panel */}
                <div className="flex-1 overflow-y-auto p-5 bg-muted/20">
                    {crossedTolls.length === 0 ? (
                        <div className="text-center p-8 opacity-50 space-y-3">
                            <CircleDollarSign className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-semibold uppercase">No hay pórticos en ruta</p>
                            <p className="text-xs text-muted-foreground">Mueve los marcadores de la derecha por una pista consecionada.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-orange-500 text-white rounded-xl p-4 shadow-lg flex justify-between items-center animate-in fade-in zoom-in duration-300">
                                <div>
                                    <p className="text-xs font-black opacity-80 uppercase tracking-widest">Costo Total</p>
                                    <p className="text-3xl font-black">
                                        $<span className="font-mono">{totalCost.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold opacity-80 uppercase">Distancia</p>
                                    <p className="font-mono font-bold text-lg">{(routeDistance/1000).toFixed(1)} km</p>
                                </div>
                            </div>

                            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest pt-2 border-b pb-2">
                                Desglose de Pórticos ({crossedTolls.length})
                            </h3>
                            
                            <div className="space-y-2 pb-10">
                                {crossedTolls.map((t, idx) => (
                                    <div key={idx} className="bg-background border rounded-lg p-3 hover:border-orange-500/30 transition-colors shadow-sm relative overflow-hidden group">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${t.color}`} />
                                        <div className="flex justify-between items-start pl-2">
                                            <div className="space-y-1">
                                                <div className="font-bold text-sm tracking-tight leading-none">{t.name}</div>
                                                <div className="text-[10px] font-bold text-muted-foreground flex gap-1 items-center">
                                                    <span>{t.reference_code}</span>
                                                    <span>&bull;</span>
                                                    <span style={{ color: t.color.includes('amber') ? '#d97706' : t.color.includes('red') ? '#ef4444' : t.color.includes('blue') ? '#3b82f6' : '#22c55e' }}>{t.tag}</span>
                                                </div>
                                            </div>
                                            <div className="font-mono font-black text-base">${t.price.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Area (Right) */}
            <div className="flex-1 bg-muted relative h-[50vh] lg:h-full shrink-0" ref={mapContainer}>
                {isCalculating && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="bg-background border shadow-2xl rounded-full px-6 py-3 font-bold flex items-center gap-3 animate-pulse">
                            <Navigation className="animate-spin text-orange-500" /> Calculando Intersecciones...
                        </div>
                    </div>
                )}
                
                {/* Desktop Tutorial Hint */}
                <div className="absolute top-4 left-4 z-40 bg-background/90 backdrop-blur-md p-3 rounded-lg shadow-lg border text-xs max-w-xs hidden lg:block">
                    <p className="font-bold flex items-center gap-1.5 mb-1 text-primary"><MapPin className="w-4 h-4"/> ¿Cómo Usar?</p>
                    <p className="text-muted-foreground">Arrastra los marcadores gigantes A (Origen) y B (Destino) a lo largo de Vespucio, Costanera Norte o Autopista Central para probar el ruteo de TAG.</p>
                </div>
            </div>
        </div>
    )
}
