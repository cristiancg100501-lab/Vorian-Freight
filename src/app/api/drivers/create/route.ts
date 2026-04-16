import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, rut, phone, companyId } = body;

    if (!email || !password || !firstName || !lastName || !rut || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create user in Supabase Auth using Admin Client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
      }
    });

    if (authError) throw authError;
    const uid = authData.user.id;

    // 2. Create userProfile in userProfiles table
    const { error: profileError } = await supabaseAdmin.from('userProfiles').insert({
      id: uid,
      email,
      firstName,
      lastName,
      rut,
      phone: phone || '',
      role: 'driver',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (profileError) throw profileError;

    // 3. Create driverProfile in driverProfiles table
    const { error: driverError } = await supabaseAdmin.from('driverProfiles').insert({
      id: uid,
      userId: uid,
      companyId,
      vehicleType: 'Auto', // Default
      licensePlate: 'No especificada',
      licenseType: 'B', // Default
      phone: phone || '',
      isAvailable: false,
      currentLatitude: null,
      currentLongitude: null,
      lastLocationUpdate: null,
      updatedAt: new Date().toISOString(),
    });

    if (driverError) throw driverError;

    return NextResponse.json({ success: true, uid });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
