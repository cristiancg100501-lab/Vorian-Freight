import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client bypasses RLS to query shipments table counts
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { ids } = await req.json();
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({});
        }

        const uniqueIds = Array.from(new Set(ids)).slice(0, 50);
        const result: Record<string, number> = {};

        await Promise.all(
            uniqueIds.map(async (cid) => {
                const { count, error } = await supabaseAdmin
                    .from("shipments")
                    .select("id", { count: "exact", head: true })
                    .eq("customer_id", cid)
                    .eq("status", "COMPLETED");
                
                result[cid] = !error && count !== null ? count : 0;
            })
        );

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({}, { status: 500 });
    }
}
