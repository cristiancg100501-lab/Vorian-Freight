import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

// Mapeo de estados a nombres legibles en español
const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  EN_ROUTE_TO_PICKUP: 'En ruta a recogida',
  ARRIVED_AT_PICKUP: 'Llegada a origen (Punto de Recogida)',
  IN_TRANSIT: 'En tránsito a destino',
  ARRIVED_AT_DROPOFF: 'Llegada a destino (Punto de Entrega)',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shipmentId, newStatus, previousStatus } = body;

    if (!shipmentId || !newStatus) {
      return NextResponse.json({ error: 'shipmentId y newStatus son requeridos' }, { status: 400 });
    }

    // 1. Obtener detalles del envío, mandante y chofer
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
    }

    const clientId = shipment.clientId || shipment.customer_id;
    if (!clientId) {
      return NextResponse.json({ message: 'Envío no tiene cliente asociado' }, { status: 200 });
    }

    // 2. Obtener datos del perfil del cliente (email y nombre)
    const { data: clientProfile } = await supabaseAdmin
      .from('userProfiles')
      .select('email, firstName, lastName')
      .eq('id', clientId)
      .single();

    const clientEmail = clientProfile?.email;
    const clientName = clientProfile?.firstName 
      ? `${clientProfile.firstName} ${clientProfile.lastName || ''}`.trim() 
      : 'Cliente Vorian';

    const statusText = statusLabels[newStatus] || newStatus;
    const shipmentCode = shipmentId.substring(0, 8);

    // 3. Insertar notificación In-App en la tabla `notifications`
    const notifTitle = `Envío #${shipmentCode}: ${statusText}`;
    let notifMessage = `El estado de tu envío a ${shipment.destinationAddress || 'destino'} ha cambiado a ${statusText}.`;

    if (newStatus === 'ARRIVED_AT_PICKUP') {
      notifMessage = `🚚 ¡El camión ha llegado al origen! Entregue el PIN de recogida al conductor.`;
    } else if (newStatus === 'ARRIVED_AT_DROPOFF' || newStatus === 'DELIVERED') {
      notifMessage = `✅ ¡El camión ha llegado al destino! Confirme la recepción con el PIN de entrega.`;
    }

    await supabaseAdmin.from('notifications').insert({
      userId: clientId,
      title: notifTitle,
      message: notifMessage,
      type: 'status_change',
      shipmentId: shipmentId,
      read: false,
    });

    // 4. Enviar correo electrónico si aplica (Resend)
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;

    if (resendApiKey && clientEmail) {
      const resend = new Resend(resendApiKey);

      // Asunto según el estado
      let subject = `📦 Actualización de Envío #${shipmentCode}: ${statusText}`;
      if (newStatus === 'ARRIVED_AT_PICKUP') {
        subject = `🚛 ¡El camión llegó al origen! (Envío #${shipmentCode})`;
      } else if (newStatus === 'ARRIVED_AT_DROPOFF') {
        subject = `🏁 ¡El camión llegó a destino! (Envío #${shipmentCode})`;
      } else if (newStatus === 'DELIVERED') {
        subject = `✅ Envío #${shipmentCode} Entregado Exitosamente`;
      }

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 2px; text-transform: uppercase;">
              VORIAN <span style="color: #3b82f6;">FREIGHT</span>
            </h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0;">Hola, ${clientName}</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              ${notifMessage}
            </p>
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Detalles del Envío</p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e293b;"><strong>Código:</strong> #${shipmentCode}</p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e293b;"><strong>Origen:</strong> ${shipment.originAddress || 'N/A'}</p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e293b;"><strong>Destino:</strong> ${shipment.destinationAddress || 'N/A'}</p>
              <p style="margin: 0; font-size: 14px; color: #3b82f6;"><strong>Estado Actual:</strong> ${statusText}</p>
            </div>
            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/client/shipments/${shipmentId}" 
                 style="background-color: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; display: inline-block;">
                Ver Estado en Vivo
              </a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
            Vorian Freight SpA — Plataforma de Transporte Logístico B2B
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: 'Vorian Freight <info@vorianglobal.com>',
          to: [clientEmail],
          subject: subject,
          html: emailHtml,
        });
        emailSent = true;
      } catch (e) {
        console.error('Error al enviar email via Resend:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notificación e email procesados',
      emailSent,
      status: newStatus,
    });
  } catch (error: any) {
    console.error('Error en notify-status-change:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
