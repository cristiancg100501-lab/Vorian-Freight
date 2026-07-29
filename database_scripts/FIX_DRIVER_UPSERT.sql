DROP POLICY IF EXISTS "user_own_driverProfile_insert" ON public."driverProfiles";
CREATE POLICY "user_own_driverProfile_insert"
  ON public."driverProfiles" FOR INSERT
  TO authenticated
  WITH CHECK (id::text = auth.uid()::text);
