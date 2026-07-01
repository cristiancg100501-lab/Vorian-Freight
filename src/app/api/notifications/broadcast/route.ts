import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

// Asegurar que Firebase Admin solo se inicialice una vez
if (!getApps().length) {
    try {
        const serviceAccountPath = path.join(process.cwd(), 'firebase-admin.json');
        
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

            initializeApp({
                credential: cert(serviceAccount)
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
        const { tokens, title, body: notificationBody, data } = body;

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return NextResponse.json({ error: 'Un array de FCM Tokens (tokens) es requerido' }, { status: 400 });
        }

        if (!getApps().length) {
            return NextResponse.json({ error: 'Firebase Admin no está inicializado en el servidor' }, { status: 500 });
        }

        // Multicast message for multiple tokens
        const message = {
            notification: {
                title,
                body: notificationBody,
            },
            data: data || {},
            tokens: tokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);
        
        return NextResponse.json({ 
            success: true, 
            successCount: response.successCount, 
            failureCount: response.failureCount 
        });
    } catch (error: any) {
        console.error('Error enviando notificación Push Masiva:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
