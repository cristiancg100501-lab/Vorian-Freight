import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitize } from '@/lib/validation';

export async function POST(request: NextRequest) {
  // 1. Rate Limiting (Máx 5 creaciones de usuario por minuto por IP)
  const rateLimitError = checkRateLimit(request, { limit: 5, windowMs: 60 * 1000 });
  if (rateLimitError) return rateLimitError;

  try {
    // 2. Verify admin authorization
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { 
        password, 
        role, 
        firstName, 
        lastName, 
        rut, 
        address,
        companyName,
        companyId,
        employmentType,
        vehicleType,
        vehicleTypes,
        licensePlate
    } = body;

    const email = sanitize.email(body.email);
    const sanitizedRut = sanitize.rut(rut);

    if (!email || !password || !role) {
        return NextResponse.json({ error: 'Faltan campos obligatorios o el email es inválido' }, { status: 400 });
    }

    // 1. Crear usuario en Auth

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error en Auth Admin:', authError);
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: 'El usuario ya existe con este correo electrónico.' }, { status: 400 });
      }
      throw authError;
    }
    const newUserId = authData.user.id;
    console.log('Usuario Auth creado:', newUserId);

    // 2. Asegurar perfil en userProfiles
    const finalCompanyName = companyName ? companyName.trim() : "";
    const baseProfileData: Record<string, any> = {
      id: newUserId,
      email,
      firstName: firstName || "",
      lastName: lastName || "",
      role: role,
      rut: sanitizedRut || null,
      address: address || null,
      updatedAt: new Date().toISOString(),
    };
    
    // Intentar upsert solo con columnas seguras (sin name/company_name)
    let { error: profileError } = await supabaseAdmin.from("userProfiles").upsert(baseProfileData);

    if (profileError) {
      // Si falla incluso con campos mínimos, abortar
      console.error('Error definitivo en userProfiles:', profileError);
      throw profileError;
    }

    // Intentar actualizar columnas opcionales por separado
    // Si no existen en el schema, se ignoran sin romper el flujo
    if (finalCompanyName) {
      await supabaseAdmin.from("userProfiles")
        .update({ "Company_name": finalCompanyName })
        .eq("id", newUserId)
        .then(({ error }) => {
          if (error) console.warn("Company_name no disponible en schema:", error.message);
        });
    }

    // 3. Crear o asociar a la tabla unificada de Empresas (companies & company_members)
    if (role === "company" || role === "customer" || role === "client") {
      const companyType = role === "company" ? "CARRIER" : "CUSTOMER";
      let companyId: string | null = null;

      try {
        // Verificar si ya existe una empresa con ese RUT
        if (sanitizedRut) {
          const { data: existingComp } = await supabaseAdmin
            .from("companies")
            .select("id")
            .eq("rut", sanitizedRut.trim())
            .maybeSingle();

          if (existingComp) {
            companyId = existingComp.id;
          }
        }

        // Si no existe, crear la entidad de Empresa en `companies`
        if (!companyId && finalCompanyName) {
          const { data: newComp, error: compErr } = await supabaseAdmin
            .from("companies")
            .insert({
              company_name: finalCompanyName,
              trade_name: finalCompanyName,
              rut: sanitizedRut ? sanitizedRut.trim() : null,
              type: companyType,
              address: address || null,
              email: email,
              verification_status: 'APPROVED',
            })
            .select("id")
            .maybeSingle();

          if (compErr) {
            console.warn("Tabla companies no lista o error secundario:", compErr.message);
          } else if (newComp) {
            companyId = newComp.id;
          }
        }

        // Vincular el usuario persona a la empresa en `company_members`
        if (companyId) {
          await supabaseAdmin.from("company_members").upsert({
            company_id: companyId,
            user_id: newUserId,
            member_role: 'OWNER',
            is_active: true,
          }, { onConflict: 'company_id,user_id' });
        }
      } catch (e: any) {
        console.warn("Falló inserción en tablas B2B opcionales (empresas/miembros):", e?.message || e);
      }

      // Compatibilidad con tablas anteriores
      if (role === "company") {
        const { error: compErr } = await supabaseAdmin.from("companyProfiles").upsert({
          id: newUserId,
          userId: newUserId,
          companyName: finalCompanyName,
          rut: sanitizedRut || "",
          address: address || "",
          vehicleTypes: vehicleTypes || ["Auto"],
        });
        if (compErr) {
          console.error("Error en companyProfiles:", compErr);
          throw compErr;
        }
      } else {
        const { error: cliErr } = await supabaseAdmin.from("clientProfiles").upsert({
          id: newUserId,
          userId: newUserId,
          companyName: finalCompanyName,
          rut: sanitizedRut || "",
          address: address || "",
        });
        if (cliErr) {
          console.error("Error en clientProfiles:", cliErr);
          throw cliErr;
        }
      }
    }

    if (role === "driver") {
      const driverData: Record<string, any> = {
        id: newUserId,
        userId: newUserId,
        vehicleType: vehicleType || "Auto",
        licensePlate: licensePlate || "N/A",
        isAvailable: false,
        updatedAt: new Date().toISOString(),
      };

      const { error: drvErr } = await supabaseAdmin.from("driverProfiles").upsert(driverData);
      if (drvErr) {
        console.error("Error en driverProfiles:", drvErr);
        throw drvErr;
      }

      if (companyId) {
        try {
          await supabaseAdmin.from("userProfiles").update({ company_id: companyId }).eq("id", newUserId);
          await supabaseAdmin.from("company_members").upsert({
            company_id: companyId,
            user_id: newUserId,
            member_role: 'MEMBER',
            is_active: true,
          }, { onConflict: 'company_id,user_id' });
        } catch (e: any) {
          console.warn("Omitiendo vinculo B2B opcional:", e);
        }
      }
    }

    console.log('--- ADMIN CREATE USER SUCCESS ---');
    return NextResponse.json({ success: true, userId: newUserId });

  } catch (error: any) {
    console.error('DETALLE DE ERROR CAPTURADO:', error);
    const errorMsg = error.message || error.msg || error.error_description || 'Error en la base de datos al crear el usuario';
    const detailsMsg = error.details || error.hint || error.code || '';
    return NextResponse.json({ 
        error: errorMsg,
        details: detailsMsg,
        code: error.code || 'UNKNOWN'
    }, { status: 400 });
  }
}
