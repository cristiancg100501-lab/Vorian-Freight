-- 1. Agregar columnas a la tabla de vehículos
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS document_expiration_date DATE;

-- 2. Agregar columnas a la tabla de choferes (driverProfiles)
ALTER TABLE public."driverProfiles"
ADD COLUMN IF NOT EXISTS license_url TEXT,
ADD COLUMN IF NOT EXISTS license_expiration_date DATE,
ADD COLUMN IF NOT EXISTS criminal_record_url TEXT,
ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 3. Agregar columna para Guía de Despacho (e-POD) a la tabla de envíos (shipments)
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS guia_despacho_url TEXT;

-- 4. Crear un Bucket de Storage para Documentos
-- Nota: En Supabase, para insertar un bucket si no existe:
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el Bucket 'documents' (Permitir lectura y escritura pública para el MVP)
CREATE POLICY "Public Access for Documents" 
ON storage.objects FOR ALL 
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
