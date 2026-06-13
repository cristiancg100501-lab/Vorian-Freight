-- 🛠️ CORRECCIÓN: HABILITAR ROL CUSTOMER EN LA BASE DE DATOS
-- El error "Database error creating new user" se debe a una restricción (check constraint)
-- que impide usar roles distintos a los originales.

-- 1. Eliminar la restricción antigua (si existe con este nombre)
ALTER TABLE public."userProfiles" DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Crear la nueva restricción incluyendo 'customer'
ALTER TABLE public."userProfiles" 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'client', 'driver', 'company', 'customer'));

-- 3. (Opcional) Asegurarse de que las tablas de perfiles acepten al nuevo usuario
-- No es necesario si ya se crearon las columnas, pero es buena práctica.

COMMENT ON CONSTRAINT profiles_role_check ON public."userProfiles" IS 'Restricción de roles permitidos en la plataforma Vorian.';
