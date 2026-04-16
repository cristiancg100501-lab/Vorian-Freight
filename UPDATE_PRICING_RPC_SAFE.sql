-- 🛡️ MOTOR DE PRECIOS VORIAN 2.0 (POLINOMIO DE TRANSPORTE ESTRUCTURAL)
-- Ejecuta este script COMPLETO en tu SQL EDITOR de Supabase.
-- Este script utiliza el "Polinomio de Transporte" para cotizaciones rentables y apegadas al mercado de ramplas.

CREATE OR REPLACE FUNCTION public.get_vorian_price(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Parámetros de Entrada
    v_km NUMERIC := COALESCE((params->>'p_km')::NUMERIC, 0);
    v_minutes NUMERIC := COALESCE((params->>'p_minutes')::NUMERIC, 0);
    v_vehicle_type TEXT := params->>'p_vehicle_type';
    v_weather TEXT := COALESCE(params->>'p_weather_main', 'Clear');
    v_pickup_date TIMESTAMPTZ := COALESCE((params->>'p_pickup_date')::TIMESTAMPTZ, now());
    v_delivery_date TIMESTAMPTZ := (params->>'p_delivery_date')::TIMESTAMPTZ;
    v_route_geometry TEXT := params->>'p_route_geometry';
    
    -- Variables del Polinomio Estructural (Rampla 30 Tons)
    v_costo_fijo_operacional NUMERIC := 120000; -- Posicionamiento, horas de carga/descarga, sueldo diario base.
    v_costo_variable_km NUMERIC := 850; -- Desgaste, amortización del equipo, neumáticos (18 ruedas).
    v_rendimiento_km_litro NUMERIC := 2.0; -- Rendimiento real estimado para equipo pesado.
    v_diesel_cost NUMERIC := 1050.0; -- Valor de mercado seguro por defecto.
    
    -- Acumuladores 
    v_costo_combustible NUMERIC;
    v_subtotal_polinomio NUMERIC := 0;
    v_faf_percent NUMERIC := 0.0; -- Factor Ajuste Flete
    
    -- Variables Peajes (PostGIS)
    v_tolls_cost NUMERIC := 0;
    v_tolls_detected INTEGER := 0;
    v_tolls_names TEXT[] := ARRAY[]::TEXT[];
    
    -- Entidades de Procesamiento
    v_route_line GEOMETRY;
    v_multiplier NUMERIC := 1.0;
    v_commission NUMERIC;
    v_total NUMERIC;
BEGIN
    -- 1. DETECCIÓN DE PEAJES INTELIGENTE (SAFE MODE)
    BEGIN
        IF v_route_geometry IS NOT NULL AND v_route_geometry != '' THEN
            v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);
            
            SELECT 
                COALESCE(SUM(cost_rampla), 0),
                COUNT(*),
                ARRAY_AGG(DISTINCT name) FILTER (WHERE name IS NOT NULL)
            INTO 
                v_tolls_cost,
                v_tolls_detected,
                v_tolls_names
            FROM public.porticos
            WHERE ST_DWithin(location::geometry, v_route_line, 0.0005);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_tolls_cost := 0;
        v_tolls_detected := 0;
        v_tolls_names := ARRAY[]::TEXT[];
    END;

    -- 2. EXTRACCIÓN DEL VALOR DIÉSEL
    BEGIN
        SELECT "dieselCostPerLiter" INTO v_diesel_cost FROM public.settings WHERE id = 'global';
        IF v_diesel_cost IS NULL THEN
            v_diesel_cost := 1050.0;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_diesel_cost := 1050.0; 
    END;

    -- 3. CÁLCULO DEL "FA" (Factor de Ajuste de Flete Autómata)
    -- Si el diésel supera los $900 CLP, sumamos 0.5% extra por cada $20 pesos de alza técnica.
    IF v_diesel_cost > 900 THEN
        v_faf_percent := ((v_diesel_cost - 900) / 20) * 0.005;
    END IF;

    -- 4. CONSTRUCCIÓN DEL POLINOMIO LOGÍSTICO (Costo Fijo + Costo Combustible + Costo Variable)
    v_costo_combustible := (v_km / v_rendimiento_km_litro) * v_diesel_cost;
    v_subtotal_polinomio := v_costo_fijo_operacional + v_costo_combustible + (v_km * v_costo_variable_km);

    -- 5. MULTIPLICADORES CONTEXTUALES (Cerebro Comercial)
    -- Si es para despacho hoy mismo (Inmediatez del mercado spot)
    IF (v_pickup_date AT TIME ZONE 'America/Santiago')::date = now()::date THEN
        v_multiplier := v_multiplier + 0.20;
    END IF;
    
    -- Condiciones limitantes en la ruta (Ej: Lluvia o Nevadas requieren más cuidado)
    IF v_weather != 'Clear' THEN
        v_multiplier := v_multiplier + 0.10;
    END IF;

    -- Aplicar estrés comercial al polinomio base
    v_subtotal_polinomio := v_subtotal_polinomio * v_multiplier;

    -- 6. APLICAR FAF (Protección Anti-Inflación Combustible)
    v_subtotal_polinomio := v_subtotal_polinomio * (1 + v_faf_percent);

    -- 7. SUMAR REEMBOLSO PEAJES EXACTOS (PostGIS + TAG)
    v_subtotal_polinomio := v_subtotal_polinomio + COALESCE(v_tolls_cost, 0);

    -- 8. RENTABILIDAD PLATAFORMA (Comisión Vorian)
    v_commission := v_subtotal_polinomio * 0.10;
    v_total := v_subtotal_polinomio + v_commission;

    -- RETORNO DEL ESTADO FINANCIERO AL CLIENTE WEB
    RETURN jsonb_build_object(
        'subtotal', ROUND(v_subtotal_polinomio),
        'commission', ROUND(v_commission),
        'total', ROUND(v_total),
        'tolls_detected', v_tolls_detected,
        'tolls_cost', v_tolls_cost,
        'tolls_names', COALESCE(v_tolls_names, ARRAY[]::TEXT[]),
        'currency', 'CLP',
        'status', 'polinomio_v2_active'
    );
END;
$$;
