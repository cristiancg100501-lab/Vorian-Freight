-- Añadir columnas de pago a la tabla shipments
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_url TEXT;

-- Crear un índice para búsquedas por payment_id (útil para el webhook)
CREATE INDEX IF NOT EXISTS idx_shipments_payment_id ON shipments(payment_id);
