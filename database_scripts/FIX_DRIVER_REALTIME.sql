-- 1. Enable Realtime for driverProfiles (Ya está habilitado, omitido)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public."driverProfiles";

-- 2. Update RLS so Customers can read their driver's profile
DROP POLICY IF EXISTS "user_own_driverProfile_select" ON public."driverProfiles";
CREATE POLICY "user_own_driverProfile_select"
  ON public."driverProfiles" FOR SELECT
  TO authenticated
  USING (
    id::text = auth.uid()::text
    OR public.auth_user_role() = 'admin'
    OR EXISTS (
        SELECT 1 FROM public.shipments s
        WHERE (s."driverId"::text = "driverProfiles".id::text OR s."carrierId"::text = "driverProfiles".id::text)
        AND (s."clientId"::text = auth.uid()::text OR s.customer_id::text = auth.uid()::text)
        AND s.status IN ('ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF')
    )
  );
