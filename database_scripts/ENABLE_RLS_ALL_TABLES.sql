-- ============================================================
-- VORIAN FREIGHT — RLS COMPLETO
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 0. FUNCIÓN HELPER PARA OBTENER ROL DEL USUARIO ────────
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public."userProfiles" WHERE id::text = auth.uid()::text;
$$;

-- ─── 1. userProfiles ────────────────────────────────────────
ALTER TABLE public."userProfiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_userProfiles" ON public."userProfiles";
CREATE POLICY "admin_full_access_userProfiles"
  ON public."userProfiles" FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

DROP POLICY IF EXISTS "user_own_profile_select" ON public."userProfiles";
CREATE POLICY "user_own_profile_select"
  ON public."userProfiles" FOR SELECT
  TO authenticated
  USING (id::text = auth.uid()::text);

DROP POLICY IF EXISTS "user_own_profile_update" ON public."userProfiles";
CREATE POLICY "user_own_profile_update"
  ON public."userProfiles" FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text)
  WITH CHECK (id::text = auth.uid()::text);

-- ─── 2. shipments ────────────────────────────────────────────
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_shipments" ON public.shipments;
CREATE POLICY "admin_full_access_shipments"
  ON public.shipments FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

DROP POLICY IF EXISTS "client_own_shipments" ON public.shipments;
CREATE POLICY "client_own_shipments"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (
    "clientId"::text = auth.uid()::text
    OR customer_id::text = auth.uid()::text
  );

DROP POLICY IF EXISTS "driver_read_assigned_shipments" ON public.shipments;
CREATE POLICY "driver_read_assigned_shipments"
  ON public.shipments FOR SELECT
  TO authenticated
  USING ("driverId"::text = auth.uid()::text);

DROP POLICY IF EXISTS "driver_update_assigned_shipments" ON public.shipments;
CREATE POLICY "driver_update_assigned_shipments"
  ON public.shipments FOR UPDATE
  TO authenticated
  USING ("driverId"::text = auth.uid()::text)
  WITH CHECK ("driverId"::text = auth.uid()::text);

DROP POLICY IF EXISTS "company_read_assigned_shipments" ON public.shipments;
CREATE POLICY "company_read_assigned_shipments"
  ON public.shipments FOR SELECT
  TO authenticated
  USING ("carrierId"::text = auth.uid()::text);

DROP POLICY IF EXISTS "company_update_assigned_shipments" ON public.shipments;
CREATE POLICY "company_update_assigned_shipments"
  ON public.shipments FOR UPDATE
  TO authenticated
  USING ("carrierId"::text = auth.uid()::text)
  WITH CHECK ("carrierId"::text = auth.uid()::text);

-- ─── 3. location_history (Acceso para usuarios autenticados) ─
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_location_history" ON public.location_history;
DROP POLICY IF EXISTS "driver_insert_own_location" ON public.location_history;
DROP POLICY IF EXISTS "driver_read_own_location" ON public.location_history;
DROP POLICY IF EXISTS "authenticated_location_history" ON public.location_history;

CREATE POLICY "authenticated_location_history"
  ON public.location_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 4. vehicles ─────────────────────────────────────────────
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_vehicles" ON public.vehicles;
CREATE POLICY "admin_full_vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

DROP POLICY IF EXISTS "owner_read_own_vehicles" ON public.vehicles;
CREATE POLICY "owner_read_own_vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (
    "driverId"::text = auth.uid()::text
    OR "companyId"::text = auth.uid()::text
  );

DROP POLICY IF EXISTS "owner_update_own_vehicles" ON public.vehicles;
CREATE POLICY "owner_update_own_vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (
    "driverId"::text = auth.uid()::text
    OR "companyId"::text = auth.uid()::text
  )
  WITH CHECK (
    "driverId"::text = auth.uid()::text
    OR "companyId"::text = auth.uid()::text
  );

-- ─── 5. settings ─────────────────────────────────────────────
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_settings" ON public.settings;
CREATE POLICY "admin_only_settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- ─── 6. settings_history ─────────────────────────────────────
ALTER TABLE public.settings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_settings_history" ON public.settings_history;
CREATE POLICY "admin_only_settings_history"
  ON public.settings_history FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin');

-- ─── 7. vehicleRates ─────────────────────────────────────────
ALTER TABLE public."vehicleRates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_vehicleRates" ON public."vehicleRates";
CREATE POLICY "authenticated_read_vehicleRates"
  ON public."vehicleRates" FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_vehicleRates" ON public."vehicleRates";
CREATE POLICY "admin_write_vehicleRates"
  ON public."vehicleRates" FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- ─── 8. concession_matrices ──────────────────────────────────
ALTER TABLE public.concession_matrices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_concession_matrices" ON public.concession_matrices;
CREATE POLICY "authenticated_read_concession_matrices"
  ON public.concession_matrices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_concession_matrices" ON public.concession_matrices;
CREATE POLICY "admin_write_concession_matrices"
  ON public.concession_matrices FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- ─── 9. combustibles ─────────────────────────────────────────
ALTER TABLE public.combustibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_combustibles" ON public.combustibles;
CREATE POLICY "authenticated_read_combustibles"
  ON public.combustibles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_combustibles" ON public.combustibles;
CREATE POLICY "admin_write_combustibles"
  ON public.combustibles FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- ─── 10. fuel_surcharge_rules ────────────────────────────────
ALTER TABLE public.fuel_surcharge_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_fuel_rules" ON public.fuel_surcharge_rules;
CREATE POLICY "authenticated_read_fuel_rules"
  ON public.fuel_surcharge_rules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_fuel_rules" ON public.fuel_surcharge_rules;
CREATE POLICY "admin_write_fuel_rules"
  ON public.fuel_surcharge_rules FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- ─── 11. chilean_holidays ────────────────────────────────────
ALTER TABLE public.chilean_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_holidays" ON public.chilean_holidays;
CREATE POLICY "public_read_holidays"
  ON public.chilean_holidays FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admin_write_holidays" ON public.chilean_holidays;
CREATE POLICY "admin_write_holidays"
  ON public.chilean_holidays FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- ─── 12. porticos ────────────────────────────────────────────
ALTER TABLE public.porticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_porticos" ON public.porticos;
CREATE POLICY "authenticated_read_porticos"
  ON public.porticos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_porticos" ON public.porticos;
CREATE POLICY "admin_write_porticos"
  ON public.porticos FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- ─── VERIFICACIÓN FINAL ──────────────────────────────────────
SELECT
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ PROTEGIDA' ELSE '❌ SIN RLS' END AS estado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;
