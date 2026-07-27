import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as turf from '@turf/turf';
import { ArrivalEmailTemplate } from '@/components/email/arrival-template';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Radio de detección para geocerca (en metros)
const GEOFENCE_RADIUS_METERS = 500;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, table, record } = body;

        if (table !== 'driverProfiles' || type !== 'UPDATE') {
            return NextResponse.json({ message: 'Ignored: Not a driver profile update' }, { status: 200 });
        }

        const driverId = record.id;
        let driverLat = record.currentLatitude;
        let driverLng = record.currentLongitude;

        if (!driverLat || !driverLng) {
            return NextResponse.json({ message: 'No coordinates found' }, { status: 200 });
        }

        driverLat = typeof driverLat === 'string' ? parseFloat(driverLat) : driverLat;
        driverLng = typeof driverLng === 'string' ? parseFloat(driverLng) : driverLng;

        // 1. Encontrar el Envío Activo asociado a este chofer
        const { data: shipment, error: loadError } = await supabase
            .from('shipments')
            .select(`
                id, 
                status, 
                clientId, 
                customer_id,
                driverId,
                carrierId,
                originAddress,
                destinationAddress,
                pickup_latitude,
                pickup_longitude,
                delivery_latitude,
                delivery_longitude,
                details
            `)
            .or(`driverId.eq.${driverId},carrierId.eq.${driverId}`)
            .in('status', ['ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF'])
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (loadError || !shipment) {
            return NextResponse.json({ message: 'No active shipment found for driver' }, { status: 200 });
        }

        // Obtener ID del cliente (mandante)
        const clientId = shipment.clientId || shipment.customer_id;
        if (!clientId) {
            return NextResponse.json({ message: 'No client associated with shipment' }, { status: 200 });
        }

        // Obtener datos del perfil del cliente (email y nombre)
        const { data: clientUser } = await supabase
            .from('userProfiles')
            .select('email, firstName, lastName, name')
            .eq('id', clientId)
            .maybeSingle();

        let clientEmail = clientUser?.email;
        const clientName = clientUser?.firstName 
            ? `${clientUser.firstName} ${clientUser.lastName || ''}`.trim() 
            : (clientUser?.name || 'Cliente Vorian');

        if (!clientEmail) {
            const { data: authUser } = await supabase.auth.admin.getUserById(clientId);
            clientEmail = authUser?.user?.email;
        }

        if (!clientEmail) {
            return NextResponse.json({ message: 'Client has no email configured' }, { status: 200 });
        }

        // Obtener datos del chofer para el correo
        const { data: driverData } = await supabase
            .from('driverProfiles')
            .select('vehiclePlate, id')
            .eq('id', driverId)
            .single();
        
        const { data: driverUser } = await supabase
            .from('userProfiles')
            .select('firstName, lastName')
            .eq('id', driverId)
            .single();

        const driverFullName = driverUser?.firstName ? `${driverUser.firstName} ${driverUser.lastName || ''}`.trim() : 'Asignado';

        const driverPoint = turf.point([driverLng, driverLat]);
        const status = shipment.status;
        const details = shipment.details || {};

        let triggerEmailType: 'pickup_arrival' | 'delivery_arrival' | null = null;
        let targetAddress = '';

        // --- EVALUAR GEOFENCE DE RECOGIDA (PICKUP) ---
        const pickupStates = ['ACCEPTED', 'EN_ROUTE_TO_PICKUP'];
        let pickLng = shipment.pickup_longitude;
        let pickLat = shipment.pickup_latitude;
        if (!pickLng && details.originCoords) {
            pickLng = details.originCoords.lng ?? details.originCoords.longitude;
            pickLat = details.originCoords.lat ?? details.originCoords.latitude;
        }

        if (pickupStates.includes(status) && pickLng && pickLat) {
            const pickupPoint = turf.point([pickLng, pickLat]);
            const distPickupMeters = turf.distance(driverPoint, pickupPoint, { units: 'kilometers' }) * 1000;

            if (distPickupMeters <= GEOFENCE_RADIUS_METERS && !details.pickup_arrival_email_sent) {
                triggerEmailType = 'pickup_arrival';
                targetAddress = shipment.originAddress || 'Punto de recogida';
            }
        }

        // --- EVALUAR GEOFENCE DE ENTREGA (DELIVERY) ---
        const deliveryStates = ['IN_TRANSIT', 'ARRIVED_AT_PICKUP'];
        if (!triggerEmailType && deliveryStates.includes(status)) {
            let destLng = shipment.delivery_longitude;
            let destLat = shipment.delivery_latitude;

            if (!destLng && details.destinationCoords) {
                destLng = details.destinationCoords.lng ?? details.destinationCoords.longitude;
                destLat = details.destinationCoords.lat ?? details.destinationCoords.latitude;
            }

            if (destLng && destLat) {
                const deliveryPoint = turf.point([destLng, destLat]);
                const distDeliveryMeters = turf.distance(driverPoint, deliveryPoint, { units: 'kilometers' }) * 1000;

                if (distDeliveryMeters <= GEOFENCE_RADIUS_METERS && !details.delivery_arrival_email_sent) {
                    triggerEmailType = 'delivery_arrival';
                    targetAddress = shipment.destinationAddress || 'Punto de entrega';
                }
            }
        }

        if (!triggerEmailType) {
            return NextResponse.json({ message: 'Driver updated, outside geofence radius or notification already sent.' }, { status: 200 });
        }

        // --- DISPARAR EMAIL VÍA RESEND Y NOTIFICACIÓN IN-APP ---
        const resendApiKey = process.env.RESEND_API_KEY;
        const shipmentCode = shipment.id.substring(0, 8);

        const isPickup = triggerEmailType === 'pickup_arrival';
        const subject = isPickup
            ? `🚨 ¡El camión está cerca del origen! (Envío #${shipmentCode})`
            : `🚨 ¡El camión está cerca del destino! (Envío #${shipmentCode})`;

        const notifTitle = isPickup ? `🚛 Camión cerca del punto de recogida` : `🏁 Camión cerca del punto de entrega`;
        const notifMsg = isPickup
            ? `El transportista está a menos de 500 metros del origen (${targetAddress}). Aliste la carga y el PIN de recogida.`
            : `El transportista está a menos de 500 metros del destino (${targetAddress}). Aliste la recepción y el PIN de entrega.`;

        // 1. Insertar notificación In-App
        await supabase.from('notifications').insert({
            userId: clientId,
            title: notifTitle,
            message: notifMsg,
            type: 'geofence',
            shipmentId: shipment.id,
            read: false
        });

        // 2. Enviar Correo vía Resend
        if (resendApiKey) {
            const resend = new Resend(resendApiKey);

            await resend.emails.send({
                from: 'Vorian Freight <info@vorianglobal.com>',
                to: [clientEmail],
                subject: subject,
                react: ArrivalEmailTemplate({
                    clientName: clientName,
                    shipmentId: shipment.id,
                    destinationAddress: targetAddress,
                    driverName: driverFullName,
                    vehiclePlate: driverData?.vehiclePlate || 'S/P'
                })
            });
        }

        // 3. Marcar en BD para no duplicar correos por esta misma llegada
        const updatedDetails = {
            ...details,
            ...(isPickup ? { pickup_arrival_email_sent: true } : { delivery_arrival_email_sent: true })
        };

        await supabase
            .from('shipments')
            .update({ details: updatedDetails })
            .eq('id', shipment.id);

        return NextResponse.json({
            success: true,
            type: triggerEmailType,
            message: `Notificación y correo de aproximación enviado a ${clientEmail}`
        }, { status: 200 });

    } catch (error: any) {
        console.error("Geofence Webhook Error:", error.message);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
