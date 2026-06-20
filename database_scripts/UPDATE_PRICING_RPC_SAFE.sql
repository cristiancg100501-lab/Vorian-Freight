-- 🛡️ MOTOR DE PRECIOS VORIAN 6.0 (MASTER ENGINE - UNIFICADO CON ADMIN)
-- Esta versión porta la lógica exacta del Simulador Administrativo (Admin Tolls Calculator).

-- Helper 1: Verificador de Ventanas Horarias (Soporta [H])
CREATE OR REPLACE FUNCTION public.vorian_is_in_window(p_windows TEXT, p_mins INTEGER, p_require_h BOOLEAN)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_bands TEXT[];
    v_b TEXT;
    v_clean_band TEXT;
    v_has_h BOOLEAN;
    v_range TEXT[];
    v_start_m INTEGER;
    v_end_m INTEGER;
BEGIN
    IF p_windows IS NULL OR p_windows = '' THEN RETURN FALSE; END IF;
    v_bands := string_to_array(p_windows, '/');
    FOREACH v_b IN ARRAY v_bands LOOP
        v_b := trim(v_b);
        v_has_h := v_b LIKE '%[H]%';
        IF p_require_h AND NOT v_has_h THEN CONTINUE; END IF;
        
        v_clean_band := trim(replace(v_b, '[H]', ''));
        v_range := string_to_array(v_clean_band, '-');
        IF array_length(v_range, 1) != 2 THEN CONTINUE; END IF;
        
        -- Parse HH:MM to minutes
        v_start_m := (split_part(trim(v_range[1]), ':', 1)::INTEGER * 60) + split_part(trim(v_range[1]), ':', 2)::INTEGER;
        v_end_m := (split_part(trim(v_range[2]), ':', 1)::INTEGER * 60) + split_part(trim(v_range[2]), ':', 2)::INTEGER;
        
        IF v_start_m <= v_end_m THEN
            IF p_mins >= v_start_m AND p_mins <= v_end_m THEN RETURN TRUE; END IF;
        ELSE
            IF p_mins >= v_start_m OR p_mins <= v_end_m THEN RETURN TRUE; END IF;
        END IF;
    END LOOP;
    RETURN FALSE;
END;
$$;

