-- 🛡️ ACTUALIZACIÓN DE MOTOR DE PRECIOS: DETECCION DE NOMBRES
-- Ejecuta este script en el SQL Editor de Supabase para activar el listado de nombres.

CREATE OR REPLACE FUNCTION public.get_vorian_price(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_km NUMERIC := (params->>'p_km')::NUMERIC;
    v_minutes NUMERIC := (params->>'p_minutes')::NUMERIC;
    v_vehicle_type TEXT := params->>'p_vehicle_type';
    v_weather TEXT := params->>'p_weather_main';
    v_pickup_date TIMESTAMPTZ := (params->>'p_pickup_date')::TIMESTAMPTZ;
    v_delivery_date TIMESTAMPTZ := (params->>'p_delivery_date')::TIMESTAMPTZ;
    v_route_geometry JSONB := params->>'p_route_geometry';
    
    v_base_fare NUMERIC := 65000;
    v_cost_per_km NUMERIC := 180;
    v_cost_per_min NUMERIC := 200;
    v_diesel_cost NUMERIC;
    v_fuel_efficiency NUMERIC := 2.2; -- Km por Litro (Camión Rampla)
    
    v_subtotal NUMERIC;
    v_commission NUMERIC;
    v_total NUMERIC;
    
    v_tolls_cost NUMERIC := 0;
    v_tolls_detected INTEGER := 0;
    v_tolls_names TEXT[];
    
    v_route_line GEOMETRY;
    v_multiplier NUMERIC := 1.0;
    v_is_early BOOLEAN := FALSE;
BEGIN
    -- 1. Convertir Ruta a Geometría PostGIS
    v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);

    -- 2. Detección Inteligente de Pórticos y Peajes (PostGIS)
    -- Buscamos pórticos a 50 metros del trazado
    SELECT 
        COALESCE(SUM(cost_rampla), 0),
        COUNT(*),
        ARRAY_AGG(name)
    INTO 
        v_tolls_cost,
        v_tolls_detected,
        v_tolls_names
    FROM public.porticos
    WHERE ST_DWithin(location::geometry, v_route_line, 0.0005);

    -- 3. Obtener Precio Diésel Actual (Settings)
    SELECT "dieselCostPerLiter" INTO v_diesel_cost FROM public.settings WHERE id = 'global';
    
    -- 4. Cálculo de Flete Base
    v_subtotal := v_base_fare 
                + (v_km / v_fuel_efficiency * v_diesel_cost) 
                + (v_km * v_cost_per_km) 
                + (v_minutes * v_cost_per_min);

    -- 5. Lógica de Multiplicadores (Urgencia/Clima)
    IF (v_pickup_date AT TIME ZONE 'America/Santiago')::date = now()::date THEN
        v_multiplier := v_multiplier + 0.20; -- +20% Urgencia por despacho hoy
    END IF;
    
    IF v_weather != 'Clear' THEN
        v_multiplier := v_multiplier + 0.05; -- +5% por Clima Complejo
    END IF;

    -- Aplicar Multiplicadores
    v_subtotal := v_subtotal * v_multiplier;

    -- 6. Sumar Peajes (Valor real detectado)
    v_subtotal := v_subtotal + v_tolls_cost;

    -- 7. Cálculo de Comisión (10%) y Total
    v_commission := v_subtotal * 0.10;
    v_total := v_subtotal + v_commission;

    -- Retornar Inteligencia Consolidada
    RETURN jsonb_build_object(
        'subtotal', ROUND(v_subtotal),
        'commission', ROUND(v_commission),
        'total', ROUND(v_total),
        'tolls_detected', v_tolls_detected,
        'tolls_cost', v_tolls_cost,
        'tolls_names', COALESCE(v_tolls_names, ARRAY[]::TEXT[]),
        'currency', 'CLP'
    );
END;
$$;
