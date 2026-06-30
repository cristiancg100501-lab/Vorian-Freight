-- ============================================================
-- Migración: Sincronizar campo 'name' con firstName + lastName
-- Fecha: 2026-06-23
-- Descripción: El campo 'name' en userProfiles estaba NULL para
--              registros de drivers/conductores porque solo se
--              guardaba firstName y lastName por separado.
--              Esta migración:
--              1. Rellena 'name' en registros existentes
--              2. Crea un trigger para sincronizarlo automáticamente
-- ============================================================

-- 1. Rellenar registros existentes con name NULL
UPDATE "userProfiles" 
SET name = TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", ''))
WHERE name IS NULL AND ("firstName" IS NOT NULL OR "lastName" IS NOT NULL);

-- 2. Función trigger para sincronización automática
CREATE OR REPLACE FUNCTION sync_user_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."firstName" IS NOT NULL OR NEW."lastName" IS NOT NULL THEN
    NEW.name := TRIM(COALESCE(NEW."firstName", '') || ' ' || COALESCE(NEW."lastName", ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger que se ejecuta en INSERT y UPDATE de firstName o lastName
DROP TRIGGER IF EXISTS trg_sync_full_name ON "userProfiles";
CREATE TRIGGER trg_sync_full_name
  BEFORE INSERT OR UPDATE OF "firstName", "lastName"
  ON "userProfiles"
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_full_name();
