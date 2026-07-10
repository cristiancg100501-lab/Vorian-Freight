import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';
const TRAIN_THRESHOLD = 10;

export async function GET() {
  // Consultar conteo de logs en paralelo con el health check del motor
  const [healthResult, countsResult] = await Promise.allSettled([
    fetch(`${ML_ENGINE_URL}/health`, {
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    }),
    supabaseAdmin
      .from('pricing_ml_logs')
      .select('was_customer_accepted', { count: 'exact' }),
  ]);

  // ML Engine health
  let online = false;
  let model_loaded = false;
  let conversion_model_loaded = false;

  if (healthResult.status === 'fulfilled' && healthResult.value.ok) {
    const data = await healthResult.value.json();
    online = true;
    model_loaded = data.model_loaded ?? false;
    conversion_model_loaded = data.conversion_model_loaded ?? false;
  }

  // Conteo de cotizaciones
  let total_quoted = 0;
  let total_accepted = 0;

  if (countsResult.status === 'fulfilled' && !countsResult.value.error) {
    const rows = countsResult.value.data || [];
    total_quoted = rows.length;
    total_accepted = rows.filter((r: any) => r.was_customer_accepted === true).length;
  }

  const progress_to_train = Math.min(total_accepted, TRAIN_THRESHOLD);
  const next_train_at = model_loaded
    ? Math.ceil(total_accepted / TRAIN_THRESHOLD) * TRAIN_THRESHOLD + TRAIN_THRESHOLD
    : TRAIN_THRESHOLD;

  return NextResponse.json({
    online,
    model_loaded,
    conversion_model_loaded,
    total_quoted,
    total_accepted,
    progress_to_train,
    train_threshold: TRAIN_THRESHOLD,
    next_train_at,
  });
}
