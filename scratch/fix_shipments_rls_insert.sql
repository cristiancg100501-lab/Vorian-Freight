-- 🛠️ FIX: Permitir que clientes y customers creen envíos (INSERT)
-- Ejecuta este script en el SQL Editor de Supabase

-- Política para que clientes (role = 'client') puedan insertar sus propios envíos
DROP POLICY IF EXISTS "Clients can create their own shipments" ON public.shipments;
CREATE POLICY "Clients can create their own shipments" ON public.shipments
FOR INSERT
WITH CHECK (
  auth.uid() = "clientId"
  AND EXISTS (
    SELECT 1 FROM public."userProfiles"
    WHERE id = auth.uid() AND role IN ('client', 'customer')
  )
);

-- Política para que clientes puedan VER sus propios envíos (si no existe ya)
DROP POLICY IF EXISTS "Clients can view their own shipments" ON public.shipments;
CREATE POLICY "Clients can view their own shipments" ON public.shipments
FOR SELECT USING (
  auth.uid() = "clientId" OR auth.uid() = customer_id
);

-- Política para que clientes puedan actualizar sus envíos (Cancelar, etc.)
DROP POLICY IF EXISTS "Clients can update their own shipments" ON public.shipments;
CREATE POLICY "Clients can update their own shipments" ON public.shipments
FOR UPDATE USING (
  auth.uid() = "clientId"
  AND EXISTS (
    SELECT 1 FROM public."userProfiles"
    WHERE id = auth.uid() AND role IN ('client', 'customer')
  )
);

-- Drivers pueden ver shipments que tengan asignados
DROP POLICY IF EXISTS "Drivers can view their assigned shipments" ON public.shipments;
CREATE POLICY "Drivers can view their assigned shipments" ON public.shipments
FOR SELECT USING (
  auth.uid() = "carrierId" OR auth.uid() = driver_id
);
