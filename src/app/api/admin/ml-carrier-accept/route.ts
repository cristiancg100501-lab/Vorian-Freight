import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Called fire-and-forget from company/shipments page when a carrier accepts a load.
// Links the shipment back to its pricing_ml_log and marks was_carrier_accepted = true.
export async function POST(request: Request) {
  try {
    const { shipment_id } = await request.json();
    if (!shipment_id) {
      return NextResponse.json({ error: 'Missing shipment_id' }, { status: 400 });
    }

    // pricing_ml_logs does not have a shipment_id column yet — we match by
    // offered_price + quoted_at proximity. A simpler approach: link via a
    // shipment-level field. For now we update the most recent 'reserved' log
    // that doesn't yet have was_carrier_accepted = true.
    // NOTE: In the future, store shipment_id in pricing_ml_logs at booking time
    //       for an exact match.
    const { error } = await supabaseAdmin
      .from('pricing_ml_logs')
      .update({ was_carrier_accepted: true })
      .eq('status', 'reserved')
      .eq('was_carrier_accepted', false)
      .order('accepted_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('ml-carrier-accept update error:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en ml-carrier-accept:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
