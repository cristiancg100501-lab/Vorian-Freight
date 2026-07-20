import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    // 1. Obtener TODOS los logs de pricing (aceptados Y rechazados)
    //    Los rechazados = quoted_at existente y was_customer_accepted = false
    const { data: logs, error: fetchError } = await supabaseAdmin
      .from('pricing_ml_logs')
      .select(`
        distance_km, duration_hrs, terrain_factor, weight_factor,
        hour_of_day, day_of_week, utilization_rate, demand_pressure,
        month_of_year, customer_trip_count,
        lead_time_hrs, weather_severity, zonal_concentration,
        is_hazardous, is_overweight,
        offered_price, time_to_decision_secs,
        was_customer_accepted, was_carrier_accepted,
        factor_ml, commission_pct
      `)
      .order('created_at', { ascending: false })
      .limit(2000); // Últimas 2000 cotizaciones

    if (fetchError) throw fetchError;
    if (!logs || logs.length === 0) {
      return NextResponse.json({ status: 'skipped', reason: 'No hay logs de pricing disponibles.' });
    }

    // 2. Preparar datos para el entrenamiento:
    //    - Para logs aceptados: target_factor = factor_ml (lo que funcionó), target_commission = commission_pct
    //    - Para logs rechazados: no tienen target_factor/target_commission (el modelo de conversión los usa para aprender qué NO funcionó)
    const trainingData = logs.map((log: any) => ({
      distance_km: log.distance_km || 0,
      duration_hrs: log.duration_hrs || 0,
      terrain_factor: log.terrain_factor || 1,
      weight_factor: log.weight_factor || 1,
      hour_of_day: log.hour_of_day || 12,
      day_of_week: log.day_of_week || 1,
      utilization_rate: log.utilization_rate || 0,
      demand_pressure: log.demand_pressure || 0,
      month_of_year: log.month_of_year || new Date().getMonth() + 1,
      customer_trip_count: log.customer_trip_count || 0,
      offered_price: log.offered_price || 0,
      time_to_decision_secs: log.time_to_decision_secs || null,
      was_customer_accepted: log.was_customer_accepted || false,
      was_carrier_accepted: log.was_carrier_accepted || false,
      lead_time_hrs: log.lead_time_hrs || 24.0,
      weather_severity: log.weather_severity || 0,
      zonal_concentration: log.zonal_concentration || 0.0,
      is_hazardous: log.is_hazardous || false,
      is_overweight: log.is_overweight || false,
      // Solo presentes en registros aceptados
      target_factor: log.was_customer_accepted ? ((log.factor_ml || 1.0) * (log.factor_market || 1.0)) : null,
      target_commission: log.was_customer_accepted ? (log.commission_pct || 0.10) : null,
    }));

    const acceptedCount = trainingData.filter(d => d.was_customer_accepted).length;
    const rejectedCount = trainingData.length - acceptedCount;

    // 3. Enviar al motor FastAPI
    const mlResponse = await fetch(`${ML_ENGINE_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: trainingData }),
      signal: AbortSignal.timeout(60000), // 60s para entrenar
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      throw new Error(`ML Engine error ${mlResponse.status}: ${errText}`);
    }

    const result = await mlResponse.json();

    return NextResponse.json({
      success: true,
      total_records: trainingData.length,
      accepted_used: acceptedCount,
      rejected_used: rejectedCount,
      ml_result: result,
    });

  } catch (error: any) {
    console.error('Error en ML Train:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
