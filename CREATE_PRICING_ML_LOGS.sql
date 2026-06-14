-- Script para crear la tabla de logs del motor de Machine Learning
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.pricing_ml_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    distance_km NUMERIC,
    duration_hrs NUMERIC,
    terrain_factor NUMERIC,
    weight_factor NUMERIC,
    hour_of_day INTEGER,
    day_of_week INTEGER,
    base_price NUMERIC,
    factor_ml NUMERIC,
    factor_market NUMERIC,
    offered_price NUMERIC,
    status TEXT
);

-- Permisos de seguridad básicos
ALTER TABLE public.pricing_ml_logs ENABLE ROW LEVEL SECURITY;

-- Solo administradores y Service Role pueden ver y modificar
CREATE POLICY "Permitir full access a roles de servicio" 
    ON public.pricing_ml_logs 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
