-- 1. Agregar columna logoUrl a companyProfiles
ALTER TABLE "companyProfiles" 
ADD COLUMN IF NOT EXISTS "logoUrl" text;

-- 2. Crear el Bucket Público para los logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company_logos', 'company_logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Crear políticas RLS para el Bucket (Público para leer, solo autenticados pueden subir)
DROP POLICY IF EXISTS "Todos pueden ver logos" ON storage.objects;
CREATE POLICY "Todos pueden ver logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company_logos');

DROP POLICY IF EXISTS "Empresas pueden subir sus logos" ON storage.objects;
CREATE POLICY "Empresas pueden subir sus logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company_logos' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Empresas pueden actualizar sus logos" ON storage.objects;
CREATE POLICY "Empresas pueden actualizar sus logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company_logos' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
