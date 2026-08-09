-- Script de Políticas RLS (Row Level Security) para Vorian Logistics
-- Copia y ejecuta este script en el SQL Editor de tu panel de Supabase.

-- 1. Habilitar RLS en las tablas principales
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."userProfiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."driverProfiles" ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'userProfiles'
-- Un usuario puede leer su propio perfil.
DROP POLICY IF EXISTS "Users can view own profile" ON public."userProfiles";
CREATE POLICY "Users can view own profile" 
ON public."userProfiles" 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- (Opcional) Si necesitas que el admin vea todos los perfiles:
-- CREATE POLICY "Admins can view all profiles"
-- ON public."userProfiles"
-- FOR SELECT
-- USING (auth.uid() IN (SELECT id FROM public."userProfiles" WHERE role = 'admin'));

-- 3. Políticas para 'shipments'
-- Política para CLIENTES: Solo pueden ver sus propios envíos.
DROP POLICY IF EXISTS "Clients can view their own shipments" ON public.shipments;
CREATE POLICY "Clients can view their own shipments"
ON public.shipments
FOR SELECT
USING (auth.uid()::text = "clientId"::text);

-- Política para CONDUCTORES: Solo pueden ver envíos donde están asignados.
-- Nota: se asume que la columna es "driverId", "effectiveDriverId" o "carrierId" 
-- Ajusta el nombre de la columna según corresponda a tu esquema real.
DROP POLICY IF EXISTS "Drivers can view assigned shipments" ON public.shipments;
CREATE POLICY "Drivers can view assigned shipments"
ON public.shipments
FOR SELECT
USING (auth.uid()::text = "driverId"::text OR auth.uid()::text = "carrierId"::text);

-- Política para CONDUCTORES: Solo pueden actualizar estados de sus propios envíos.
DROP POLICY IF EXISTS "Drivers can update their shipments" ON public.shipments;
CREATE POLICY "Drivers can update their shipments"
ON public.shipments
FOR UPDATE
USING (auth.uid()::text = "driverId"::text OR auth.uid()::text = "carrierId"::text);

-- 4. Políticas para 'driverProfiles'
-- Un conductor puede actualizar su propia ubicación (currentLatitude, currentLongitude).
DROP POLICY IF EXISTS "Drivers can update own location" ON public."driverProfiles";
CREATE POLICY "Drivers can update own location"
ON public."driverProfiles"
FOR UPDATE
USING (auth.uid()::text = id::text);

-- Clientes pueden leer la ubicación de los conductores asignados a sus envíos activos
DROP POLICY IF EXISTS "Clients can view driver location if assigned" ON public."driverProfiles";
CREATE POLICY "Clients can view driver location if assigned"
ON public."driverProfiles"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shipments 
    WHERE shipments."clientId"::text = auth.uid()::text 
    AND (shipments."driverId"::text = "driverProfiles".id::text OR shipments."carrierId"::text = "driverProfiles".id::text)
    AND shipments.status IN ('EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF')
  )
);

-- Habilitar notificaciones en tiempo real para la tabla de envíos si no está habilitada
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public."driverProfiles";
