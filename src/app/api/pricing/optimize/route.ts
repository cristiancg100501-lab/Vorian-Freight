import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// URL del microservicio FastAPI (asumimos que corre en el puerto 8000 localmente)
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        pickup_region, delivery_region, elevation_diff, 
        distance_meters, duration_mins, vehicle_type, 
        container_status, weight_kgs, route_geometry,
        service_mode, cargo_units, weather_condition,
        special_handling, accessorials
    } = body;

    // 1. Llamar al Supabase RPC (Precio Real/Operativo)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_vorian_price', {
        params: {
            p_km: (distance_meters || 0) / 1000,
            p_minutes: duration_mins || 0,
            p_vehicle_type: vehicle_type || 'camion_3_4',
            p_service_mode: service_mode || 'exclusive',
            p_cargo_units: cargo_units || 1,
            p_route_geometry: route_geometry
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
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0: Sun, 1: Mon, ...

    // a) Hora Peak (17:00 a 19:00) -> +10%
    if (currentHour >= 17 && currentHour <= 19) {
        factorMarket += 0.10;
    }
    
    // b) Zona de alta demanda (San Antonio) -> +15%
    if ((pickup_region || '').toLowerCase().includes('san antonio') || (delivery_region || '').toLowerCase().includes('san antonio')) {
        factorMarket += 0.15;
    }

    // d) Factor Climático (Vorian Weather Surge)
    if (weather_condition) {
        const weather = weather_condition.toLowerCase();
        if (['rain', 'drizzle', 'thunderstorm'].includes(weather)) {
            factorMarket += 0.15; // +15%
        } else if (weather === 'snow') {
            factorMarket += 0.25; // +25%
        } else if (['clouds', 'fog', 'mist'].includes(weather)) {
            factorMarket += 0.10; // +10% (Agregado Clouds porque vi Nublado +10% en otra vista aunque aquí no sumaba)
        }
        console.log(`🌧️ Clima detectado: ${weather_condition}. Factor Market ajustado a: ${factorMarket}`);
    }

    // e) Riesgo Adicional (Materiales Peligrosos / Sobrepeso explícito)
    if (special_handling?.hazardous) factorMarket += 0.20;
    if (special_handling?.overweight) factorMarket += 0.30;

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

    // 4. Calcular Precio Final (Base * IA * Mkt) + Accesorios + Peajes
    const finalPrice = (basePrice * factorML * factorMarket) + accessorialsTotal + tollsCost;

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
        factor_market: factorMarket,
        offered_price: finalPrice,
        status: 'quoted'
    }).select('id').single();

    if (logError) {
        console.error("Error guardando ML Log:", logError);
    }

    // 6. Retornar al Cliente
    const priceWithoutTolls = finalPrice - tollsCost;
    const platformFee = priceWithoutTolls * 0.10; // 10% de comisión Vorian
    const carrierPayment = priceWithoutTolls - platformFee;

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
            market_adjustment: Math.round(finalPrice - rpcSubtotal - accessorialsTotal - tollsCost),
            tolls_cost: Math.round(tollsCost)
        },
        factors: {
            ml_factor: factorML,
            market_factor: factorMarket,
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
