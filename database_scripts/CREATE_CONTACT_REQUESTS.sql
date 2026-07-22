-- CREATE_CONTACT_REQUESTS.sql
-- Script para crear la tabla de solicitudes de contacto / leads

CREATE TABLE IF NOT EXISTS public.contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL,
    volume TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'Nuevo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir inserciones públicas anónimas
CREATE POLICY "Permitir inserciones publicas anonimas" 
ON public.contact_requests 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Crear política para permitir a los administradores ver todas las solicitudes
CREATE POLICY "Permitir administradores ver todas las solicitudes" 
ON public.contact_requests 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public."userProfiles"
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Crear política para permitir a los administradores actualizar las solicitudes
CREATE POLICY "Permitir administradores actualizar solicitudes" 
ON public.contact_requests 
FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public."userProfiles"
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public."userProfiles"
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Crear política para permitir a los administradores eliminar solicitudes
CREATE POLICY "Permitir administradores eliminar solicitudes" 
ON public.contact_requests 
FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public."userProfiles"
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Habilitar la replicación en tiempo real para esta tabla
alter publication supabase_realtime add table public.contact_requests;
