-- 🛠️ MIGRACIÓN: MANAGED FREIGHT & TRACKING
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar columnas a la tabla de envíos
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS client_price NUMERIC,
ADD COLUMN IF NOT EXISTS carrier_cost NUMERIC,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS current_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS current_longitude NUMERIC;

-- 2. Actualizar RLS para que los clientes (customers) vean sus envíos
-- Asumiendo que la política se llama 'Customers can view their own shipments'
DROP POLICY IF EXISTS "Customers can view their own shipments" ON public.shipments;
CREATE POLICY "Customers can view their own shipments" ON public.shipments
FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = "clientId" OR
  EXISTS (
    SELECT 1 FROM public."userProfiles"
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Habilitar Realtime para seguimiento en vivo (opcional pero recomendado)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;

COMMENT ON COLUMN public.shipments.client_price IS 'Monto que se le cobra al cliente final (mandante)';
COMMENT ON COLUMN public.shipments.carrier_cost IS 'Monto que se le paga al transportista/chofer';
