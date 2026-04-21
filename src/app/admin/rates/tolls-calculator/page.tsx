'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Clock, Truck, CircleDollarSign, AlertTriangle, Route, Anchor, Ship } from 'lucide-react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useTheme } from 'next-themes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as turf from '@turf/turf'

mapboxgl.accessToken = "pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ";

const TOLL_MATCH_RADIUS_METERS = 10; // Radio de precisión final fijado en 10 metros solicitado por el usuario

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
    const [avoMatrix, setAvoMatrix] = useState<any[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        const loadPorticos = async () => {
            // Simplificamos la carga para asegurar que no fallen los filtros complejos
            const { data, error } = await supabase.from('porticos').select('*').eq('is_active', true);
            if (error) console.error("Error cargando pórticos:", error);
            setPorticos(data || []);
        };
        loadPorticos();
    }, []);

    // Load matrices when category changes
    useEffect(() => {
        const loadMatrix = async () => {
            const catNum = selectedCategory === 'cat1' ? 1 : selectedCategory === 'cat2' ? 2 : 3;
            // Quitamos el filtro de concession_name por si acaso, el category num ya es específico
            const { data, error } = await supabase
                .from('concession_matrices')
                .select('*')
                .eq('category', catNum);
            
            if (error) console.error("Error loading matrix:", error);
            setAvoMatrix(data || []);
        };
        loadMatrix();
    }, [selectedCategory, supabase]);

    useEffect(() => {
        if (!mapContainer.current) return;
        
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: theme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11',
            center: [-70.6693, -33.4489], 
            zoom: 12,
            pitch: 0, // Mapa plano
            bearing: 0,
            pitchWithRotate: false, // Bloquear 3D
            dragRotate: false // Bloquear rotación
        });

        map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-right');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        // Marcadores profesionales con iconos
        const elA = document.createElement('div');
        elA.className = 'flex flex-col items-center';
        elA.innerHTML = `
            <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-white text-white">
                <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5" stroke="currentColor" stroke-width="3"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
            </div>
        `;
        markerA.current = new mapboxgl.Marker({ element: elA, draggable: true })
            .setLngLat([-70.655, -33.435])
            .addTo(map.current);
            
        const elB = document.createElement('div');
        elB.className = 'flex flex-col items-center';
        elB.innerHTML = `
            <div class="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.5)] border-2 border-white text-white">
                <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5" stroke="currentColor" stroke-width="3"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
            </div>
        `;
        markerB.current = new mapboxgl.Marker({ element: elB, draggable: true })
            .setLngLat([-70.585, -33.515])
            .addTo(map.current);

        const onDragEnd = () => fetchRoute();
        markerA.current.on('dragend', onDragEnd);
        markerB.current.on('dragend', onDragEnd);

        map.current.on('load', () => {
            // Estética Profesional: Ocultar POIs y landmarks para que sea gris y limpio
            const style = map.current?.getStyle();
            if (style) {
                style.layers.forEach((layer: any) => {
                    if (
                        layer.id.includes('poi') || 
                        layer.id.includes('landmark') ||
                        layer.id.includes('building') || 
                        layer.id.includes('park') ||
                        layer.id.includes('landuse')
                    ) {
                        map.current?.setLayoutProperty(layer.id, 'visibility', 'none');
                    }
                });
            }

            // Capa de Tráfico Visual (Solo si está disponible en este estilo/cuenta)
            // Agregamos el source de tráfico de Mapbox
            // Nota: navigation-night ya lo tiene, pero dark-v11 no siempre
            try {
                map.current?.addSource('mapbox-traffic', {
                    type: 'vector',
                    url: 'mapbox://mapbox.mapbox-traffic-v1'
                });
                
                // Capas de tráfico (Verde, Amarillo, Rojo)
                const trafficLayers = [
                    { id: 'traffic-low', color: '#16a34a', filter: ['==', 'congestion', 'low'] },
                    { id: 'traffic-moderate', color: '#eab308', filter: ['==', 'congestion', 'moderate'] },
                    { id: 'traffic-heavy', color: '#ea580c', filter: ['==', 'congestion', 'heavy'] },
                    { id: 'traffic-severe', color: '#dc2626', filter: ['==', 'congestion', 'severe'] }
                ];

                trafficLayers.forEach(layer => {
                    map.current?.addLayer({
                        id: layer.id,
                        type: 'line',
                        source: 'mapbox-traffic',
                        'source-layer': 'traffic',
                        filter: layer.filter,
                        paint: { 'line-color': layer.color, 'line-width': 2, 'line-opacity': 0.6 }
                    });
                });
            } catch (e) {
                console.warn("Traffic source could not be added manually", e);
            }

            // Setup Route Layer
            map.current?.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
            });

            // Setup Route Glow (Outer Layer)
            // Glow background line
            map.current?.addLayer({
                id: 'route-glow',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 
                    'line-color': '#8b5cf6', 
                    'line-width': 10, 
                    'line-opacity': 0.3, 
                    'line-blur': 6 
                }
            });
            
            // Main Route Line (Con animación de flujo dash)
            map.current?.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 
                    'line-color': '#a78bfa', 
                    'line-width': 5, 
                    'line-opacity': 1,
                    'line-dasharray': [0.1, 1.8] // Proporción para que se vea "larga" y fluida
                }
            });

            // Animación de pulso profesional
            let step = 0;
            let animationId: number;

            const animateRoute = () => {
                // Guardia: Si el mapa ya no existe o se destruyó, cancelar
                if (!map.current || !map.current.getStyle()) return;

                step += 0.05;
                const opacity = 0.2 + Math.abs(Math.sin(step)) * 0.1;
                
                try {
                    // Animación de brillo (opacity)
                    if (map.current.getLayer('route-glow')) {
                        map.current.setPaintProperty('route-glow', 'line-opacity', opacity);
                    }
                    // Animación de flujo (moving dash)
                    if (map.current.getLayer('route')) {
                        (map.current as any).setPaintProperty('route', 'line-dashoffset', -step * 2);
                    }
                } catch (e) {
                    // Si falla el acceso a capas (por destrucción del mapa), paramos
                    return;
                }
                
                animationId = requestAnimationFrame(animateRoute);
            };
            animateRoute();

            fetchRoute();
        });

        return () => {
            // Limpieza robusta: Cancelar animación y remover mapa
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [theme]);

    useEffect(() => {
        if (routeGeometry) processTollIntersections();
    }, [routeGeometry, porticos, avoMatrix, departureDate, departureTime, selectedCategory]);

    const fetchRoute = async () => {
        if (!markerA.current || !markerB.current) return;
        setIsCalculating(true);

        const lngLatA = markerA.current.getLngLat();
        const lngLatB = markerB.current.getLngLat();
        
        try {
            // Cambiado a driving-traffic para enrutamiento profesional
            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${lngLatA.lng},${lngLatA.lat};${lngLatB.lng},${lngLatB.lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
            );
            const json = await query.json();
            const route = json.routes[0];
            
            if (route) {
                const source = map.current?.getSource('route') as mapboxgl.GeoJSONSource;
                if (source) {
                    source.setData(route.geometry);
                }
                setRouteGeometry(route.geometry);
                setRouteDistance(route.distance);
                setRouteDuration(route.duration);

                // Ajustar el mapa para que se vea toda la ruta con un margen
                const coordinates = route.geometry.coordinates;
                const bounds = coordinates.reduce((acc: mapboxgl.LngLatBounds, coord: any) => {
                    return acc.extend(coord);
                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

                map.current?.fitBounds(bounds, {
                    padding: 80,
                    duration: 1000
                });
            }
        } catch (e) {
            console.error("Error routing", e);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSetPortRoute = (terminal: 'STI' | 'DPWORLD', role: 'A' | 'B' = 'B') => {
        const marker = role === 'A' ? markerA.current : markerB.current;
        if (!marker || !map.current) return;
        
        let coords: [number, number];
        
        if (terminal === 'DPWORLD') {
            // Puerto Central (DP World) - Garita exacta entregada por el usuario
            coords = [-71.61992283182525, -33.60245995952618];
        } else {
            // STI - San Antonio Terminal Internacional - Garita exacta entregada por el usuario
            coords = [-71.62349134426697, -33.6012950495598];
        }

        marker.setLngLat(coords);
        
        // Cambiar automáticamente a CAT3 (6 ejes / Camiones pesados)
        setSelectedCategory('cat3');
        
        // Ejecutar ruteo
        setTimeout(() => fetchRoute(), 100);
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
            
            // Mapbox resolution might be high, we use pointToLineDistance
            const dist = turf.pointToLineDistance(pt, routeLine, { units: 'meters' });
            
            if (dist <= TOLL_MATCH_RADIUS_METERS) {
                // Determine position along the line to order them
                const snapped = turf.nearestPointOnLine(routeLine, pt);
                const pos = snapped.properties.location || 0;
                potentialTolls.push({ portico, dist, pos });
            }
        });

        // 2. Deduplicate Tolls (Prevent charging both North and South lanes independently)
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

        let crossedArray = Array.from(grouped.values()).sort((a, b) => a.pos - b.pos);

        // 3. Separate AVO vs Standard
        const avoPorticos = crossedArray.filter(item => item.portico.concession_name === 'AVO');
        const standardPorticos = crossedArray.filter(item => item.portico.concession_name !== 'AVO');

        // 4. Calculate Prices
        let travelDateObj = new Date(`${departureDate}T${departureTime}:00`);
        if (isNaN(travelDateObj.getTime())) travelDateObj = new Date();

        let results: any[] = [];

        // A. Process Standard Tolls
        standardPorticos.forEach(item => {
            const portico = item.portico;
            const pricing = calculateTollCost(portico, travelDateObj, selectedCategory);
            results.push({ ...portico, ...pricing, type: 'standard' });
            renderMarker(portico, pricing);
        });

        // B. Process AVO Section
        if (avoPorticos.length >= 1) {
            const entry = avoPorticos[0].portico;
            const exit = avoPorticos[avoPorticos.length - 1].portico;
            
            const avoPricing = getAvoPrice(entry, exit, travelDateObj);
            
            results.push({
                id: `avo-${entry.id}-${exit.id}`,
                name: `Tramo AVO: ${entry.name} ➔ ${exit.name}`,
                reference_code: 'CONCESIÓN AVO',
                price: avoPricing.price,
                tag: avoPricing.tag,
                color: avoPricing.color,
                type: 'avo',
                isAvo: true,
                entryName: entry.name,
                exitName: exit.name,
                debug: avoPricing.debug // New field
            });

            // Render all AVO markers in same color
            avoPorticos.forEach(item => {
                renderMarker(item.portico, { 
                    price: 0, 
                    tag: 'PARTE DE TRAMO AVO', 
                    color: avoPricing.color 
                }, true);
            });
        }

        setCrossedTolls(results);
    };

    const renderMarker = (portico: any, pricing: any, isPartOnly: boolean = false) => {
        const el = document.createElement('div');
        const colorHex = pricing.color === 'yellow' ? '#fbbf24' : 
                        pricing.color.includes('red') ? '#ef4444' : 
                        pricing.color.includes('amber') ? '#f59e0b' : 
                        pricing.color.includes('blue') ? '#3b82f6' : 
                        pricing.color.includes('green') ? '#22c55e' : '#64748b';

        el.style.backgroundColor = colorHex;
        el.style.boxShadow = pricing.color === 'yellow' ? '0 0 15px rgba(251, 191, 36, 0.5)' : 'none';
        el.className = `w-6 h-6 border-2 border-background shadow-md rounded-full flex items-center justify-center hover:scale-125 transition-transform z-20 group relative cursor-help`;
        el.innerHTML = `<span class="text-[8px] font-black ${pricing.color === 'yellow' ? 'text-yellow-950' : 'text-white'}">$</span>`;

        // Tooltip Pro (Personalizado en Hover)
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950/95 text-white p-3 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 border border-white/10 shadow-2xl backdrop-blur-md transform translate-y-2 group-hover:translate-y-0';
        tooltip.innerHTML = `
            <div class="font-black uppercase tracking-tighter text-emerald-400 mb-1 border-b border-white/5 pb-1">
                ${portico.name}
            </div>
            <div class="flex justify-between items-center pt-1">
                <span class="opacity-60 font-medium font-mono">${pricing.tag}</span>
                <span class="font-black text-xs text-white bg-white/10 px-1.5 py-0.5 rounded">
                    $${pricing.price.toLocaleString('es-CL')}
                </span>
            </div>
            <div class="mt-1.5 text-[8px] opacity-40 uppercase tracking-widest">${portico.reference_code || ''}</div>
        `;
        el.appendChild(tooltip);

        const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([portico.longitude, portico.latitude])
            .addTo(map.current!);
        
        tollMarkersRef.current.push(marker);
    };

    /**
     * MOTOR DE CÁLCULO AVO
     */
    const getAvoPrice = (entry: any, exit: any, dateObj: Date) => {
        const catNum = selectedCategory === 'cat1' ? 1 : selectedCategory === 'cat2' ? 2 : 3;

        // Limpieza profunda: Solo letras y números para evitar fallos por dashes, espacios o tildes
        const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const entryCode = clean(entry.reference_code);
        const exitCode = clean(exit.reference_code);

        const match = avoMatrix.find(m => 
            clean(m.entry_portico_ref) === entryCode && 
            clean(m.exit_portico_ref) === exitCode &&
            Number(m.category) === catNum
        );
        
        if (!match) {
            return { 
                price: 0, 
                tag: 'TRAMO NO ENCONTRADO EN MATRIZ', 
                color: 'slate-500',
                debug: `Buscando: "${entry.reference_code}" ➔ "${exit.reference_code}" (Cat: ${catNum})`
            };
        }

        const totalMins = dateObj.getHours() * 60 + dateObj.getMinutes();
        const isBusinessDay = dateObj.getDay() >= 1 && dateObj.getDay() <= 5;
        const isPeak = isBusinessDay && ((totalMins >= 450 && totalMins <= 570) || (totalMins >= 1050 && totalMins <= 1170));
        
        const price = isPeak ? match.tbp_price : match.tbfp_price;
        return { 
            price: Number(price), 
            tag: isPeak ? 'TARIFA PUNTA (AVO)' : 'TARIFA VALLE (AVO)', 
            color: 'yellow' 
        };
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

        // LISTA DE FERIADOS NACIONALES (CHILE)
        const isHoliday = (date: Date) => {
            const m = date.getMonth() + 1;
            const d = date.getDate();
            const holidays = [
                '1-1',   // Año Nuevo
                '3-29',  // Viernes Santo
                '3-30',  // Sábado Santo
                '5-1',   // Día del Trabajo
                '5-21',  // Glorias Navales
                '6-20',  // Pueblos Originarios
                '6-29',  // San Pedro y San Pablo
                '7-16',  // Virgen del Carmen
                '8-15',  // Asunción
                '9-18',  // Fiestas Patrias
                '9-19',  // Fiestas Patrias
                '9-20',  // Fiestas Patrias
                '10-12', // Encuentro Dos Mundos
                '10-31', // Iglesias Evangélicas
                '11-1',  // Todos los Santos
                '12-8',  // Inmaculada Concepción
                '12-25'  // Navidad
            ];
            return holidays.includes(`${m}-${d}`);
        };

        const isSaturday = dateObj.getDay() === 6;
        const isSunday = dateObj.getDay() === 0;
        const isFriday = dateObj.getDay() === 5;
        const isNationalHoliday = isHoliday(dateObj);
        
        // Detección de Víspera (Mañana es feriado)
        const isEveOfHoliday = (() => {
            const tomorrow = new Date(dateObj);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return isHoliday(tomorrow);
        })();

        // Temporada Alta (20 Dic - 10 Mar)
        const isHighSeason = (() => {
            const m = dateObj.getMonth() + 1;
            const d = dateObj.getDate();
            if (m === 12 && d >= 20) return true;
            if (m === 1 || m === 2) return true;
            if (m === 3 && d <= 10) return true;
            return false;
        })();

        // Un feriado nacional o un domingo cuentan como fin de semana
        const isWeekend = isSunday || isSaturday || isNationalHoliday;

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

        const isInWindow = (windowsStr: string | null, requireHolidayMark: boolean = false) => {
            if (!windowsStr || currentMinutes === null) return false;
            
            const bands = windowsStr.split('/').map(s => s.trim());
            for (const b of bands) {
                const hasHolidayMark = b.includes('[H]');
                if (requireHolidayMark && !hasHolidayMark) continue;

                const cleanBand = b.replace('[H]', '').trim();
                const range = cleanBand.split('-').map(s => s.trim());
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

        // --- LÓGICA DE MOTOR DE PRECIOS AVANZADA ---
        const isRuta78 = portico.concession_name === 'Ruta 78';
        // En Ruta 78 el peaje punta solo aplica en Temporada Alta o Feriados/Vísperas de feriado
        const canAppliedPeak = !isRuta78 || (isHighSeason || isNationalHoliday || isEveOfHoliday);

        if (currentMinutes !== null && canAppliedPeak) {
            // 1. Prioridad: Feriados Nacionales (Lógica [H])
            if (isNationalHoliday) {
                if (isInWindow(data.ts_laboral, true) || isInWindow(data.ts_sabado, true) || isInWindow(data.ts_domingo, true)) {
                    return { price: parsePrice(data.price_ts), tag: 'TS FERIADO', color: 'red-500' };
                }
                if (isInWindow(data.tbp_laboral, true) || isInWindow(data.tbp_sabado, true) || isInWindow(data.tbp_domingo, true)) {
                    return { price: parsePrice(data.price_tbp), tag: 'TBP FERIADO', color: 'blue-500' };
                }
            } 
            
            // 2. Lógica de Vísperas y Viernes (San Antonio Departures)
            if (isFriday || (isRuta78 && isEveOfHoliday)) {
                if (isInWindow(data.ts_viernes || data.ts_laboral)) return { price: parsePrice(data.price_ts), tag: isEveOfHoliday ? 'TS VÍSPERA' : 'TS VIERNES', color: 'red-500' };
                if (isInWindow(data.tbp_viernes || data.tbp_laboral)) return { price: parsePrice(data.price_tbp), tag: isEveOfHoliday ? 'TBP VÍSPERA' : 'TBP VIERNES', color: 'blue-600' };
            }

            // 3. Lote por Días Estándar
            if (isSunday) {
                if (isInWindow(data.ts_domingo)) return { price: parsePrice(data.price_ts), tag: 'TS DOMINGO', color: 'red-500' };
                if (isInWindow(data.tbp_domingo)) return { price: parsePrice(data.price_tbp), tag: 'TBP DOMINGO', color: 'blue-500' };
            } else if (isSaturday || isNationalHoliday) {
                if (isInWindow(data.ts_sabado)) return { price: parsePrice(data.price_ts), tag: 'TS SÁBADO', color: 'red-500' };
                if (isInWindow(data.tbp_sabado)) return { price: parsePrice(data.price_tbp), tag: 'TBP SÁBADO', color: 'blue-500' };
            } else {
                // Lunes a Jueves
                if (isInWindow(data.ts_laboral)) return { price: parsePrice(data.price_ts), tag: 'TS LABORAL', color: 'red-500' };
                if (isInWindow(data.tbp_laboral)) return { price: parsePrice(data.price_tbp), tag: 'TBP LABORAL', color: 'amber-500' };
            }
        }

        if (portico.concession_name === 'Ruta 78') {
            const price = currentMinutes !== null && isWeekend ? parsePrice(data.price_ts || data.price_tbp) : parsePrice(data.price_tbfp);
            return { price, tag: 'RUTA 78', color: 'blue-600' };
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
                            <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                                {(['cat1', 'cat2', 'cat3'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg transition-all border-2 ${selectedCategory === cat ? 'bg-orange-500 text-white border-orange-500 shadow-lg scale-105' : 'bg-transparent text-muted-foreground border-transparent hover:bg-white/5'}`}
                                    >
                                        <Truck className={cat === 'cat3' ? 'h-6 w-6' : cat === 'cat2' ? 'h-5 w-5' : 'h-4 w-4'} />
                                        <span className="text-[9px] font-black mt-1 uppercase leading-none text-center">
                                            {cat === 'cat1' ? 'Livianos' : cat === 'cat2' ? 'Buses / 2 Ejes' : '6 Ejes (CAT3)'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SECCIÓN: ACCESOS RÁPIDOS */}
                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                                <Anchor className="h-4 w-4" /> Destinos Frecuentes
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {/* Puerto Central Card */}
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 space-y-3 group hover:border-blue-500/40 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg">
                                            <Ship className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-xs font-black uppercase tracking-tighter">Puerto Central</span>
                                            <span className="text-[9px] opacity-60 uppercase font-bold text-blue-300">DP World / CAT3</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={() => handleSetPortRoute('DPWORLD', 'A')}
                                            className="flex-1 h-8 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 text-[10px] font-black uppercase rounded-lg border border-blue-500/30"
                                        >
                                            Punto A
                                        </Button>
                                        <Button 
                                            onClick={() => handleSetPortRoute('DPWORLD', 'B')}
                                            className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-900/20"
                                        >
                                            Punto B
                                        </Button>
                                    </div>
                                </div>

                                {/* STI Card */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 space-y-3 group hover:border-emerald-500/40 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                                            <Ship className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-xs font-black uppercase tracking-tighter">Terminal STI</span>
                                            <span className="text-[9px] opacity-60 uppercase font-bold text-emerald-300">STI Port / CAT3</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={() => handleSetPortRoute('STI', 'A')}
                                            className="flex-1 h-8 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 text-[10px] font-black uppercase rounded-lg border border-emerald-500/30"
                                        >
                                            Punto A
                                        </Button>
                                        <Button 
                                            onClick={() => handleSetPortRoute('STI', 'B')}
                                            className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-600/70 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-emerald-900/20"
                                        >
                                            Punto B
                                        </Button>
                                    </div>
                                </div>
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

                            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest pt-2 border-b pb-2 flex justify-between items-center">
                                <span>Desglose de Pórticos ({crossedTolls.length})</span>
                                <span className="text-[10px] font-bold opacity-50 text-right">Matrices AVO: {avoMatrix.length}</span>
                            </h3>
                            
                            <div className="space-y-2 pb-10">
                                 {crossedTolls.map((t, idx) => (
                                    <div key={idx} className={`bg-background border rounded-lg p-3 hover:border-orange-500/30 transition-colors shadow-sm relative overflow-hidden group ${t.isAvo ? 'bg-orange-50/50 border-orange-200' : ''}`}>
                                        <div 
                                            className="absolute left-0 top-0 bottom-0 w-1" 
                                            style={{ backgroundColor: t.color === 'yellow' ? '#fbbf24' : t.color.includes('red') ? '#ef4444' : t.color.includes('amber') ? '#f59e0b' : t.color.includes('blue') ? '#3b82f6' : t.color.includes('orange') ? '#f97316' : '#22c55e' }}
                                        />
                                        <div className="flex justify-between items-start pl-2">
                                            <div className="space-y-1">
                                                <div className="font-bold text-sm tracking-tight leading-none uppercase">{t.name}</div>
                                                <div className="text-[10px] font-bold text-muted-foreground flex gap-1 items-center">
                                                    <span className={t.isAvo ? 'text-yellow-700' : ''}>{t.reference_code}</span>
                                                    <span>&bull;</span>
                                                    <span style={{ color: t.color === 'yellow' ? '#a16207' : t.color.includes('amber') ? '#d97706' : t.color.includes('red') ? '#ef4444' : t.color.includes('blue') ? '#3b82f6' : t.color.includes('orange') ? '#ea580c' : '#16a34a' }}>{t.tag}</span>
                                                </div>
                                                {t.debug && (
                                                    <div className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 font-mono">
                                                        {t.debug}
                                                    </div>
                                                )}
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
