-- 🚛 TABLA DE VEHÍCULOS DE LA FLOTA
-- Permite a las empresas gestionar su flota de vehículos.

CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "driverId" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    "licensePlate" TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Desactivamos RLS para asegurar que funcione sin bloqueos mientras pruebas, 
-- pero puedes activarlo luego si lo requieres.
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
