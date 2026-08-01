import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '', 
  options: { timeout: 5000 } 
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, issuer_id, payment_method_id, transaction_amount, installments, payer, shipmentId } = body;

    if (!token || !transaction_amount || !payer || !shipmentId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const payment = new Payment(client);
    
    // Crear el cobro directo (Payment Bricks envía el token tokenizado del frontend)
    const response = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount),
        token: token,
        description: `Pago por Envío #${shipmentId.substring(0, 8)} - Vorian`,
        installments: Number(installments || 1),
        payment_method_id: payment_method_id,
        issuer_id: issuer_id,
        external_reference: shipmentId,
        payer: {
          email: payer.email,
          identification: payer.identification
        }
      },
      requestOptions: {
        idempotencyKey: crypto.randomUUID()
      }
    });

    if (response.status === 'approved') {
      // Actualizamos inmediatamente el estado a 'published'
      await supabaseAdmin
        .from('shipments')
        .update({ 
          payment_id: response.id?.toString(),
          payment_status: 'approved',
          status: 'published'
        })
        .eq('id', shipmentId);
    } else {
      // Guardar status pendiente o rechazado
      await supabaseAdmin
        .from('shipments')
        .update({ 
          payment_id: response.id?.toString(),
          payment_status: response.status
        })
        .eq('id', shipmentId);
    }

    return NextResponse.json({ 
      id: response.id, 
      status: response.status, 
      status_detail: response.status_detail 
    });

  } catch (error: any) {
    console.error('Error al procesar pago con MercadoPago:', error);
    return NextResponse.json({ error: 'Error interno del servidor procesando el pago' }, { status: 500 });
  }
}
