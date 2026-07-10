-- ============================================================
-- ML ENHANCED SIGNALS — Migration Script
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Nuevas columnas de señal en pricing_ml_logs
ALTER TABLE pricing_ml_logs
  ADD COLUMN IF NOT EXISTS was_customer_accepted  BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS was_carrier_accepted   BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS time_to_decision_secs  INTEGER,
  ADD COLUMN IF NOT EXISTS customer_trip_count    INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS month_of_year          INTEGER,
  ADD COLUMN IF NOT EXISTS quoted_at              TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS accepted_at            TIMESTAMPTZ;

-- 2. Actualizar registros históricos que ya tienen status='reserved'
--    para que was_customer_accepted refleje la realidad
UPDATE pricing_ml_logs
  SET was_customer_accepted = TRUE
  WHERE status = 'reserved';

-- 3. time_to_decision_secs: solo aplica a registros futuros donde accepted_at se llene.
--    Para los históricos ya reservados, usamos created_at como aproximación.
UPDATE pricing_ml_logs
  SET time_to_decision_secs = NULL  -- no tenemos datos históricos exactos, se dejará NULL
  WHERE status = 'reserved'
    AND time_to_decision_secs IS NULL;

-- 4. Índice para acelerar consultas de entrenamiento
CREATE INDEX IF NOT EXISTS idx_pricing_ml_logs_accepted
  ON pricing_ml_logs (was_customer_accepted, created_at DESC);

-- Verificar resultado
SELECT
  COUNT(*) AS total_logs,
  COUNT(*) FILTER (WHERE was_customer_accepted = TRUE)  AS accepted_count,
  COUNT(*) FILTER (WHERE was_customer_accepted = FALSE) AS rejected_count,
  COUNT(*) FILTER (WHERE was_carrier_accepted = TRUE)   AS carrier_accepted_count
FROM pricing_ml_logs;
