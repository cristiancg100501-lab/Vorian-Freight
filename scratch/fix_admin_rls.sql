-- 🛠️ CORRECCIÓN DEFINITIVA: VISIBILIDAD DE ADMINISTRADOR (RLS)
-- Usamos una función SECURITY DEFINER para evitar la recursión en las políticas de RLS.

-- 1. Crear función para verificar si es admin (omitiendo RLS)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER -- Esto permite que la función ignore las políticas de RLS al consultar
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public."userProfiles" 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Asegurar que RLS esté activo
ALTER TABLE public."userProfiles" ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own profile" ON public."userProfiles";
DROP POLICY IF EXISTS "Admins can view all profiles" ON public."userProfiles";
DROP POLICY IF EXISTS "Enable read access for all users" ON public."userProfiles";

-- 4. Política: El usuario ve su propio perfil
CREATE POLICY "Users can view their own profile" 
ON public."userProfiles" 
FOR SELECT 
USING (auth.uid() = id);

-- 5. Política: El administrador ve TODOS los perfiles
CREATE POLICY "Admins can view all profiles" 
ON public."userProfiles" 
FOR SELECT 
USING (public.is_admin());

-- 6. Política para Driver Profiles
ALTER TABLE public."driverProfiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all driver profiles" ON public."driverProfiles";
CREATE POLICY "Admins can view all driver profiles" 
ON public."driverProfiles" 
FOR SELECT 
USING (public.is_admin() OR auth.uid() = "userId");

-- 7. (Opcional) Política para Shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all shipments" ON public.shipments;
CREATE POLICY "Admins can view all shipments" 
ON public.shipments 
FOR SELECT 
USING (public.is_admin() OR auth.uid() = "clientId" OR auth.uid() = "customer_id");
