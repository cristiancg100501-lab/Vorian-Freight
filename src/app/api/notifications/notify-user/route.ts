import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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
        const { userId, title, body: notificationBody, data } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
        }

        // Obtener el fcmToken del usuario desde Supabase usando el Admin client (bypasses RLS)
        const { data: userProfile, error: fetchError } = await supabaseAdmin
            .from('userProfiles')
            .select('fcmToken')
            .eq('id', userId)
            .single();

        if (fetchError || !userProfile || !userProfile.fcmToken) {
            console.log(`No FCM token found for user ${userId}`);
            return NextResponse.json({ success: false, message: 'Usuario no tiene fcmToken' }, { status: 200 });
        }

        if (!getApps().length) {
            return NextResponse.json({ error: 'Firebase Admin no está inicializado en el servidor' }, { status: 500 });
        }

        const message = {
            notification: {
                title,
                body: notificationBody,
            },
            data: data || {},
            token: userProfile.fcmToken,
        };

        const response = await getMessaging().send(message);
        
        return NextResponse.json({ success: true, messageId: response });
    } catch (error: any) {
        console.error('Error enviando notificación Push a usuario:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
