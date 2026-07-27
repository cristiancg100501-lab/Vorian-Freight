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
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 20px; border: 1px solid #27272a; overflow: hidden; color: #ffffff;">
          <div style="background-color: #09090b; padding: 28px 32px; border-bottom: 1px solid #27272a; text-align: left;">
            <img src="https://www.vorianglobal.com/vorianwhite.png" alt="Vorian Global" height="34" style="height: 34px; width: auto; display: block;" />
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0;">Hola, ${clientName}</h2>
            <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
              ${notifMessage}
            </p>
            <div style="background-color: #09090b; border-radius: 14px; padding: 20px; margin: 24px 0; border: 1px solid #27272a;">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 1px;">Detalles de la Operación</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #ffffff;"><strong>Código:</strong> #${shipmentCode}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #d4d4d8;"><strong>Origen:</strong> ${shipment.originAddress || 'N/A'}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #d4d4d8;"><strong>Destino:</strong> ${shipment.destinationAddress || 'N/A'}</p>
              <p style="margin: 0; font-size: 14px; color: #10b981;"><strong>Estado Actual:</strong> ${statusText}</p>
            </div>
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://www.vorianglobal.com/client/shipments/${shipmentId}" 
                 style="background-color: #10b981; color: #000000; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; display: inline-block;">
                Ver Estado en Vivo ➔
              </a>
            </div>
          </div>
          <div style="background-color: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #27272a;">
            © 2026 Vorian Global SpA — Plataforma de Transporte Logístico B2B
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
