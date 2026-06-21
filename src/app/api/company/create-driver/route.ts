import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client uses the service_role key — bypasses RLS completely.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { firstName, lastName, email, password, rut, phone, companyId } = await req.json();

        // --- Basic validation ---
        if (!firstName || !lastName || !email || !password || !rut || !companyId) {
            return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
        }

        // 1. Create the user in Supabase Auth using admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm so they can log in immediately
            user_metadata: { firstName, lastName, role: "driver" },
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const uid = authData.user.id;

        // 2. Upsert userProfile — a DB trigger may have already created a partial row
        //    when the auth user was created, so we use upsert to avoid duplicate key errors.
        const { error: profileError } = await supabaseAdmin.from("userProfiles").upsert({
            id: uid,
            email,
            firstName,
            lastName,
            rut,
            phone: phone || "",
            role: "driver",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { onConflict: "id" });

        if (profileError) {
            // Rollback: delete the auth user we just created
            await supabaseAdmin.auth.admin.deleteUser(uid);
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        // 3. Upsert driverProfile linked to this company
        const { error: driverError } = await supabaseAdmin.from("driverProfiles").upsert({
            id: uid,
            userId: uid,
            rut,
            companyId,
            vehicleType: "Auto",
            licensePlate: "No especificada",
            licenseType: "B",
            phone: phone || "",
            isAvailable: false,
            currentLatitude: null,
            currentLongitude: null,
            lastLocationUpdate: null,
            updatedAt: new Date().toISOString(),
            status: "active", // Default active since company is creating them
            maxWeightCapacity: 0,
            equipment: [],
            documents: {},
            bankDetails: {},
            rating: 5.0,
            totalTrips: 0
        }, { onConflict: "id" });

        if (driverError) {
            // Rollback both
            await supabaseAdmin.from("userProfiles").delete().eq("id", uid);
            await supabaseAdmin.auth.admin.deleteUser(uid);
            return NextResponse.json({ error: driverError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, driverId: uid });
    } catch (err: any) {
        console.error("[create-driver] Unexpected error:", err);
        return NextResponse.json({ error: err.message || "Error interno del servidor." }, { status: 500 });
    }
}
