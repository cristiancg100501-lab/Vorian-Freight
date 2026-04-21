-- 🛡️ MOTOR DE PRECIOS VORIAN 3.1 (AVO DATA FIX)
-- Corrección de nombres de columnas y parámetros de búsqueda para AVO.

CREATE OR REPLACE FUNCTION public.get_vorian_price(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- 📥 Parámetros de Entrada
    v_km NUMERIC := COALESCE((params->>'p_km')::NUMERIC, 0);
    v_minutes NUMERIC := COALESCE((params->>'p_minutes')::NUMERIC, 0);
    v_vehicle_type TEXT := COALESCE(params->>'p_vehicle_type', 'rampla');
    v_weather TEXT := COALESCE(params->>'p_weather_main', 'Clear');
    v_pickup_date TIMESTAMPTZ := COALESCE((params->>'p_pickup_date')::TIMESTAMPTZ, now());
    v_route_geometry TEXT := params->>'p_route_geometry';
    
    -- ⚙️ Variables del Polinomio Estructural
    v_costo_fijo_operacional NUMERIC := 120000;
    v_costo_variable_km NUMERIC := 850;
    v_rendimiento_km_litro NUMERIC := 2.0;
    v_diesel_cost NUMERIC := 1050.0;
    
    -- 📈 Acumuladores
    v_costo_combustible NUMERIC;
    v_subtotal_polinomio NUMERIC := 0;
    v_faf_percent NUMERIC := 0.0;
    
    -- 🚧 Peajes Estándar
    v_standard_tolls_cost NUMERIC := 0;
    v_tolls_detected INTEGER := 0;
    v_standard_tolls_names TEXT[] := ARRAY[]::TEXT[];
    
    -- 🔀 Peajes Concesión (AVO)
    v_avo_total_cost NUMERIC := 0;
    v_avo_entry_ref TEXT;
    v_avo_exit_ref TEXT;
    v_category_num INTEGER; -- 1, 2, 3
    
    -- ⏱️ Horario Punta
    v_current_hour_min INTEGER;
    v_day_of_week INTEGER;
    v_is_peak BOOLEAN := FALSE;
    
    -- 🛰️ Geospatial
    v_route_line GEOMETRY;
    v_multiplier NUMERIC := 1.0;
    v_commission NUMERIC;
    v_total NUMERIC;
BEGIN
    -- 1. PREPARACIÓN GEOMÉTRICA
    IF v_route_geometry IS NOT NULL AND v_route_geometry != '' THEN
        v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);
        
        -- A. PEAJES ESTÁNDAR
        SELECT 
            COALESCE(SUM(cost_rampla), 0),
            COUNT(*),
            ARRAY_AGG(DISTINCT name) FILTER (WHERE name IS NOT NULL)
        INTO 
            v_standard_tolls_cost,
            v_tolls_detected,
            v_standard_tolls_names
        FROM public.porticos
        WHERE ST_DWithin(location::geometry, v_route_line, 0.0005)
          AND (concession_name IS NULL OR concession_name != 'AVO');

        -- B. DETECCIÓN DE TRAMO AVO
        WITH avo_intersection AS (
            SELECT 
                reference_code,
                ST_LineLocatePoint(v_route_line, location::geometry) as pos
            FROM public.porticos
            WHERE ST_DWithin(location::geometry, v_route_line, 0.0005)
              AND concession_name = 'AVO'
        )
        SELECT 
            (SELECT reference_code FROM avo_intersection ORDER BY pos ASC LIMIT 1),
            (SELECT reference_code FROM avo_intersection ORDER BY pos DESC LIMIT 1)
        INTO 
            v_avo_entry_ref,
            v_avo_exit_ref;

        -- C. LOGICA DE PRECIOS AVO
        IF v_avo_entry_ref IS NOT NULL AND v_avo_exit_ref IS NOT NULL THEN
            
            -- Categoría numérica
            v_category_num := CASE 
                WHEN v_vehicle_type IN ('furgon', 'pickup', 'camioneta') THEN 1
                WHEN v_vehicle_type IN ('camion', 'simple', 'camion_simple') THEN 2
                WHEN v_vehicle_type IN ('rampla', 'camion_rampla') THEN 3
                ELSE 3
            END;

            v_current_hour_min := (EXTRACT(HOUR FROM (v_pickup_date AT TIME ZONE 'America/Santiago')) * 60) + 
                                  EXTRACT(MINUTE FROM (v_pickup_date AT TIME ZONE 'America/Santiago'));
            v_day_of_week := EXTRACT(DOW FROM (v_pickup_date AT TIME ZONE 'America/Santiago'));

            IF v_day_of_week BETWEEN 1 AND 5 THEN
                IF (v_current_hour_min BETWEEN 450 AND 570) OR (v_current_hour_min BETWEEN 1050 AND 1170) THEN
                    v_is_peak := TRUE;
                END IF;
            END IF;

            -- Búsqueda en matriz con nombres de columnas reales: tbp_price, tbfp_price
            SELECT 
                CASE WHEN v_is_peak THEN tbp_price ELSE tbfp_price END
            INTO v_avo_total_cost
            FROM public.concession_matrices
            WHERE LOWER(TRIM(entry_portico_ref)) = LOWER(TRIM(v_avo_entry_ref)) 
              AND LOWER(TRIM(exit_portico_ref)) = LOWER(TRIM(v_avo_exit_ref))
              AND category = v_category_num;
              
            IF v_avo_total_cost IS NULL THEN
                v_avo_total_cost := 0;
            END IF;
        END IF;
    END IF;

    -- 2. EXTRACCIÓN DEL VALOR DIÉSEL
    BEGIN
        SELECT "dieselCostPerLiter" INTO v_diesel_cost FROM public.settings WHERE id = 'global';
        IF v_diesel_cost IS NULL THEN v_diesel_cost := 1050.0; END IF;
    EXCEPTION WHEN OTHERS THEN
        v_diesel_cost := 1050.0; 
    END;

    -- 3. CÁLCULO DEL POLINOMIO
    IF v_diesel_cost > 900 THEN
        v_faf_percent := ((v_diesel_cost - 900) / 20) * 0.005;
    END IF;

    v_costo_combustible := (v_km / v_rendimiento_km_litro) * v_diesel_cost;
    v_subtotal_polinomio := v_costo_fijo_operacional + v_costo_combustible + (v_km * v_costo_variable_km);
    v_subtotal_polinomio := (v_subtotal_polinomio * v_multiplier) * (1 + v_faf_percent);

    -- 4. SUMAR PEAJES
    v_subtotal_polinomio := v_subtotal_polinomio + v_standard_tolls_cost + COALESCE(v_avo_total_cost, 0);

    -- 5. COMISIÓN Y TOTAL
    v_commission := v_subtotal_polinomio * 0.10;
    v_total := v_subtotal_polinomio + v_commission;

    -- 6. RETORNO
    RETURN jsonb_build_object(
        'subtotal', ROUND(v_subtotal_polinomio),
        'commission', ROUND(v_commission),
        'total', ROUND(v_total),
        'tolls_detected', v_tolls_detected + CASE WHEN v_avo_entry_ref IS NOT NULL THEN 1 ELSE 0 END,
        'tolls_cost', v_standard_tolls_cost + COALESCE(v_avo_total_cost, 0),
        'avo_details', jsonb_build_object(
            'entry', v_avo_entry_ref,
            'exit', v_avo_exit_ref,
            'is_peak', v_is_peak,
            'price', v_avo_total_cost
        ),
        'tolls_names', COALESCE(v_standard_tolls_names, ARRAY[]::TEXT[]) || 
                       CASE WHEN v_avo_entry_ref IS NOT NULL THEN ARRAY['Tramo AVO: ' || v_avo_entry_ref || ' -> ' || v_avo_exit_ref] ELSE ARRAY[]::TEXT[] END,
        'currency', 'CLP',
        'status', 'avo_engine_fixed_v3.1'
    );
END;
$$;
