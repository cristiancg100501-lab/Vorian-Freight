-- Agregar columna priority_boost a la tabla shipments para el sistema de tarifa dinámica manual
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "priority_boost" NUMERIC DEFAULT 0;
