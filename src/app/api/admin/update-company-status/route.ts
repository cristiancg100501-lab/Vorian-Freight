import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { companyId, status } = body;

    if (!companyId || !status) {
        return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Bypass RLS using supabaseAdmin to update the status
    const { error } = await supabaseAdmin
        .from('companyProfiles')
        .update({ status })
        .eq('id', companyId);

    if (error) {
        console.error('Error updating company status via admin API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error en update-company-status route:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
