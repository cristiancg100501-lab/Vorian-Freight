import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ArrivalEmailTemplate } from '@/components/email/arrival-template';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, clientName, shipmentId, destinationAddress, driverName, vehiclePlate } = body;

        if (!email) {
            return NextResponse.json({ error: 'Falta el correo de destino' }, { status: 400 });
        }

        const fallbackName = clientName || 'Cliente de Pruebas';
        const fallbackId = shipmentId || 'TEST-98765432';
        const fallbackAddress = destinationAddress || 'Bodega Principal, Santiago, Chile';

        const { data, error } = await resend.emails.send({
            from: 'Vorian Logistics <info@vorianglobal.com>',
            to: [email],
            subject: `🚨 Aviso de Llegada: Su carga #${fallbackId.substring(0, 8)} está por arribar`,
            react: ArrivalEmailTemplate({
                clientName: fallbackName,
                shipmentId: fallbackId,
                destinationAddress: fallbackAddress,
                driverName: driverName || "Rodrigo M. (Prueba)",
                vehiclePlate: vehiclePlate || "TEST-123"
            })
        });

        if (error) {
            console.error("Resend Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Correo de prueba enviado con éxito a ${email}` }, { status: 200 });

    } catch (error: any) {
        console.error("Testing Mail Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
