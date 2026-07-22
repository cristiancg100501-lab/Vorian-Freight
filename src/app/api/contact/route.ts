import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, email, phone, profile, volume, message, rut, giro } = body;

    // Validation
    if (!name || !company || !email || !phone || !profile || !volume || !rut || !giro) {
      return NextResponse.json({ error: 'Todos los campos excepto el mensaje son obligatorios.' }, { status: 400 });
    }

    // 1. Insert into Supabase (contact_requests)
    let dbInserted = false;
    let dbErrorMsg = '';
    try {
      const { error } = await supabaseAdmin
        .from('contact_requests')
        .insert({
          name,
          company,
          email,
          phone,
          rut,
          giro,
          profile,
          volume,
          message,
          status: 'Nuevo'
        });
      if (error) {
        console.error("Database Insert Error:", error);
        dbErrorMsg = error.message;
      } else {
        dbInserted = true;
      }
    } catch (dbErr: any) {
      console.error("Database Connection/Exception Error:", dbErr);
      dbErrorMsg = dbErr.message;
    }

    // 2. Send email via Resend
    let emailSent = false;
    let emailErrorMsg = '';
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const { error: mailError } = await resend.emails.send({
          from: 'Vorian Logistics <info@vorianglobal.com>',
          to: ['info@vorianglobal.com'],
          subject: `💼 Nueva Solicitud de Ventas: ${company}`,
          html: `
            <h2>Nueva Solicitud de Ventas Recibida</h2>
            <p>Se ha registrado un nuevo lead desde la página de contacto:</p>
            <table border="1" cellpadding="8" style="border-collapse: collapse; border-color: #ddd; width: 100%; max-width: 600px;">
              <tr><td><strong>Nombre:</strong></td><td>${name}</td></tr>
              <tr><td><strong>Empresa:</strong></td><td>${company}</td></tr>
              <tr><td><strong>RUT:</strong></td><td>${rut}</td></tr>
              <tr><td><strong>Giro Comercial:</strong></td><td>${giro}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
              <tr><td><strong>Teléfono:</strong></td><td>${phone}</td></tr>
              <tr><td><strong>Perfil:</strong></td><td>${profile}</td></tr>
              <tr><td><strong>Volumen de Envíos:</strong></td><td>${volume}</td></tr>
              ${message ? `<tr><td><strong>Mensaje:</strong></td><td>${message}</td></tr>` : ''}
            </table>
            <br/>
            <p>Puedes gestionar este lead directamente en el <a href="https://vorian-logistics.vercel.app/admin/contactos">Panel de Administración de Vorian</a>.</p>
          `
        });
        if (mailError) {
          console.error("Resend Mail Error:", mailError);
          emailErrorMsg = mailError.message;
        } else {
          emailSent = true;
        }
      } else {
        console.warn("Resend API Key is missing. Email skipped.");
        emailErrorMsg = "Falta la API key de Resend en el servidor.";
      }
    } catch (mailErr: any) {
      console.error("Resend Exception Error:", mailErr);
      emailErrorMsg = mailErr.message;
    }

    // If both failed, then return error
    if (!dbInserted && !emailSent) {
      return NextResponse.json({ 
        error: 'No se pudo guardar la solicitud ni enviar el correo electrónico.',
        details: { db: dbErrorMsg, email: emailErrorMsg }
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Solicitud recibida con éxito.',
      savedInDb: dbInserted,
      emailNotification: emailSent
    }, { status: 200 });

  } catch (err: any) {
    console.error("Unexpected Route Error:", err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
