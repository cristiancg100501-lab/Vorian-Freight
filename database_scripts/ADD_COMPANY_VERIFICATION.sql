-- 1. Crear la tabla de companyProfiles si no existe
CREATE TABLE IF NOT EXISTS "companyProfiles" (
    "id" uuid PRIMARY KEY REFERENCES auth.users("id") ON DELETE CASCADE,
    "userId" uuid REFERENCES auth.users("id") ON DELETE CASCADE,
    "companyName" text,
    "rut" text,
    "address" text,
    "vehicleTypes" jsonb DEFAULT '[]'::jsonb,
    "status" text DEFAULT 'pending',
    "documents" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS en la tabla
ALTER TABLE "companyProfiles" ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para la tabla
DROP POLICY IF EXISTS "Public company profiles are viewable by everyone" ON "companyProfiles";
CREATE POLICY "Public company profiles are viewable by everyone" 
ON "companyProfiles" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own company profile" ON "companyProfiles";
CREATE POLICY "Users can insert their own company profile" 
ON "companyProfiles" FOR INSERT WITH CHECK (auth.uid() = "id");

DROP POLICY IF EXISTS "Users can update own company profile" ON "companyProfiles";
CREATE POLICY "Users can update own company profile" 
ON "companyProfiles" FOR UPDATE USING (auth.uid() = "id");

-- 2. Crear el Bucket de Almacenamiento para los documentos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company_documents', 'company_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Crear políticas RLS para el Bucket (Opcional, pero recomendado por seguridad)
DROP POLICY IF EXISTS "Empresas pueden subir sus propios documentos" ON storage.objects;
CREATE POLICY "Empresas pueden subir sus propios documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company_documents' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Admins pueden leer documentos" ON storage.objects;
CREATE POLICY "Admins pueden leer documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company_documents');
