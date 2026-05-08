-- 🚀 VORIAN PRICING ENGINE v2.0 (Chile Container Edition)
-- Este script sincroniza el motor de precios con la realidad del mercado chileno.

CREATE OR REPLACE FUNCTION public.get_vorian_price(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Inputs
    v_km NUMERIC := (params->>'p_km')::NUMERIC;
    v_minutes NUMERIC := (params->>'p_minutes')::NUMERIC;
    v_vehicle_type TEXT := params->>'p_vehicle_type';
    v_weather TEXT := params->>'p_weather_main';
    v_pickup_date TIMESTAMPTZ := (params->>'p_pickup_date')::TIMESTAMPTZ;
    v_route_geometry JSONB := params->>'p_route_geometry';
    
    -- Configuración desde Tablas (Dinámico)
    v_base_fare NUMERIC;
    v_cost_per_km NUMERIC;
    v_cost_per_min NUMERIC;
    v_fuel_efficiency NUMERIC;
    v_diesel_cost NUMERIC;
    v_commission_rate NUMERIC;
    
    -- Resultados
    v_subtotal NUMERIC;
    v_commission NUMERIC;
    v_total NUMERIC;
    v_tolls_cost NUMERIC := 0;
    v_tolls_detected INTEGER := 0;
    v_tolls_names TEXT[];
    
    v_route_line GEOMETRY;
    v_multiplier NUMERIC := 1.0;
BEGIN
    -- 1. Obtener Tarifas Dinámicas de la tabla vehicleRates
    SELECT 
        "baseFare", "costPerKm", "costPerMinute", "fuelEfficiency"
    INTO 
        v_base_fare, v_cost_per_km, v_cost_per_min, v_fuel_efficiency
    FROM public."vehicleRates"
    WHERE id = v_vehicle_type;

    -- Fallback si no existe el tipo de vehículo
    IF v_base_fare IS NULL THEN
        v_base_fare := 120000;
        v_cost_per_km := 450;
        v_cost_per_min := 30;
        v_fuel_efficiency := 3.5;
    END IF;

    -- 2. Obtener Ajustes Globales (Diesel y Comisión)
    SELECT 
        "dieselCostPerLiter", "vorianCommission"
    INTO 
        v_diesel_cost, v_commission_rate
    FROM public.settings 
    WHERE id = 'global';

    -- 3. Detección de Peajes vía PostGIS (Si hay geometría)
    IF v_route_geometry IS NOT NULL THEN
        v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);
        
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
    END IF;

    -- 4. CÁLCULO MAESTRO (Flete Chileno)
    -- Formula: Base + Consumo Diesel + Desgaste KM + Tiempo
    v_subtotal := v_base_fare 
                + (v_km / v_fuel_efficiency * v_diesel_cost) 
                + (v_km * v_cost_per_km) 
                + (v_minutes * v_cost_per_min);

    -- 5. Multiplicador de Urgencia (Solo Despacho Hoy)
    IF (v_pickup_date AT TIME ZONE 'America/Santiago')::date = (now() AT TIME ZONE 'America/Santiago')::date THEN
        v_multiplier := v_multiplier + 0.15; -- +15% por urgencia inmediata
    END IF;

    v_subtotal := v_subtotal * v_multiplier;

    -- 6. Sumar Peajes Reales
    v_subtotal := v_subtotal + v_tolls_cost;

    -- 7. Comisión y Total Final
    v_commission := v_subtotal * (v_commission_rate / 100);
    v_total := v_subtotal + v_commission;

    -- Retornar Objeto Inteligente
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
