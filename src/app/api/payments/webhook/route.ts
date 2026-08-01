import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabase-admin';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || url.searchParams.get('topic');
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    if (!id || type !== 'payment') {
      return NextResponse.json({ status: 'ignored' });
    }

    const payment = new Payment(client);
    const paymentData = await payment.get({ id });
    
    // El external_reference contiene el shipmentId que definimos al crear la preferencia
    const shipmentId = paymentData.external_reference;
    const paymentStatus = paymentData.status; // 'approved', 'rejected', etc.

    if (shipmentId && paymentStatus) {
      
      const updateData: any = {
        payment_status: paymentStatus
      };
      
      // Si el pago es aprobado, avanzamos el estado del envío para que los choferes lo vean
      if (paymentStatus === 'approved') {
        updateData.status = 'published';
      }

      await supabaseAdmin
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Error procesando webhook de MercadoPago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
