-- 1. Crear tabla clientProfiles
CREATE TABLE IF NOT EXISTS "clientProfiles" (
    "id" uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    "userId" uuid REFERENCES auth.users ON DELETE CASCADE,
    "companyName" text NOT NULL,
    "rut" text NOT NULL,
    "address" text NOT NULL,
    "logoUrl" text,
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS para clientProfiles
ALTER TABLE "clientProfiles" ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas RLS
-- Permitir al usuario ver su propio perfil de cliente
DROP POLICY IF EXISTS "Users can view own client profile" ON "clientProfiles";
CREATE POLICY "Users can view own client profile" 
ON "clientProfiles" FOR SELECT USING (auth.uid() = "id");

-- Permitir al usuario insertar su propio perfil de cliente
DROP POLICY IF EXISTS "Users can insert own client profile" ON "clientProfiles";
CREATE POLICY "Users can insert own client profile" 
ON "clientProfiles" FOR INSERT WITH CHECK (auth.uid() = "id");

-- Permitir al usuario actualizar su propio perfil de cliente
DROP POLICY IF EXISTS "Users can update own client profile" ON "clientProfiles";
CREATE POLICY "Users can update own client profile" 
ON "clientProfiles" FOR UPDATE USING (auth.uid() = "id");

-- (Opcional) Permitir a Admins ver todos los clientProfiles
DROP POLICY IF EXISTS "Admins can view all client profiles" ON "clientProfiles";
CREATE POLICY "Admins can view all client profiles" 
ON "clientProfiles" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "userProfiles" 
    WHERE "userProfiles".id = auth.uid() AND "userProfiles".role = 'admin'
  )
);
