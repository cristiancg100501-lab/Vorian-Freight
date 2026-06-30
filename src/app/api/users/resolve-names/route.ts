import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client bypasses RLS to read any user profile
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

        const { data, error } = await supabaseAdmin
            .from("userProfiles")
            .select("id, name, firstName, lastName, email")
            .in("id", ids.slice(0, 50));

        if (error) return NextResponse.json({}, { status: 500 });

        // Return a map of id -> display name
        const result: Record<string, string> = {};
        for (const u of data || []) {
            result[u.id] = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id;
        }
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({}, { status: 500 });
    }
}
