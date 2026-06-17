-- MIGRACIÓN: Agregar columna factor_supply_demand a pricing_ml_logs
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.pricing_ml_logs
ADD COLUMN IF NOT EXISTS factor_supply_demand NUMERIC DEFAULT 0.0;

COMMENT ON COLUMN public.pricing_ml_logs.factor_supply_demand IS
'Factor de ajuste por presión de oferta vs demanda en tiempo real. 
 Calculado como: min(demandSensitivity * (cotizaciones_30min / max(conductores_disponibles, 1)), 0.40)';
