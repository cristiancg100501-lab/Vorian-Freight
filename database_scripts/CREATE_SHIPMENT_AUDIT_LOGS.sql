-- ==============================================================================
-- AUDITORÍA INMUTABLE DE ENVÍOS (IMMUTABLE AUDIT TRAIL)
-- Vorian Logistics Platform
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- 1. Crear tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS public.shipment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id TEXT NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- ej: 'STATUS_CHANGE', 'PRICE_CHANGE', 'CREATED'
    old_value JSONB,
    new_value JSONB,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Usuario que hizo el cambio (puede ser NULL si fue el sistema)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexar por shipment_id para búsquedas rápidas en la línea de tiempo
CREATE INDEX IF NOT EXISTS idx_audit_logs_shipment_id ON public.shipment_audit_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.shipment_audit_logs(created_at);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.shipment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- Los administradores pueden ver todo
DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.shipment_audit_logs;
CREATE POLICY "admin_select_audit_logs"
  ON public.shipment_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public."userProfiles" WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- Los clientes y empresas pueden ver los logs de sus propios envíos
DROP POLICY IF EXISTS "client_company_select_audit_logs" ON public.shipment_audit_logs;
CREATE POLICY "client_company_select_audit_logs"
  ON public.shipment_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM public.shipments s
        WHERE s.id = shipment_audit_logs.shipment_id
        AND (s."clientId"::text = auth.uid()::text OR s.customer_id::text = auth.uid()::text OR s."driverId"::text = auth.uid()::text)
    )
  );

-- Insertar logs es permitido para el backend/service_role o usuarios autenticados
-- (Usualmente se inserta mediante trigger, por lo que el rol de DB que ejecuta el trigger lo permitirá)
DROP POLICY IF EXISTS "insert_audit_logs" ON public.shipment_audit_logs;
CREATE POLICY "insert_audit_logs"
  ON public.shipment_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- 3. FUNCIONES Y TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ==============================================================================

-- Función que registra cuando se crea un envío
CREATE OR REPLACE FUNCTION audit_shipment_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.shipment_audit_logs (shipment_id, event_type, new_value, actor_id)
    VALUES (
        NEW.id,
        'CREATED',
        jsonb_build_object('status', NEW.status, 'client_price', NEW.client_price),
        auth.uid() -- Intenta obtener el usuario actual de Supabase Auth
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_shipment_created ON public.shipments;
CREATE TRIGGER trg_audit_shipment_created
    AFTER INSERT ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION audit_shipment_creation();

-- Función que registra cuando cambia el estado de un envío
CREATE OR REPLACE FUNCTION audit_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.shipment_audit_logs (shipment_id, event_type, old_value, new_value, actor_id)
        VALUES (
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_shipment_status ON public.shipments;
CREATE TRIGGER trg_audit_shipment_status
    AFTER UPDATE OF status ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION audit_shipment_status_change();

-- Función que registra cuando cambia el precio (para auditoría financiera)
CREATE OR REPLACE FUNCTION audit_shipment_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.client_price IS DISTINCT FROM NEW.client_price THEN
        INSERT INTO public.shipment_audit_logs (shipment_id, event_type, old_value, new_value, actor_id)
        VALUES (
            NEW.id,
            'PRICE_CHANGE',
            jsonb_build_object('client_price', OLD.client_price),
            jsonb_build_object('client_price', NEW.client_price),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_shipment_price ON public.shipments;
CREATE TRIGGER trg_audit_shipment_price
    AFTER UPDATE OF client_price ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION audit_shipment_price_change();
