import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { latLngToCell, gridDisk } from 'h3-js';

// URL del microservicio FastAPI (asumimos que corre en el puerto 8000 localmente)
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        pickup_region, delivery_region, pickup_address, delivery_address,
        elevation_diff, distance_meters, duration_mins, vehicle_type, 
        container_status, weight_kgs, route_geometry,
        service_mode, cargo_units, weather_condition,
        special_handling, accessorials,
        pickup_date, pickup_window,
        customer_id, is_asap
    } = body;

    // 0. Fetch regional diesel price from 'combustibles' table
    let dynamicDieselPrice: number | null = null;
    if (pickup_region) {
        try {
            const { data: fuelData } = await supabaseAdmin
                .from('combustibles')
                .select('precio_por_litro')
                .eq('tipo_combustible', 'petroleo_diesel')
                .eq('region_nombre', pickup_region)
                .order('anio', { ascending: false })
                .order('mes', { ascending: false })
                .limit(1)
                .single();

            if (fuelData && fuelData.precio_por_litro) {
                // Parse it just in case it's stored as string or float
                const rawPrice = fuelData.precio_por_litro;
                dynamicDieselPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat((rawPrice || "0").toString().replace(',', '.'));
                console.log(`⛽ Precio Diésel Dinámico para ${pickup_region}: $${dynamicDieselPrice}`);
            }
        } catch (e) {
            console.warn(`No se pudo obtener precio del diésel para ${pickup_region}`, e);
        }
    }

    // 1. Llamar al Supabase RPC (Precio Real/Operativo)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_vorian_price', {
        params: {
            p_km: (distance_meters || 0) / 1000,
            p_minutes: duration_mins || 0,
            p_vehicle_type: vehicle_type || 'camion_3_4',
            p_service_mode: service_mode || 'exclusive',
            p_cargo_units: cargo_units || 1,
            p_route_geometry: route_geometry,
            p_diesel_price: dynamicDieselPrice
        }
    });

    if (rpcError) throw rpcError;
    if (rpcData.error) throw new Error(rpcData.error);

    // Fallbacks para soportar tanto la v4.0 como la v5.0 del RPC
    const rpcSubtotal = rpcData.subtotal ?? rpcData.subtotal_base ?? 0;
    const rpcCommission = rpcData.commission ?? (rpcData.total ? rpcData.total - rpcSubtotal : 0);
    const tollsCost = rpcData.tolls_cost ?? 0;

    let basePrice = rpcSubtotal + rpcCommission; // Precio base antes de peajes
    const distanceKm = rpcData.factors?.distance_total ?? ((distance_meters || 0) / 1000) * 2;
    const durationHrs = (duration_mins || 0) / 60;
    const terrainFactor = rpcData.factors?.terrain_factor ?? 1.0;
    const weightFactor = rpcData.factors?.weight_factor ?? 1.0;

    // --- LTL Discount & Accessorials Cost ---
    if (service_mode === 'LTL') {
        basePrice = basePrice * 0.70; // 30% descuento por consolidación
    }

    let accessorialsTotal = 0;
    // Customer UI accessorials
    if (special_handling?.requiresTarp) accessorialsTotal += 15000;
    if (accessorials?.forklift) accessorialsTotal += 50000;
    if (accessorials?.driverAssistance) accessorialsTotal += 30000;
    if (accessorials?.palletExchange) accessorialsTotal += 10000;
    if (accessorials?.liftGate) accessorialsTotal += 40000;

    // Cliente UI accessorials (ahora se sumarán AL FINAL de la matemática)
    if (accessorials?.portGateFee) accessorialsTotal += 15000;
    if (accessorials?.extraStop) accessorialsTotal += 25000;
    if (accessorials?.warehouseWait) accessorialsTotal += 20000;

    // 2. Determinar Factor de Mercado Heurístico (Tráfico, Clima y Demanda)
    let factorMarket = 1.0;
    
    const santiagoFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour: 'numeric', hour12: false });
    let currentHour = parseInt(santiagoFormatter.format(new Date()), 10);
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', weekday: 'short' });
    const shortDay = dayFormatter.format(new Date());
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    let currentDay = dayMap[shortDay] ?? new Date().getDay();

    if (pickup_date) {
        const pd = new Date(pickup_date);
        const pdFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', weekday: 'short' });
        currentDay = dayMap[pdFormatter.format(pd)] ?? pd.getDay();
    }
    
    if (pickup_window && pickup_window.includes(':')) {
        // Parse window like "5:00 PM - 9:00 PM"
        try {
            const timePart = pickup_window.split('-')[0].trim();
            const parts = timePart.split(' ');
            if (parts.length >= 1) {
                const [time, ampm] = parts;
                const [hourStr] = time.split(':');
                let parsedHour = parseInt(hourStr, 10);
                if (ampm && ampm.toUpperCase() === 'PM' && parsedHour < 12) parsedHour += 12;
                if (ampm && ampm.toUpperCase() === 'AM' && parsedHour === 12) parsedHour = 0;
                if (!isNaN(parsedHour)) {
                    currentHour = parsedHour;
                }
            }
        } catch (e) {}
    }

    // a) Recargo por Urgencia (Lead Time Surge)
    let leadTimeSurge = 0;
    if (is_asap) {
        leadTimeSurge = 0.20; // +20% for ASAP
    } else if (pickup_date) {
        const pd = new Date(pickup_date);
        const nowMs = Date.now();
        const diffHrs = (pd.getTime() - nowMs) / (1000 * 60 * 60);
        if (diffHrs < 12 && diffHrs > 0) {
            leadTimeSurge = 0.15; // +15%
        } else if (diffHrs > 72) {
            leadTimeSurge = -0.05; // -5%
        }
    }
    factorMarket += leadTimeSurge;

    // a.2) Recargo por Horario (Night/Weekend)
    let timeSurge = 0;
    if (currentDay === 0 || currentDay === 6) {
        timeSurge += 0.10; // Fines de semana
    }
    if (currentHour >= 22 || currentHour < 5) {
        timeSurge += 0.15; // Nocturno
    }
    factorMarket += timeSurge;
    
    // b) Zonas de Alta Demanda Dinámicas (Geocerca H3 - Últimos 45 min)
    let pickup_lat = null;
    let pickup_lng = null;
    let pickup_h3_hexes: string[] = [];
    
    if (route_geometry && route_geometry.coordinates && route_geometry.coordinates.length > 0) {
        pickup_lng = route_geometry.coordinates[0][0];
        pickup_lat = route_geometry.coordinates[0][1];
        
        // Calcular hexágono central (resolución 7 = ~5.1 km2) y su anillo inmediato
        const centerHex = latLngToCell(pickup_lat, pickup_lng, 7);
        pickup_h3_hexes = gridDisk(centerHex, 1);
    }
    
    let highDemandShipmentsCount = 0;
    try {
        const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
        const { data: recentShipments } = await supabaseAdmin
            .from('shipments')
            .select('id, origin, pickup_latitude, pickup_longitude')
            .gte('createdAt', fortyFiveMinsAgo);
            
        if (recentShipments && pickup_h3_hexes.length > 0) {
            highDemandShipmentsCount = recentShipments.filter((s: any) => {
                let lat = s.pickup_latitude;
                let lng = s.pickup_longitude;
                
                // Decode WKB Hex string into lat/lng if available and lat/lng are missing
                if (!lat && !lng && s.origin && typeof s.origin === 'string' && !s.origin.startsWith('POINT')) {
                    try {
                        const buf = Buffer.from(s.origin, 'hex');
                        const isLittleEndian = buf[0] === 1;
                        let offset = 1;
                        const type = isLittleEndian ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
                        offset += 4;
                        if (type & 0x20000000) offset += 4; // skip SRID
                        lng = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
                        offset += 8;
                        lat = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
                    } catch(e) {}
                }

                if (!lat && s.origin && s.origin.includes('POINT')) {
                    const match = s.origin.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
                    if (match) {
                        lng = parseFloat(match[1]);
                        lat = parseFloat(match[2]);
                    }
                }
                if (lat && lng) {
                    const hex = latLngToCell(lat, lng, 7);
                    return pickup_h3_hexes.includes(hex);
                }
                return false;
            }).length;
        }
        
        // Fórmula Auto-Calibrable de Demanda Zonal:
        // No asume un número fijo de envíos (como 50 o 200). 
        // Compara el volumen en este polígono (local) contra el volumen de TODO el país (global) en los últimos 45 mins.
        const totalPlatformShipments = recentShipments?.length || 1;
        
        if (highDemandShipmentsCount >= 2) {
            // 1. Concentración: Qué porcentaje del tráfico nacional está ocurriendo SOLO en este hexágono
            const concentration = highDemandShipmentsCount / totalPlatformShipments;
            
            // 2. Puntaje Dinámico: Multiplica el volumen absoluto por la concentración.
            // Si hay 5 envíos en todo el país y 5 acá -> Score = 5 * 1.0 = 5
            // Si hay 500 envíos en el país y 50 acá -> Score = 50 * 0.1 = 5
            // Si hay 500 envíos en el país y 150 acá -> Score = 150 * 0.3 = 45 (Zona hirviendo)
            const dynamicScore = highDemandShipmentsCount * concentration;
            
            // 3. Mapeo a tarifa (Máximo +30% de recargo cuando el score llega a 15)
            const zonalSurge = Math.min((dynamicScore / 15) * 0.30, 0.30);
            factorMarket += zonalSurge;
            
            console.log(`🔥 AUTO-CALIBRACIÓN ZONAL: ${highDemandShipmentsCount}/${totalPlatformShipments} fletes (${(concentration*100).toFixed(0)}% del país). Score: ${dynamicScore.toFixed(1)}. Factor +${(zonalSurge * 100).toFixed(1)}%`);
        }

        // c.2) Penalización por Retorno Vacío (Deadhead)
        let deadheadPenalty = 0;
        if (route_geometry && route_geometry.coordinates && route_geometry.coordinates.length > 0) {
            const coords = route_geometry.coordinates;
            const dest_lng = coords[coords.length - 1][0];
            const dest_lat = coords[coords.length - 1][1];
            const destHex = latLngToCell(dest_lat, dest_lng, 7);
            const destHexes = gridDisk(destHex, 1);
            
            if (recentShipments) {
                const outboundFromDest = recentShipments.filter((s: any) => {
                    let lat = s.pickup_latitude;
                    let lng = s.pickup_longitude;
                    if (!lat && !lng && s.origin && typeof s.origin === 'string' && !s.origin.startsWith('POINT')) {
                        try {
                            const buf = Buffer.from(s.origin, 'hex');
                            const isLittleEndian = buf[0] === 1;
                            let offset = 1;
                            const type = isLittleEndian ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
                            offset += 4;
                            if (type & 0x20000000) offset += 4; // skip SRID
                            lng = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
                            offset += 8;
                            lat = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
                        } catch(e) {}
                    }
                    if (!lat && s.origin && s.origin.includes('POINT')) {
                        const match = s.origin.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
                        if (match) { lng = parseFloat(match[1]); lat = parseFloat(match[2]); }
                    }
                    if (lat && lng) {
                        const hex = latLngToCell(lat, lng, 7);
                        return destHexes.includes(hex);
                    }
                    return false;
                }).length;
                
                if (outboundFromDest === 0) {
                    deadheadPenalty = 0.15; // +15% penalty if no outbound traffic
                    console.log(`⚠️ DEADHEAD DETECTADO en destino. Recargo +15%.`);
                }
            }
        }
        factorMarket += deadheadPenalty;
    } catch (e) {
        console.warn('Error calculando zonas de alta demanda dinámicas', e);
    }

    // c) Factor Oferta-Demanda (Supply vs. Demand Real-Time — Fleet Utilization Model)
    let factorSupplyDemand = 0.0;
    let sdSnapshot: any = {};
    try {
        const now = new Date();
        const windowStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // últimos 30 min

        // Consultas en paralelo: conductores disponibles, envíos aceptados recientes y configuraciones
        const [driversResult, acceptedResult, settingsResult] = await Promise.all([
            supabaseAdmin
                .from('driverProfiles')
                .select('id, currentOrderId, currentLatitude, currentLongitude')
                .eq('isAvailable', true),

            // Demanda real: envíos ACEPTADOS (reservados) en los últimos 30 minutos
            supabaseAdmin
                .from('shipments')
                .select('id', { count: 'exact', head: true })
                .gte('createdAt', windowStart)
                .in('status', ['PENDING', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF']),

            // Sensibilidad configurada en settings
            supabaseAdmin
                .from('settings')
                .select('demandSensitivity')
                .eq('id', 'global')
                .single()
        ]);

        // Filtrar conductores por celda H3 (solo los que caen en el cluster de la carga)
        let freeDrivers = 0;
        let busyDrivers = 0;
        
        if (driversResult.data) {
            driversResult.data.forEach((d: any) => {
                let isNear = false;
                if (d.currentLatitude && d.currentLongitude && pickup_h3_hexes.length > 0) {
                    const driverHex = latLngToCell(d.currentLatitude, d.currentLongitude, 7);
                    if (pickup_h3_hexes.includes(driverHex)) {
                        isNear = true;
                    }
                }
                if (isNear) {
                    if (d.currentOrderId) busyDrivers++;
                    else freeDrivers++;
                }
            });
        }
        
        const totalFleet     = freeDrivers + busyDrivers;
        const recentAccepted = acceptedResult.count ?? 0;
        const demandSensitivity = settingsResult.data?.demandSensitivity ?? 0.05;

        // Tasa de utilización: % de la flota que ya está ocupada (0→1)
        const utilizationRate = busyDrivers / Math.max(totalFleet, 1);

        // Presión de demanda: envíos aceptados recientes por conductor libre disponible
        const demandPressure = recentAccepted / Math.max(freeDrivers, 1);

        // Fórmula combinada: 60% utilización de flota + 40% presión de demanda aceptada
        // Cap de seguridad: máximo +40%
        if (totalFleet > 0 || recentAccepted > 0) {
            factorSupplyDemand = Math.min(
                demandSensitivity * (utilizationRate * 0.6 + demandPressure * 0.4),
                0.40
            );
        }

        sdSnapshot = { freeDrivers, busyDrivers, totalFleet, utilizationRate: (utilizationRate * 100).toFixed(1) + '%', recentAccepted, factor: (factorSupplyDemand * 100).toFixed(1) + '%' };
        console.log(`📊 S&D → Libres: ${freeDrivers} | Ocupados: ${busyDrivers} | Utilización: ${(utilizationRate * 100).toFixed(0)}% | Aceptados 30min: ${recentAccepted} | Factor: +${(factorSupplyDemand * 100).toFixed(1)}%`);
    } catch (e) {
        console.warn('No se pudo calcular el factor oferta-demanda. Usando 0.', e);
    }

    factorMarket += factorSupplyDemand;

    // d) Factor Climático (Vorian Weather Surge)
    let factorWeather = 0.0;
    if (weather_condition) {
        const weather = weather_condition.toLowerCase();
        if (weather === 'snow') {
            factorWeather = 0.40; // +40% Riesgo extremo
        } else if (weather === 'thunderstorm') {
            factorWeather = 0.30; // +30% Tormenta
        } else if (['rain', 'drizzle'].includes(weather)) {
            factorWeather = 0.25; // +25% Lluvia (Frenado difícil)
        } else if (['fog', 'mist'].includes(weather)) {
            factorWeather = 0.15; // +15% Poca visibilidad
        } else if (weather === 'clouds') {
            factorWeather = 0.02; // +2% (Nublado normal, casi no afecta)
        }
        console.log(`🌧️ Clima detectado: ${weather_condition}. Factor Weather ajustado a: ${factorWeather}`);
    }

    // e) Riesgo Adicional (Materiales Peligrosos / Sobrepeso explícito)
    if (special_handling?.hazardous) factorMarket += 0.20;
    if (special_handling?.overweight) factorMarket += 0.30;

    // f) Programa de Lealtad (Customer Tier Discount)
    let loyaltyDiscount = 0;
    if (customer_id) {
        try {
            const { count } = await supabaseAdmin
                .from('shipments')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', customer_id);
                
            const trips = count || 0;
            if (trips >= 50) loyaltyDiscount = -0.08; // Gold (-8%)
            else if (trips >= 20) loyaltyDiscount = -0.04; // Silver (-4%)
            else if (trips >= 5) loyaltyDiscount = -0.02; // Bronze (-2%)
        } catch(e) { console.warn('Error fetching customer trips', e) }
    }
    factorMarket += loyaltyDiscount;

    // g) Límite de Seguridad (Surge Cap)
    // Para evitar espantar clientes, la tarifa base (1.0) nunca puede subir más de 45% ni bajar más de 10%
    if (factorMarket > 1.45) factorMarket = 1.45;
    if (factorMarket < 0.90) factorMarket = 0.90;

    // 3. Consultar al Modelo ML (FastAPI)
    let factorML = 1.0;
    try {
        const mlResponse = await fetch(`${ML_ENGINE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                distance_km: distanceKm,
                duration_hrs: durationHrs,
                terrain_factor: terrainFactor,
                weight_factor: weightFactor,
                hour_of_day: currentHour,
                day_of_week: currentDay
            }),
            signal: AbortSignal.timeout(2000)
        });
        
        if (mlResponse.ok) {
            const mlData = await mlResponse.json();
            factorML = mlData.factor_ml;
        } else {
            console.warn("ML Engine respondió con error:", mlResponse.status);
        }
    } catch (e) {
        console.warn("No se pudo conectar al ML Engine. Usando factorML = 1.0", e);
    }

    // 4. Calcular Precio Final (Base * IA * (Mkt + Weather)) + Accesorios + Peajes
    const totalMarketMultiplier = factorMarket + factorWeather;
    const finalPrice = (basePrice * factorML * totalMarketMultiplier) + accessorialsTotal + tollsCost;

    // 5. Registrar Cotización (Embudo)
    const { data: logData, error: logError } = await supabaseAdmin.from('pricing_ml_logs').insert({
        distance_km: distanceKm,
        duration_hrs: durationHrs,
        terrain_factor: terrainFactor,
        weight_factor: weightFactor,
        hour_of_day: currentHour,
        day_of_week: currentDay,
        base_price: basePrice,
        factor_ml: factorML,
        factor_market: totalMarketMultiplier,
        factor_supply_demand: factorSupplyDemand,
        offered_price: finalPrice,
        status: 'quoted'
    }).select('id').single();

    if (logError) {
        console.error("Error guardando ML Log:", logError);
    }

    // 6. Retornar al Cliente
    const priceWithoutTolls = finalPrice - tollsCost;
    const platformFee = priceWithoutTolls * 0.15; // 15% de comisión Vorian
    const carrierPayment = priceWithoutTolls - platformFee;
    
    // The base factorMarket starts at 1.0. We want to isolate the purely "market" (peak hours / hot zones) markup.
    // factorMarket already includes factorSupplyDemand (added at line 243).
    // So the pure market markup is factorMarket - factorSupplyDemand - 1.0
    const pureMarketMarkup = factorMarket - factorSupplyDemand - 1.0;
    const marketAdjustmentCost = basePrice * factorML * pureMarketMarkup;
    const weatherAdjustmentCost = basePrice * factorML * factorWeather;
    const supplyDemandAdjustmentCost = basePrice * factorML * factorSupplyDemand;

    return NextResponse.json({
        success: true,
        log_id: logData?.id || null,
        base_price: basePrice + tollsCost,
        final_price: finalPrice, 
        carrier_payment: carrierPayment,
        platform_fee: platformFee,
        breakdown: {
            base_freight: Math.round(rpcSubtotal),
            accessorials_total: Math.round(accessorialsTotal),
            market_adjustment: Math.round(marketAdjustmentCost),
            weather_adjustment: Math.round(weatherAdjustmentCost),
            tolls_cost: Math.round(tollsCost),
            supply_demand_adjustment: Math.round(supplyDemandAdjustmentCost)
        },
        factors: {
            ml_factor: factorML,
            market_factor: factorMarket,
            weather_factor: factorWeather,
            supply_demand_factor: factorSupplyDemand,
            rpc_factors: {
                ...rpcData.factors,
                terrain_factor: terrainFactor,
                weight_factor: weightFactor,
                distance_total: distanceKm
            }
        },
        tolls_cost: tollsCost
    });

  } catch (error: any) {
    console.error('Error en Pricing Optimizer:', error);
    return NextResponse.json({ error: error.message || 'Error interno calculando tarifa' }, { status: 500 });
  }
}