-- Helper 2: Calculador de Costo por Pórtico
CREATE OR REPLACE FUNCTION public.vorian_calculate_toll_cost(
    p_tariffs JSONB,
    p_category TEXT,
    p_visit_date TIMESTAMPTZ,
    p_concession_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_cat_data JSONB;
    v_hh INTEGER;
    v_mm INTEGER;
    v_time_total_mins INTEGER;
    v_day_of_week INTEGER; 
    
    v_is_holiday BOOLEAN := FALSE;
    v_is_eve BOOLEAN := FALSE;
    v_is_high_season BOOLEAN := FALSE;
    v_tomorrow TIMESTAMPTZ;
    
    v_price NUMERIC := 0;
    v_tag TEXT := 'TBFP (Base)';
    v_color TEXT := 'green-500';
    
    v_m INTEGER;
    v_d INTEGER;
    v_holidays TEXT[] := ARRAY['1-1', '3-29', '3-30', '5-1', '5-21', '6-20', '6-29', '7-16', '8-15', '9-18', '9-19', '9-20', '10-12', '10-31', '11-1', '12-8', '12-25'];
BEGIN
    v_cat_data := p_tariffs->p_category;
    IF v_cat_data IS NULL OR v_cat_data = '{}'::jsonb THEN
        RETURN jsonb_build_object('price', 0, 'tag', 'SIN TARIFA', 'color', 'gray-400');
    END IF;

    v_hh := EXTRACT(HOUR FROM (p_visit_date AT TIME ZONE 'America/Santiago'))::INTEGER;
    v_mm := EXTRACT(MINUTE FROM (p_visit_date AT TIME ZONE 'America/Santiago'))::INTEGER;
    v_time_total_mins := (v_hh * 60) + v_mm;
    v_day_of_week := EXTRACT(DOW FROM (p_visit_date AT TIME ZONE 'America/Santiago'))::INTEGER;
    
    v_m := EXTRACT(MONTH FROM (p_visit_date AT TIME ZONE 'America/Santiago'))::INTEGER;
    v_d := EXTRACT(DAY FROM (p_visit_date AT TIME ZONE 'America/Santiago'))::INTEGER;
    v_is_holiday := (v_m::text || '-' || v_d::text) = ANY(v_holidays);
    
    v_tomorrow := p_visit_date + interval '1 day';
    v_is_eve := (EXTRACT(MONTH FROM (v_tomorrow AT TIME ZONE 'America/Santiago'))::text || '-' || EXTRACT(DAY FROM (v_tomorrow AT TIME ZONE 'America/Santiago'))::text) = ANY(v_holidays);
    
    v_is_high_season := (v_m = 12 AND v_d >= 20) OR (v_m = 1) OR (v_m = 2) OR (v_m = 3 AND v_d <= 10);

    -- 1. Feriados con [H]
    IF v_is_holiday THEN
        IF public.vorian_is_in_window(v_cat_data->>'ts_laboral', v_time_total_mins, TRUE) OR 
           public.vorian_is_in_window(v_cat_data->>'ts_sabado', v_time_total_mins, TRUE) OR 
           public.vorian_is_in_window(v_cat_data->>'ts_domingo', v_time_total_mins, TRUE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_ts')::NUMERIC, 'tag', 'TS FERIADO', 'color', 'red-500');
        END IF;
        IF public.vorian_is_in_window(v_cat_data->>'tbp_laboral', v_time_total_mins, TRUE) OR 
           public.vorian_is_in_window(v_cat_data->>'tbp_sabado', v_time_total_mins, TRUE) OR 
           public.vorian_is_in_window(v_cat_data->>'tbp_domingo', v_time_total_mins, TRUE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_tbp')::NUMERIC, 'tag', 'TBP FERIADO', 'color', 'blue-500');
        END IF;
    END IF;

    -- 2. Viernes / Vísperas (Ruta 78)
    IF (v_day_of_week = 5) OR (p_concession_name = 'Ruta 78' AND v_is_eve) THEN
        IF public.vorian_is_in_window(COALESCE(v_cat_data->>'ts_viernes', v_cat_data->>'ts_laboral'), v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_ts')::NUMERIC, 'tag', CASE WHEN v_is_eve THEN 'TS VÍSPERA' ELSE 'TS VIERNES' END, 'color', 'red-500');
        END IF;
        IF public.vorian_is_in_window(COALESCE(v_cat_data->>'tbp_viernes', v_cat_data->>'tbp_laboral'), v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_tbp')::NUMERIC, 'tag', CASE WHEN v_is_eve THEN 'TBP VÍSPERA' ELSE 'TBP VIERNES' END, 'color', 'blue-600');
        END IF;
    END IF;

    -- 3. Días Estándar
    IF v_day_of_week = 0 THEN -- Domingo
        IF public.vorian_is_in_window(v_cat_data->>'ts_domingo', v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_ts')::NUMERIC, 'tag', 'TS DOMINGO', 'color', 'red-500');
        END IF;
        IF public.vorian_is_in_window(v_cat_data->>'tbp_domingo', v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_tbp')::NUMERIC, 'tag', 'TBP DOMINGO', 'color', 'blue-500');
        END IF;
    ELSIF v_day_of_week = 6 OR v_is_holiday THEN -- Sábado o feriado (si no hubo match [H])
        IF public.vorian_is_in_window(v_cat_data->>'ts_sabado', v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_ts')::NUMERIC, 'tag', 'TS SÁBADO', 'color', 'red-500');
        END IF;
        IF public.vorian_is_in_window(v_cat_data->>'tbp_sabado', v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_tbp')::NUMERIC, 'tag', 'TBP SÁBADO', 'color', 'blue-500');
        END IF;
    ELSE -- Lunes a Jueves
        IF public.vorian_is_in_window(v_cat_data->>'ts_laboral', v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_ts')::NUMERIC, 'tag', 'TS LABORAL', 'color', 'red-500');
        END IF;
        IF public.vorian_is_in_window(v_cat_data->>'tbp_laboral', v_time_total_mins, FALSE) THEN
            RETURN jsonb_build_object('price', (v_cat_data->>'price_tbp')::NUMERIC, 'tag', 'TBP LABORAL', 'color', 'amber-500');
        END IF;
    END IF;

    -- 4. Regla Especial Ruta 78 (Fin de semana/Punta estacional)
    IF p_concession_name = 'Ruta 78' THEN
        IF v_day_of_week = 0 OR v_day_of_week = 6 OR v_is_holiday THEN
            v_price := COALESCE((v_cat_data->>'price_ts')::NUMERIC, (v_cat_data->>'price_tbp')::NUMERIC, (v_cat_data->>'price_tbfp')::NUMERIC);
        ELSE
            v_price := (v_cat_data->>'price_tbfp')::NUMERIC;
        END IF;
        RETURN jsonb_build_object('price', v_price, 'tag', 'RUTA 78', 'color', 'blue-600');
    END IF;

    RETURN jsonb_build_object('price', (v_cat_data->>'price_tbfp')::NUMERIC, 'tag', 'TBFP (Base)', 'color', 'green-500');
END;
$$;

-- RPC MAESTRO V6.0
CREATE OR REPLACE FUNCTION public.get_vorian_price(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- 📥 Parámetros
    v_km NUMERIC := COALESCE((params->>'p_km')::NUMERIC, 0);
    v_minutes NUMERIC := COALESCE((params->>'p_minutes')::NUMERIC, 0);
    v_vehicle_type TEXT := COALESCE(params->>'p_vehicle_type', 'rampla');
    v_pickup_date TIMESTAMPTZ := COALESCE((params->>'p_pickup_date')::TIMESTAMPTZ, now());
    v_delivery_date TIMESTAMPTZ := COALESCE((params->>'p_delivery_date')::TIMESTAMPTZ, v_pickup_date + interval '1 day');
    v_route_geometry TEXT := params->>'p_route_geometry';
    
    -- 🏨 Pernocte
    v_overnight_rate NUMERIC := 0;
    v_nights INTEGER := 0;
    v_overnight_total NUMERIC := 0;
    
    -- 🚧 Peajes
    v_total_tolls_cost NUMERIC := 0;
    v_tolls_breakdown JSONB := '[]'::jsonb;
    v_tolls_names TEXT[] := ARRAY[]::TEXT[];
    v_portico RECORD;
    
    -- 🔀 AVO
    v_avo_total_cost NUMERIC := 0;
    v_avo_entry_ref TEXT;
    v_avo_exit_ref TEXT;
    
    -- 🛰️ Geospatial
    v_route_line GEOMETRY;
    v_search_radius DOUBLE PRECISION := 0.0001; -- 10 metros
    v_category_key TEXT;
    v_category_num INTEGER;
BEGIN
    IF v_vehicle_type IN ('furgon', 'pickup', 'camioneta') THEN v_category_key := 'cat1'; v_category_num := 1;
    ELSIF v_vehicle_type IN ('camion', 'simple', 'camion_simple') THEN v_category_key := 'cat2'; v_category_num := 2;
    ELSE v_category_key := 'cat3'; v_category_num := 3; END IF;

    IF v_route_geometry IS NOT NULL AND v_route_geometry != '' THEN
        v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);
        
        -- A. Peajes Estándar
        FOR v_portico IN 
            SELECT name, tariffs_json, concession_name, location
            FROM public.porticos
            WHERE ST_DWithin(location::geometry, v_route_line, v_search_radius)
              AND (concession_name IS NULL OR concession_name != 'AVO')
              AND is_active = true
        LOOP
            DECLARE
                v_res JSONB;
            BEGIN
                v_res := public.vorian_calculate_toll_cost(v_portico.tariffs_json, v_category_key, v_pickup_date, v_portico.concession_name);
                IF (v_res->>'price')::NUMERIC > 0 THEN
                    v_total_tolls_cost := v_total_tolls_cost + (v_res->>'price')::NUMERIC;
                    v_tolls_names := v_tolls_names || v_portico.name;
                    v_tolls_breakdown := v_tolls_breakdown || jsonb_build_array(
                        jsonb_build_object('name', v_portico.name, 'cost', (v_res->>'price')::NUMERIC, 'tag', v_res->>'tag')
                    );
                END IF;
            END;
        END LOOP;

        -- B. AVO
        WITH avo_intersection AS (
            SELECT reference_code, ST_LineLocatePoint(v_route_line, location::geometry) as pos
            FROM public.porticos WHERE ST_DWithin(location::geometry, v_route_line, v_search_radius) AND concession_name = 'AVO'
        )
        SELECT 
            (SELECT reference_code FROM avo_intersection ORDER BY pos ASC LIMIT 1),
            (SELECT reference_code FROM avo_intersection ORDER BY pos DESC LIMIT 1)
        INTO v_avo_entry_ref, v_avo_exit_ref;

        IF v_avo_entry_ref IS NOT NULL AND v_avo_exit_ref IS NOT NULL AND v_avo_entry_ref != v_avo_exit_ref THEN
            DECLARE
                v_peak BOOLEAN := FALSE;
                v_mins INTEGER := (EXTRACT(HOUR FROM (v_pickup_date AT TIME ZONE 'America/Santiago')) * 60) + EXTRACT(MINUTE FROM (v_pickup_date AT TIME ZONE 'America/Santiago'));
                v_dow INTEGER := EXTRACT(DOW FROM (v_pickup_date AT TIME ZONE 'America/Santiago'));
            BEGIN
                IF v_dow BETWEEN 1 AND 5 THEN
                    IF (v_mins BETWEEN 450 AND 570) OR (v_mins BETWEEN 1050 AND 1170) THEN v_peak := TRUE; END IF;
                END IF;

                SELECT CASE WHEN v_peak THEN tbp_price ELSE tbfp_price END INTO v_avo_total_cost
                FROM public.concession_matrices
                WHERE LOWER(TRIM(entry_portico_ref)) = LOWER(TRIM(v_avo_entry_ref)) 
                  AND LOWER(TRIM(exit_portico_ref)) = LOWER(TRIM(v_avo_exit_ref)) AND category = v_category_num;
                  
                IF v_avo_total_cost > 0 THEN
                    v_total_tolls_cost := v_total_tolls_cost + v_avo_total_cost;
                    v_tolls_names := v_tolls_names || ('Tramo AVO: ' || v_avo_entry_ref);
                    v_tolls_breakdown := v_tolls_breakdown || jsonb_build_array(
                        jsonb_build_object('name', 'Tramo AVO: ' || v_avo_entry_ref || ' -> ' || v_avo_exit_ref, 'cost', v_avo_total_cost, 'tag', CASE WHEN v_peak THEN 'PUNTA (AVO)' ELSE 'VALLE (AVO)' END)
                    );
                END IF;
            END;
        END IF;
    END IF;

    -- Pernocte
    BEGIN
        SELECT COALESCE("overnightStay", 45000) INTO v_overnight_rate
        FROM public.vehicle_rates WHERE id = v_vehicle_type OR id = 'Camion Pesado' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN v_overnight_rate := 45000; END;

    v_nights := (v_delivery_date::date - v_pickup_date::date);
    IF v_nights > 0 AND EXTRACT(HOUR FROM (v_pickup_date AT TIME ZONE 'America/Santiago')) >= 14 THEN
        v_overnight_total := v_nights * v_overnight_rate;
        v_tolls_breakdown := v_tolls_breakdown || jsonb_build_array(
            jsonb_build_object('name', 'Pernocte (' || v_nights || ' noche/s)', 'cost', v_overnight_total, 'tag', 'SERVICIO')
        );
    END IF;

    RETURN jsonb_build_object(
        'subtotal', ROUND(120000 + (v_km * 850) + ((v_km / 2.0) * 1050) + v_total_tolls_cost + v_overnight_total),
        'commission', ROUND((120000 + (v_km * 850) + ((v_km / 2.0) * 1050) + v_total_tolls_cost + v_overnight_total) * 0.10),
        'total', ROUND((120000 + (v_km * 850) + ((v_km / 2.0) * 1050) + v_total_tolls_cost + v_overnight_total) * 1.10),
        'tolls_cost', ROUND(v_total_tolls_cost + v_overnight_total),
        'tolls_names', v_tolls_names,
        'tolls_breakdown', v_tolls_breakdown,
        'status', 'master_engine_v6.0_synced'
    );
END;
$$;
