CREATE OR REPLACE FUNCTION public.get_vorian_price(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- 📥 Parámetros de Entrada
    v_km NUMERIC := COALESCE((params->>'p_km')::NUMERIC, 0);
    v_minutes NUMERIC := COALESCE((params->>'p_minutes')::NUMERIC, 0);
    v_vehicle_type TEXT := LOWER(COALESCE(params->>'p_vehicle_type', 'rampla'));
    v_service_mode TEXT := COALESCE(params->>'p_service_mode', 'exclusive');
    v_cargo_units NUMERIC := COALESCE((params->>'p_cargo_units')::NUMERIC, 1);
    v_pickup_date TIMESTAMPTZ := COALESCE((params->>'p_pickup_date')::TIMESTAMPTZ, now());
    v_route_geometry TEXT := params->>'p_route_geometry';
    
    -- ⚙️ Variables
    v_costo_fijo_operacional NUMERIC;
    v_costo_variable_km NUMERIC;
    v_rendimiento_km_litro NUMERIC;
    v_diesel_cost NUMERIC := 1050.0;
    v_truck_capacity_units NUMERIC;
    v_category_key TEXT; -- 'cat1', 'cat2', 'cat3'
    v_category_num INTEGER; -- 1, 2, 3 (para matrices AVO)
    
    v_costo_combustible NUMERIC;
    v_subtotal_polinomio NUMERIC := 0;
    v_faf_percent NUMERIC := 0.0;
    
    v_standard_tolls_cost NUMERIC := 0;
    v_avo_total_cost NUMERIC := 0;
    v_avo_entry_ref TEXT;
    v_avo_exit_ref TEXT;
    
    v_route_line GEOMETRY;
    v_multiplier NUMERIC := 1.0;
    v_commission NUMERIC;
    v_total NUMERIC;
BEGIN
    -- 1. DETERMINAR CATEGORÍA Y PARÁMETROS BASE
    IF v_vehicle_type IN ('camion_3_4', 'camion ligero', 'camion_ligero') THEN
        v_costo_fijo_operacional := 65000;
        v_costo_variable_km := 450;
        v_rendimiento_km_litro := 5.5;
        v_truck_capacity_units := 8;
        v_category_key := 'cat2';
        v_category_num := 2;
    ELSIF v_vehicle_type IN ('camion', 'simple', 'camion_simple') THEN
        v_costo_fijo_operacional := 85000;
        v_costo_variable_km := 650;
        v_rendimiento_km_litro := 3.5;
        v_truck_capacity_units := 12;
        v_category_key := 'cat2';
        v_category_num := 2;
    ELSE -- Rampla / Pesado
        v_costo_fijo_operacional := 120000;
        v_costo_variable_km := 850;
        v_rendimiento_km_litro := 2.2;
        v_truck_capacity_units := 28;
        v_category_key := 'cat3';
        v_category_num := 3;
    END IF;

    -- 2. EXTRACCIÓN DEL VALOR DIÉSEL
    BEGIN
        SELECT "dieselCostPerLiter" INTO v_diesel_cost FROM public.settings WHERE id = 'global';
        IF v_diesel_cost IS NULL THEN v_diesel_cost := 1050.0; END IF;
    EXCEPTION WHEN OTHERS THEN
        v_diesel_cost := 1050.0; 
    END;

    -- 3. PEAJES (GEOSPATIAL)
    IF v_route_geometry IS NOT NULL AND v_route_geometry != '' THEN
        v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);
        
        -- A. PEAJES ESTÁNDAR (Usando tariffs_json)
        SELECT COALESCE(SUM((tariffs_json->v_category_key->>'price_tbfp')::NUMERIC), 0)
        INTO v_standard_tolls_cost
        FROM public.porticos
        WHERE ST_DWithin(location::geometry, v_route_line, 0.0005)
          AND (concession_name IS NULL OR concession_name != 'AVO');

        -- B. PEAJES AVO (Detección de tramo)
        WITH avo_intersection AS (
            SELECT reference_code, ST_LineLocatePoint(v_route_line, location::geometry) as pos
            FROM public.porticos
            WHERE ST_DWithin(location::geometry, v_route_line, 0.0005) AND concession_name = 'AVO'
        )
        SELECT 
            (SELECT reference_code FROM avo_intersection ORDER BY pos ASC LIMIT 1),
            (SELECT reference_code FROM avo_intersection ORDER BY pos DESC LIMIT 1)
        INTO v_avo_entry_ref, v_avo_exit_ref;

        IF v_avo_entry_ref IS NOT NULL AND v_avo_exit_ref IS NOT NULL THEN
            SELECT COALESCE(tbfp_price, 0) INTO v_avo_total_cost
            FROM public.concession_matrices
            WHERE LOWER(TRIM(entry_portico_ref)) = LOWER(TRIM(v_avo_entry_ref)) 
              AND LOWER(TRIM(exit_portico_ref)) = LOWER(TRIM(v_avo_exit_ref))
              AND vehicle_category = v_category_num;
        END IF;
    END IF;

    -- 4. MATEMÁTICA DEL POLINOMIO DE COSTOS
    v_costo_combustible := (v_km / v_rendimiento_km_litro) * v_diesel_cost;
    v_subtotal_polinomio := v_costo_fijo_operacional + (v_km * v_costo_variable_km) + v_costo_combustible + v_standard_tolls_cost + v_avo_total_cost;

    -- 5. CONSOLIDADO (LTL) vs EXCLUSIVO (FTL)
    IF v_service_mode = 'consolidated' THEN
        -- Si es consolidado, el costo base se divide por la capacidad y se multiplica por lo que ocupa
        v_subtotal_polinomio := (v_subtotal_polinomio / v_truck_capacity_units) * v_cargo_units;
    END IF;

    -- 6. CÁLCULO DE COMISIÓN (Take Rate) Y TOTAL
    v_commission := v_subtotal_polinomio * 0.15; -- 15% Take Rate
    v_total := v_subtotal_polinomio + v_commission;

    RETURN jsonb_build_object(
        'subtotal_base', ROUND(v_subtotal_polinomio),
        'tolls_cost', ROUND(v_standard_tolls_cost + v_avo_total_cost),
        'avo_cost', ROUND(v_avo_total_cost),
        'standard_tolls', ROUND(v_standard_tolls_cost),
        'commission', ROUND(v_commission),
        'total', ROUND(v_total),
        'factors', jsonb_build_object(
            'distance_total', v_km,
            'duration_total', v_minutes,
            'diesel_cost', ROUND(v_costo_combustible),
            'fixed_cost', ROUND(v_costo_fijo_operacional),
            'variable_cost', ROUND(v_km * v_costo_variable_km),
            'vehicle_category_used', v_category_key,
            'service_mode', v_service_mode
        )
    );
END;
$$;
