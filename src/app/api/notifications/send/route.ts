import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Asegurar que Firebase Admin solo se inicialice una vez
if (!admin.apps.length) {
    try {
        const serviceAccountPath = path.join(process.cwd(), 'firebase-admin.json');
        
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase Admin inicializado correctamente con firebase-admin.json');
        } else {
            console.warn('Advertencia: No se encontró firebase-admin.json en la raíz del proyecto.');
        }
    } catch (error) {
        console.error('Error al inicializar Firebase Admin:', error);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, title, body: notificationBody, data } = body;

        if (!token) {
            return NextResponse.json({ error: 'FCM Token es requerido' }, { status: 400 });
        }

        if (!admin.apps.length) {
            return NextResponse.json({ error: 'Firebase Admin no está inicializado en el servidor' }, { status: 500 });
        }

        const message = {
            notification: {
                title,
                body: notificationBody,
            },
            data: data || {},
            token: token,
        };

        const response = await admin.messaging().send(message);
        
        return NextResponse.json({ success: true, messageId: response });
    } catch (error: any) {
        console.error('Error enviando notificación Push:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
