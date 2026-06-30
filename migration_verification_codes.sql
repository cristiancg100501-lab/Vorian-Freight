-- ============================================
-- Migración: Códigos de Verificación PIN (4 dígitos)
-- Pega este código en el SQL Editor de Supabase
-- ============================================

BEGIN;

-- 1. Agregar columnas de código PIN
ALTER TABLE "shipments" 
ADD COLUMN IF NOT EXISTS "pickup_code" TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "delivery_code" TEXT DEFAULT NULL;

-- 2. Crear función para auto-generar códigos al crear un envío
CREATE OR REPLACE FUNCTION generate_verification_codes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pickup_code IS NULL THEN
    NEW.pickup_code := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
  END IF;
  IF NEW.delivery_code IS NULL THEN
    NEW.delivery_code := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger (drop si ya existe para evitar duplicados)
DROP TRIGGER IF EXISTS trg_generate_codes ON "shipments";
CREATE TRIGGER trg_generate_codes
BEFORE INSERT ON "shipments"
FOR EACH ROW EXECUTE FUNCTION generate_verification_codes();

-- 4. Backfill: Generar códigos para envíos existentes que no tengan
UPDATE "shipments" 
SET pickup_code = LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0'),
    delivery_code = LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
WHERE pickup_code IS NULL OR delivery_code IS NULL;

COMMIT;
