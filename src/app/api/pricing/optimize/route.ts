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
        service_mode, cargo_units
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

    const basePrice = rpcSubtotal + rpcCommission; // Precio base antes de peajes
    const distanceKm = rpcData.factors?.distance_total ?? ((distance_meters || 0) / 1000) * 2;
    const durationHrs = (duration_mins || 0) / 60;
    const terrainFactor = rpcData.factors?.terrain_factor ?? 1.0;
    const weightFactor = rpcData.factors?.weight_factor ?? 1.0;

    // 2. Determinar Factor de Mercado Heurístico
    // Ejemplo de reglas simples que funcionan mientras el ML aprende
    let factorMarket = 1.0;
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0: Sun, 1: Mon, ...

    // Hora Peak (17:00 a 19:00) -> +10%
    if (currentHour >= 17 && currentHour <= 19) {
        factorMarket += 0.10;
    }
    
    // Zona de alta demanda (San Antonio) -> +15%
    if ((pickup_region || '').toLowerCase().includes('san antonio') || (delivery_region || '').toLowerCase().includes('san antonio')) {
        factorMarket += 0.15;
    }

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
            signal: AbortSignal.timeout(2000) // Timeout rápido para no bloquear la app si FastAPI está caído
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

    // 4. Calcular Precio Final
    const finalPrice = (basePrice * factorML * factorMarket) + tollsCost;

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
    return NextResponse.json({
        success: true,
        log_id: logData?.id || null,
        base_price: basePrice + tollsCost,
        final_price: finalPrice, 
        carrier_payment: rpcSubtotal,
        platform_fee: finalPrice - rpcSubtotal - tollsCost, // Todo el spread (ganancia + ajuste mercado)
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
