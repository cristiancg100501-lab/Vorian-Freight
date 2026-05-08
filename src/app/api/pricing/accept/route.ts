import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { log_id } = body;

    if (!log_id) {
      return NextResponse.json({ error: 'Missing log_id' }, { status: 400 });
    }

    // Actualizar el estado del log a 'reserved' para cerrar el ciclo de aprendizaje
    const { error: updateError } = await supabaseAdmin
      .from('pricing_ml_logs')
      .update({ 
          status: 'reserved',
          accepted_at: new Date().toISOString()
      })
      .eq('id', log_id);

    if (updateError) {
        console.error("Error actualizando status de reserva en ML Log:", updateError);
        throw updateError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error en Pricing Accept:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
