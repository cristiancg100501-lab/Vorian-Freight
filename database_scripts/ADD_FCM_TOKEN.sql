-- Agregar columna fcmToken a la tabla userProfiles
ALTER TABLE "userProfiles" ADD COLUMN IF NOT EXISTS "fcmToken" text;

-- Asegurarse de que el usuario pueda actualizar su propio fcmToken
-- Esto ya debería estar cubierto por las políticas existentes de UPDATE en userProfiles
