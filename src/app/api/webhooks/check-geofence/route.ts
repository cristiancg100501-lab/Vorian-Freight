import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as turf from '@turf/turf';
import { ArrivalEmailTemplate } from '@/components/email/arrival-template';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Security / Validate request comes from Supabase Webhook
        // (In a real production environment, you should verify a secret token here)

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

        // Parse to float just in case Supabase sends strings
        driverLat = typeof driverLat === 'string' ? parseFloat(driverLat) : driverLat;
        driverLng = typeof driverLng === 'string' ? parseFloat(driverLng) : driverLng;

        // 1. Encontrar el Envío Activo asociado a este chofer
        const { data: shipment, error: loadError } = await supabase
            .from('shipments')
            .select(`
                id, 
                status, 
                clientId, 
                carrierId,
                destinationAddress,
                details,
                userProfiles!shipment_client_fkey(email, fullName)
            `)
            .eq('carrierId', driverId)
            .in('status', ['Booked', 'In Transit'])
            .single();

        if (loadError || !shipment) {
            return NextResponse.json({ message: 'No active shipment found for driver' }, { status: 200 });
        }

        // 1.1 Obtener datos del chofer para el correo
        const { data: driverData } = await supabase
            .from('driverProfiles')
            .select('vehiclePlate, id')
            .eq('id', driverId)
            .single();
        
        const { data: driverUser } = await supabase
            .from('userProfiles')
            .select('fullName')
            .eq('id', driverId)
            .single();

        // Si ya enviamos el correo para esta carga, abortamos.
        if (shipment.details?.arrival_email_sent === true) {
            return NextResponse.json({ message: 'Arrival email already sent for this shipment' }, { status: 200 });
        }

        const destCoords = shipment.details?.destinationCoords;
        if (!destCoords || typeof destCoords.lat !== 'number' || typeof destCoords.lng !== 'number') {
            return NextResponse.json({ message: 'Shipment has no valid destination coordinates' }, { status: 200 });
        }

        // 2. Calcular la distancia usando Turf.js
        const driverPoint = turf.point([driverLng, driverLat]);
        const destPoint = turf.point([destCoords.lng, destCoords.lat]);
        
        const distanceKm = turf.distance(driverPoint, destPoint, { units: 'kilometers' });
        const distanceMeters = distanceKm * 1000;

        // 3. Evaluar Geocerca (300 metros)
        if (distanceMeters <= 300) {
            
            // 4. Enviar Correo Electrónico usando Resend
            const clientEmail = shipment.userProfiles?.email || 'admin@vorianglobal.com'; // Fallback a admin si no hay email
            const clientName = shipment.userProfiles?.fullName || 'Cliente de Vorian';
            
            try {
                const { data: emailData, error: emailError } = await resend.emails.send({
                    from: 'Vorian Logistics <info@vorianglobal.com>', // Usa el dominio verificado en Resend
                    to: [clientEmail],
                    subject: `🚨 Aviso de Llegada: Su carga #${shipment.id.substring(0, 8)} está por arribar`,
                    react: ArrivalEmailTemplate({
                        clientName: clientName,
                        shipmentId: shipment.id,
                        destinationAddress: shipment.destinationAddress,
                        driverName: driverUser?.fullName || 'Asignado',
                        vehiclePlate: driverData?.vehiclePlate || 'S/P'
                    })
                });

                if (emailError) {
                    console.error("Resend Error:", emailError);
                    return NextResponse.json({ error: 'Failed to send email via Resend' }, { status: 500 });
                }

                // 5. Marcar en Base de Datos que el correo fue enviado
                const updatedDetails = {
                    ...shipment.details,
                    arrival_email_sent: true
                };

                await supabase
                    .from('shipments')
                    .update({ details: updatedDetails })
                    .eq('id', shipment.id);

                return NextResponse.json({ 
                    success: true, 
                    message: `Email sent gracefully to ${clientEmail} (Distance: ${Math.round(distanceMeters)}m)` 
                }, { status: 200 });

            } catch (err) {
                console.error("Email processing failed:", err);
                return NextResponse.json({ error: 'Email processing failed' }, { status: 500 });
            }
        } else {
            return NextResponse.json({ 
                message: `Driver updated, but is too far (${Math.round(distanceMeters)}m away). No email sent.` 
            }, { status: 200 });
        }

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
