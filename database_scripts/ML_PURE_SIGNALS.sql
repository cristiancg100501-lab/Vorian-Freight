-- ============================================================
-- ML PURE SIGNALS — Migration Script
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE pricing_ml_logs
  ADD COLUMN IF NOT EXISTS lead_time_hrs        FLOAT,
  ADD COLUMN IF NOT EXISTS weather_severity     INTEGER,
  ADD COLUMN IF NOT EXISTS zonal_concentration  FLOAT,
  ADD COLUMN IF NOT EXISTS is_hazardous         BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_overweight        BOOLEAN;

-- Actualizar históricos con un default (evita que el ML tenga nulos)
UPDATE pricing_ml_logs
SET 
  lead_time_hrs = 24.0,           -- Asumimos 1 día de anticipación promedio para el histórico
  weather_severity = 0,           -- Asumimos despejado
  zonal_concentration = 0.05,     -- Asumimos 5%
  is_hazardous = FALSE,
  is_overweight = FALSE
WHERE lead_time_hrs IS NULL;
