-- 🛡️ VORIAN FREIGHT - AUTO REVOKE CRON JOB
-- Job para revocar cargas automáticamente si la empresa no asigna chofer en 1 hora.
-- Agrega 3 "strikes" graves a la empresa infractora.

-- 1. Intentar activar pg_cron (Solo funciona si el usuario es superuser o en Supabase Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Crear una función que encapsule la lógica de revocación
CREATE OR REPLACE FUNCTION public.auto_revoke_expired_loads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shipment RECORD;
BEGIN
    FOR v_shipment IN 
        SELECT id, "carrierId" 
        FROM public.shipments 
        WHERE status = 'ACCEPTED'
        AND "driverId" IS NULL
        AND "updatedAt" < NOW() - INTERVAL '1 hour'
    LOOP
        -- Devolver la carga al mercado (PENDING)
        UPDATE public.shipments
        SET 
            "carrierId" = NULL,
            status = 'PENDING',
            "updatedAt" = NOW()
        WHERE id = v_shipment.id;

        -- Penalizar a la empresa sumándole 3 strikes (infracción grave por retener carga)
        UPDATE public."companyProfiles"
        SET strikes = COALESCE(strikes, 0) + 3
        WHERE id = v_shipment."carrierId";
        
        -- Aquí podríamos insertar una notificación en el futuro
    END LOOP;
END;
$$;

-- 3. Programar el Job para que se ejecute cada 5 minutos
SELECT cron.schedule(
    'auto_revoke_expired_loads', -- nombre del job
    '*/5 * * * *',               -- cada 5 minutos
    'SELECT public.auto_revoke_expired_loads();'
);
