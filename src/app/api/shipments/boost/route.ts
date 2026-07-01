import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { shipmentId, boostAmount } = body;

        if (!shipmentId || !boostAmount || typeof boostAmount !== 'number' || boostAmount <= 0) {
            return NextResponse.json({ error: 'shipmentId y boostAmount (positivo) son requeridos' }, { status: 400 });
        }

        // 1. Obtener el envío actual
        const { data: shipment, error: fetchError } = await supabaseAdmin
            .from('shipments')
            .select('*')
            .eq('id', shipmentId)
            .single();

        if (fetchError || !shipment) {
            return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
        }

        // 2. Calcular nuevos precios (el 100% del boost va al transportista)
        const currentEstimatedPrice = Number(shipment.estimated_price || 0);
        const currentCarrierPayment = Number(shipment.carrier_payment || 0);
        const currentPriorityBoost = Number(shipment.priority_boost || 0);

        const newEstimatedPrice = currentEstimatedPrice + boostAmount;
        const newCarrierPayment = currentCarrierPayment + boostAmount;
        const newPriorityBoost = currentPriorityBoost + boostAmount;

        // 3. Actualizar la base de datos
        const { error: updateError } = await supabaseAdmin
            .from('shipments')
            .update({
                estimated_price: newEstimatedPrice,
                carrier_payment: newCarrierPayment,
                priority_boost: newPriorityBoost
            })
            .eq('id', shipmentId);

        if (updateError) {
            console.error("Error actualizando DB:", updateError);
            return NextResponse.json({ error: 'Error actualizando envío en base de datos' }, { status: 500 });
        }

        // 4. Buscar conductores online para notificar
        const { data: onlineDrivers } = await supabaseAdmin
            .from('userProfiles')
            .select('fcmToken')
            .not('fcmToken', 'is', null);
            // Idealmente cruzaríamos con driverProfiles.isAvailable, pero notificaremos a todos los que tengan token
            // o buscar de los driverProfiles activos
            
        const { data: activeDriverProfiles } = await supabaseAdmin
            .from('driverProfiles')
            .select('id')
            .eq('isAvailable', true);
            
        let targetTokens: string[] = [];
        
        if (onlineDrivers && activeDriverProfiles) {
            const activeDriverIds = activeDriverProfiles.map(d => d.id);
            // Notificar a usuarios que son conductores activos y tienen token
            const { data: validTokens } = await supabaseAdmin
                .from('userProfiles')
                .select('fcmToken')
                .in('id', activeDriverIds)
                .not('fcmToken', 'is', null);
                
            if (validTokens) {
                targetTokens = validTokens.map(t => t.fcmToken).filter(Boolean);
            }
        }

        // 5. Enviar Push Notification si hay conductores
        if (targetTokens.length > 0) {
            // Llamar a nuestra propia API de broadcast
            const host = req.headers.get('host');
            const protocol = host?.includes('localhost') ? 'http' : 'https';
            
            fetch(`${protocol}://${host}/api/notifications/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokens: targetTokens,
                    title: '🔥 ¡Bono Extra de Urgencia!',
                    body: `Un cliente ha sumado +$${boostAmount.toLocaleString('es-CL')} a un viaje pendiente. ¡Abre la app y tómalo antes que otro!`,
                    data: { shipmentId }
                })
            }).catch(e => console.error("Error enviando push en background:", e));
        }

        return NextResponse.json({ 
            success: true, 
            newPrice: newEstimatedPrice,
            newCarrierPayment: newCarrierPayment,
            boostAdded: boostAmount
        });

    } catch (error: any) {
        console.error('Error en Priority Boost:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
