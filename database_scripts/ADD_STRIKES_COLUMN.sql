-- 🛡️ VORIAN FREIGHT - ADD STRIKES COLUMN
-- Este script añade la columna 'strikes' a los perfiles de empresa para rastrear penalizaciones.

ALTER TABLE public."companyProfiles" 
ADD COLUMN IF NOT EXISTS "strikes" INTEGER DEFAULT 0;

COMMENT ON COLUMN public."companyProfiles"."strikes" IS 'Puntos de penalización por devolver cargas o retrasos.';
