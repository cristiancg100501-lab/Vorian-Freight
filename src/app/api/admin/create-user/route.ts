import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        email, 
        password, 
        role, 
        firstName, 
        lastName, 
        rut, 
        address,
        companyName,
        vehicleType,
        vehicleTypes,
        licensePlate
    } = body;

    if (!email || !password || !role) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. Crear usuario en Auth
    console.log('--- ADMIN CREATE USER START ---');
    console.log('Email:', email);
    console.log('Role:', role);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstName, lastName, role }
    });

    if (authError) {
      console.error('Error en Auth Admin:', authError);
      // Si el usuario ya existe en Auth, intentamos obtener su ID
      if (authError.message.includes('already registered')) {
          const { data: existingUser } = await supabaseAdmin.from('userProfiles').select('id').eq('email', email).single();
          if (existingUser) {
              return NextResponse.json({ error: 'El usuario ya existe con este correo electrónico.' }, { status: 400 });
          }
      }
      throw authError;
    }
    const newUserId = authData.user.id;
    console.log('Usuario Auth creado:', newUserId);

    // 2. Asegurar perfil en userProfiles
    // NOTA: El trigger podría haber creado ya el perfil. Usamos upsert.
    const profileData = {
      id: newUserId,
      email,
      firstName: firstName || "",
      lastName: lastName || "",
      name: `${firstName || ""} ${lastName || ""}`.trim(),
      role: role,
      rut: rut || null,
      address: address || null,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('Upserting userProfiles:', profileData);
    const { error: profileError } = await supabaseAdmin.from("userProfiles").upsert(profileData);

    if (profileError) {
        console.error('Error en userProfiles:', profileError);
        throw profileError;
    }

    // 3. Crear perfiles específicos según el rol
    if (role === "driver") {
      const driverData = {
        id: newUserId,
        userId: newUserId,
        vehicleType: vehicleType || "Auto",
        licensePlate: licensePlate || "N/A",
        isAvailable: false,
        updatedAt: new Date().toISOString(),
      };
      console.log('Upserting driverProfiles:', driverData);
      const { error: driverError } = await supabaseAdmin.from("driverProfiles").upsert(driverData);
      if (driverError) {
          console.error('Error en driverProfiles:', driverError);
          throw driverError;
      }
    }

    if (role === "company") {
      const companyData = {
        id: newUserId,
        userId: newUserId,
        companyName: companyName || "",
        rut: rut || "",
        address: address || "",
        vehicleTypes: vehicleTypes || ["Auto"],
        updatedAt: new Date().toISOString(),
      };
      console.log('Upserting companyProfiles:', companyData);
      const { error: companyError } = await supabaseAdmin.from("companyProfiles").upsert(companyData);
      if (companyError) {
          console.error('Error en companyProfiles:', companyError);
          throw companyError;
      }
    }

    console.log('--- ADMIN CREATE USER SUCCESS ---');
    return NextResponse.json({ success: true, userId: newUserId });

  } catch (error: any) {
    console.error('DETALLE DE ERROR CAPTURADO:', error);
    return NextResponse.json({ 
        error: error.message || 'Error en la base de datos al crear el usuario',
        details: error.details || error.hint || '',
        code: error.code || 'UNKNOWN'
    }, { status: 500 });
  }
}
