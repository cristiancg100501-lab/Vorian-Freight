import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';
const TRAIN_THRESHOLD = 10; // Entrenar cuando haya al menos N aceptadas

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { log_id, quoted_at } = body;

    if (!log_id) {
      return NextResponse.json({ error: 'Missing log_id' }, { status: 400 });
    }

    const acceptedAt = new Date();
    const timeToDecisionSecs = quoted_at
      ? Math.round((acceptedAt.getTime() - new Date(quoted_at).getTime()) / 1000)
      : null;

    // 1. Marcar el log como aceptado por el cliente
    const { error: updateError } = await supabaseAdmin
      .from('pricing_ml_logs')
      .update({ 
          status: 'reserved',
          accepted_at: acceptedAt.toISOString(),
          was_customer_accepted: true,
          time_to_decision_secs: timeToDecisionSecs,
      })
      .eq('id', log_id);

    if (updateError) {
        console.error("Error actualizando status de reserva en ML Log:", updateError);
        throw updateError;
    }

    // 2. Contar cuántas reservas aceptadas hay en total
    const { count: acceptedCount } = await supabaseAdmin
      .from('pricing_ml_logs')
      .select('id', { count: 'exact', head: true })
      .eq('was_customer_accepted', true);

    const totalAccepted = acceptedCount || 0;

    // 3. Trigger automático de reentrenamiento cada TRAIN_THRESHOLD nuevas aceptadas
    let trainResult = null;
    if (totalAccepted >= TRAIN_THRESHOLD && totalAccepted % TRAIN_THRESHOLD === 0) {
      console.log(`🤖 Umbral de entrenamiento alcanzado (${totalAccepted} aceptadas). Disparando reentrenamiento...`);
      try {
        const trainRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/ml-train`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggered_by: 'auto', accepted_count: totalAccepted }),
          signal: AbortSignal.timeout(30000),
        });
        if (trainRes.ok) {
          trainResult = await trainRes.json();
          console.log('✅ Reentrenamiento completado:', trainResult);
        }
      } catch (e) {
        console.warn('⚠️ No se pudo disparar el reentrenamiento automático:', e);
      }
    }

    return NextResponse.json({ 
      success: true,
      time_to_decision_secs: timeToDecisionSecs,
      accepted_count: totalAccepted,
      train_triggered: trainResult !== null,
      train_result: trainResult,
    });

  } catch (error: any) {
    console.error('Error en Pricing Accept:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
