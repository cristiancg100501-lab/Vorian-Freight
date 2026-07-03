-- Script de Base de Datos para Módulo de Finanzas
-- Pega este código en el editor SQL de tu panel de Supabase y ejecútalo.

BEGIN;

-- Agregamos las columnas necesarias para facturación y control financiero a la tabla shipments
ALTER TABLE "shipments"
ADD COLUMN IF NOT EXISTS "carrier_payment" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "carrier_paid" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "carrier_invoice_number" TEXT,
ADD COLUMN IF NOT EXISTS "client_charged" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "client_invoice_number" TEXT,
ADD COLUMN IF NOT EXISTS "invoice_issue_date" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "invoice_due_date" TIMESTAMP WITH TIME ZONE;

COMMIT;
