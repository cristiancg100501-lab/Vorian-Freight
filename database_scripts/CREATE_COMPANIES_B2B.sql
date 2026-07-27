-- ==============================================================================
-- MIGRACIÓN Y ARQUITECTURA B2B: SEPARACIÓN DE EMPRESAS Y USUARIOS (PERSONAS)
-- Vorian Logistics Platform
-- ==============================================================================

-- 1. Tabla de Empresas (Companies / Entidades Legales)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,                  -- Razón Social (ej: Vorian Logistics SpA)
    trade_name TEXT,                             -- Nombre Fantasía (ej: Vorian Logistics)
    rut TEXT UNIQUE,                             -- RUT Empresa (ej: 76.123.456-7)
    type TEXT NOT NULL CHECK (type IN ('CARRIER', 'CUSTOMER', 'BOTH')), -- CARRIER = Transportista, CUSTOMER = Mandante
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Relación Miembros (Usuarios Personas ↔ Empresas)
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."userProfiles"(id) ON DELETE CASCADE,
    member_role TEXT DEFAULT 'MEMBER' CHECK (member_role IN ('OWNER', 'ADMIN', 'DISPATCHER', 'MEMBER')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- 3. Campos de Vinculación de Choferes a Empresas de Transporte
ALTER TABLE public."driverProfiles" 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'INDEPENDENT' CHECK (employment_type IN ('INDEPENDENT', 'EMPLOYEE', 'CONTRACTOR'));

ALTER TABLE public."userProfiles"
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Indexación de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_companies_rut ON public.companies(rut);
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(type);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_company ON public."driverProfiles"(company_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad para companies
DROP POLICY IF EXISTS "Admin full access to companies" ON public.companies;
CREATE POLICY "Admin full access to companies" ON public.companies
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."userProfiles"
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
CREATE POLICY "Users can view their own companies" ON public.companies
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_id = companies.id AND user_id = auth.uid() AND is_active = true
        )
    );

-- Políticas de Seguridad para company_members
DROP POLICY IF EXISTS "Admin full access to company_members" ON public.company_members;
CREATE POLICY "Admin full access to company_members" ON public.company_members
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."userProfiles"
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Members can view their company peers" ON public.company_members;
CREATE POLICY "Members can view their company peers" ON public.company_members
    FOR SELECT TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
    );

-- 5. Migración de Datos Existentes (Bloque Anónimo Unificado)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Migrar Empresas Transportistas (companyProfiles)
    FOR r IN SELECT * FROM public."companyProfiles" LOOP
        IF r."companyName" IS NOT NULL AND r."companyName" <> '' THEN
            INSERT INTO public.companies (id, company_name, rut, type, address, created_at)
            VALUES (
                r.id, 
                r."companyName", 
                NULLIF(r.rut, ''), 
                'CARRIER', 
                r.address, 
                NOW()
            )
            ON CONFLICT (id) DO UPDATE 
            SET company_name = EXCLUDED.company_name, type = 'CARRIER';

            IF r."userId" IS NOT NULL THEN
                INSERT INTO public.company_members (company_id, user_id, member_role)
                VALUES (r.id, r."userId", 'OWNER')
                ON CONFLICT (company_id, user_id) DO NOTHING;
            END IF;
        END IF;
    END LOOP;

    -- Migrar Empresas Mandantes (clientProfiles)
    FOR r IN SELECT * FROM public."clientProfiles" LOOP
        IF r."companyName" IS NOT NULL AND r."companyName" <> '' THEN
            INSERT INTO public.companies (id, company_name, rut, type, address, created_at)
            VALUES (
                r.id, 
                r."companyName", 
                NULLIF(r.rut, ''), 
                'CUSTOMER', 
                r.address, 
                NOW()
            )
            ON CONFLICT (id) DO UPDATE 
            SET company_name = EXCLUDED.company_name;

            IF r."userId" IS NOT NULL THEN
                INSERT INTO public.company_members (company_id, user_id, member_role)
                VALUES (r.id, r."userId", 'OWNER')
                ON CONFLICT (company_id, user_id) DO NOTHING;
            END IF;
        END IF;
    END LOOP;

    -- Migrar Choferes asociados a empresas en company_members
    FOR r IN SELECT id, company_id FROM public."driverProfiles" WHERE company_id IS NOT NULL LOOP
        INSERT INTO public.company_members (company_id, user_id, member_role)
        VALUES (r.company_id, r.id, 'MEMBER')
        ON CONFLICT (company_id, user_id) DO NOTHING;
    END LOOP;
END $$;
