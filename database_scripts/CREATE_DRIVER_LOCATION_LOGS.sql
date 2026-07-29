-- ==============================================================================
-- HISTORIAL DE GPS EN TIEMPO REAL
-- ==============================================================================

-- 1. Crear tabla de logs
CREATE TABLE IF NOT EXISTS public.driver_location_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public."userProfiles"(id) ON DELETE CASCADE,
    shipment_id TEXT REFERENCES public.shipments(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexar para lecturas rapidas
CREATE INDEX IF NOT EXISTS idx_driver_location_logs_shipment_id ON public.driver_location_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_driver_location_logs_driver_id ON public.driver_location_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_location_logs_created_at ON public.driver_location_logs(created_at);

-- 2. Habilitar RLS
ALTER TABLE public.driver_location_logs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad
DROP POLICY IF EXISTS "select_location_logs" ON public.driver_location_logs;
CREATE POLICY "select_location_logs"
  ON public.driver_location_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public."userProfiles" WHERE id::text = auth.uid()::text AND role = 'admin')
    OR
    EXISTS (
        SELECT 1 FROM public.shipments s
        WHERE s.id = driver_location_logs.shipment_id
        AND (s."clientId"::text = auth.uid()::text OR s.customer_id::text = auth.uid()::text OR s."driverId"::text = auth.uid()::text)
    )
  );

-- 4. Función de Trigger
CREATE OR REPLACE FUNCTION log_driver_location()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
    active_shipment_id TEXT;
BEGIN
    -- Only log if location actually changed and is not null
    IF NEW."currentLatitude" IS NOT NULL AND NEW."currentLongitude" IS NOT NULL AND 
       (NEW."currentLatitude" IS DISTINCT FROM OLD."currentLatitude" OR NEW."currentLongitude" IS DISTINCT FROM OLD."currentLongitude") THEN
        
        -- Find active shipment for this driver
        SELECT id INTO active_shipment_id
        FROM public.shipments
        WHERE ("driverId"::text = NEW.id::text OR "carrierId"::text = NEW.id::text)
          AND status IN ('ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF')
        ORDER BY "createdAt" DESC
        LIMIT 1;

        -- We still log it even if active_shipment_id is null, it's good for the driver's own history
        INSERT INTO public.driver_location_logs (
            driver_id,
            shipment_id,
            latitude,
            longitude
        ) VALUES (
            NEW.id,
            active_shipment_id,
            NEW."currentLatitude",
            NEW."currentLongitude"
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear el Trigger
DROP TRIGGER IF EXISTS trigger_log_driver_location ON public."driverProfiles";
CREATE TRIGGER trigger_log_driver_location
AFTER UPDATE ON public."driverProfiles"
FOR EACH ROW
EXECUTE FUNCTION log_driver_location();
