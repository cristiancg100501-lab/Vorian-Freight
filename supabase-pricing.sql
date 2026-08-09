-- ==========================================
-- PRICING RULES (Motor Dinámico de Cotizaciones)
-- ==========================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_id TEXT NOT NULL,
    destination_id TEXT NOT NULL,
    cargo_type TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CLP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add a unique constraint to prevent duplicate exact routes
ALTER TABLE public.pricing_rules
ADD CONSTRAINT unique_pricing_route UNIQUE (origin_id, destination_id, cargo_type);

-- 3. Enable RLS
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Everyone (anon/public) can read the pricing rules to run the calculator
DROP POLICY IF EXISTS "Anyone can read pricing rules" ON public.pricing_rules;
CREATE POLICY "Anyone can read pricing rules"
ON public.pricing_rules FOR SELECT
USING (true);

-- Only admins can insert/update/delete
-- Uses the same role check pattern found in userProfiles
DROP POLICY IF EXISTS "Admins can manage pricing rules" ON public.pricing_rules;
CREATE POLICY "Admins can manage pricing rules"
ON public.pricing_rules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public."userProfiles"
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);
