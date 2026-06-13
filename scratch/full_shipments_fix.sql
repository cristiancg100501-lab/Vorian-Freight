-- 🛠️ MIGRACIÓN FINAL: SINCRONIZACIÓN DE TABLA SHIPMENTS & LOGS
-- Ejecuta este script en el SQL Editor de Supabase.

-- 1. Asegurar columnas en Shipments
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS "originAddress" TEXT,
ADD COLUMN IF NOT EXISTS "destinationAddress" TEXT,
ADD COLUMN IF NOT EXISTS "estimatedPrice" NUMERIC,
ADD COLUMN IF NOT EXISTS "estimated_price" NUMERIC,
ADD COLUMN IF NOT EXISTS "client_price" NUMERIC,
ADD COLUMN IF NOT EXISTS "carrier_cost" NUMERIC,
ADD COLUMN IF NOT EXISTS "customer_id" UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS "driver_id" UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS "current_latitude" NUMERIC,
ADD COLUMN IF NOT EXISTS "current_longitude" NUMERIC,
ADD COLUMN IF NOT EXISTS "pickup_date" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "pickup_latitude" NUMERIC,
ADD COLUMN IF NOT EXISTS "pickup_longitude" NUMERIC,
ADD COLUMN IF NOT EXISTS "delivery_latitude" NUMERIC,
ADD COLUMN IF NOT EXISTS "delivery_longitude" NUMERIC,
ADD COLUMN IF NOT EXISTS "equipment" TEXT,
ADD COLUMN IF NOT EXISTS "serviceType" TEXT,
ADD COLUMN IF NOT EXISTS "itemDescription" TEXT,
ADD COLUMN IF NOT EXISTS "bookingMethod" TEXT,
ADD COLUMN IF NOT EXISTS "booking_method" TEXT;

-- 2. RLS para Shipments (Admin y Clientes)
DROP POLICY IF EXISTS "Admins can do everything on shipments" ON public.shipments;
CREATE POLICY "Admins can do everything on shipments" ON public.shipments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public."userProfiles"
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Customers can view their own shipments" ON public.shipments;
CREATE POLICY "Customers can view their own shipments" ON public.shipments
FOR SELECT USING (
  auth.uid() = customer_id OR auth.uid() = "clientId"
);

-- 3. RLS para Shipment Logs (Para los Triggers)
ALTER TABLE public.shipment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on shipment_logs" ON public.shipment_logs;
CREATE POLICY "Admins can do everything on shipment_logs" ON public.shipment_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public."userProfiles"
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir que los triggers inserten registros de log
DROP POLICY IF EXISTS "Enable insert for authenticated users on logs" ON public.shipment_logs;
CREATE POLICY "Enable insert for authenticated users on logs" 
ON public.shipment_logs 
FOR INSERT 
WITH CHECK (true);