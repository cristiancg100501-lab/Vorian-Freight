-- 🛡️ VORIAN PRICING ENGINE v6.0 (DB-DRIVEN + DYNAMIC DIESEL)
-- Lee parámetros de calibración directamente desde la tabla 'vehicleRates' y 'settings'
-- Permite recibir el precio del diesel por parámetro desde la API para soportar precios por región.

CREATE OR REPLACE FUNCTION public.get_vorian_price(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- 📥 Entradas
    v_km NUMERIC := COALESCE((params->>'p_km')::NUMERIC, 0);
    v_minutes NUMERIC := COALESCE((params->>'p_minutes')::NUMERIC, 0);
    v_vehicle_type TEXT := COALESCE(params->>'p_vehicle_type', 'camion_3_4');
    v_service_mode TEXT := COALESCE(params->>'p_service_mode', 'exclusive');
    v_cargo_units NUMERIC := COALESCE((params->>'p_cargo_units')::NUMERIC, 1);
    v_route_geometry TEXT := params->>'p_route_geometry';
    
    -- ⚙️ Variables de Calibración
    v_costo_fijo NUMERIC;
    v_desgaste_km NUMERIC;
    v_rendimiento NUMERIC;
    v_costo_hora_chofer NUMERIC;
    v_diesel_cost NUMERIC;
    v_truck_capacity NUMERIC;
    v_category_key TEXT;
    v_category_num INTEGER;
    
    -- 📈 Componentes del Costo
    v_costo_diesel NUMERIC;
    v_costo_tiempo NUMERIC;
    v_costo_desgaste NUMERIC;
    v_costo_base_operativo NUMERIC;
    
    -- 🚧 Peajes y Ajustes
    v_standard_tolls_cost NUMERIC := 0;
    v_ltl_factor NUMERIC;
    v_market_factor NUMERIC := 1.0;
    
    v_route_line GEOMETRY;
    v_subtotal NUMERIC;
    v_commission NUMERIC;
    v_total NUMERIC;
    v_vorian_commission_pct NUMERIC;
BEGIN
    -- 1. CARGAR CONFIGURACIÓN GLOBAL
    SELECT 
        COALESCE("dieselCostPerLiter", 1050.0),
        COALESCE(vorian_commission, 10) / 100.0,
        COALESCE(costo_chofer_hr, 7000)
    INTO v_diesel_cost, v_vorian_commission_pct, v_costo_hora_chofer
    FROM public.settings WHERE id = 'global';
    
    -- OVERRIDE DIESEL COST IF PARAMETER IS PASSED (API)
    IF (params->>'p_diesel_price') IS NOT NULL THEN
        v_diesel_cost := (params->>'p_diesel_price')::NUMERIC;
    END IF;

    -- 2. CARGAR PARÁMETROS DEL VEHÍCULO
    SELECT 
        COALESCE(vr."baseFare", 65000),
        COALESCE(vr."costPerKm", 200),
        COALESCE(vr."fuelEfficiency", 9.0),
        COALESCE(vs.max_pallets, 8),
        COALESCE(vs.category, 'cat2')
    INTO v_costo_fijo, v_desgaste_km, v_rendimiento, v_truck_capacity, v_category_key
    FROM public.vehicle_specs vs
    LEFT JOIN public."vehicleRates" vr ON vr.id = vs.id
    WHERE vs.id = v_vehicle_type;

    IF v_costo_fijo IS NULL THEN
        v_costo_fijo := 120000; v_desgaste_km := 850; v_rendimiento := 2.2; v_truck_capacity := 28; v_category_key := 'cat3';
    END IF;

    v_category_num := CASE WHEN v_category_key = 'cat2' THEN 2 WHEN v_category_key = 'cat1' THEN 1 ELSE 3 END;

    -- 3. CÁLCULO DE PEAJES (Dinamizado por categoría de DB)
    IF v_route_geometry IS NOT NULL AND v_route_geometry != '' THEN
        v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);
        
        SELECT COALESCE(SUM((tariffs_json->v_category_key->>'price_tbfp')::NUMERIC), 0)
        INTO v_standard_tolls_cost
        FROM public.porticos
        WHERE ST_DWithin(location::geometry, v_route_line, 0.0005)
          AND (concession_name IS NULL OR concession_name != 'AVO');
    END IF;

    -- 4. ECUACIÓN v5.1
    v_costo_diesel := (v_km / v_rendimiento) * v_diesel_cost;
    v_costo_tiempo := (v_minutes / 60.0) * v_costo_hora_chofer;
    v_costo_desgaste := v_km * v_desgaste_km;
    
    v_costo_base_operativo := v_costo_fijo + v_costo_diesel + v_costo_tiempo + v_costo_desgaste + v_standard_tolls_cost;

    -- 5. FAF REMOVIDO PARA NO COBRAR DIESEL DOBLE
    v_subtotal := v_costo_base_operativo;

    -- 6. LTL DINÁMICA
    IF v_service_mode = 'consolidated' THEN
        DECLARE
            v_ltl_details JSONB := COALESCE(params->'p_ltl_details', '{}'::jsonb);
            v_ltl_quantity NUMERIC := COALESCE((v_ltl_details->>'quantity')::NUMERIC, v_cargo_units);
            v_ltl_weight NUMERIC := COALESCE((v_ltl_details->>'weight')::NUMERIC, 0);
            v_ltl_stackable BOOLEAN := COALESCE((v_ltl_details->>'stackable')::BOOLEAN, true);
            v_ltl_dim_arr text[];
            v_ltl_length NUMERIC := 1;
            v_ltl_width NUMERIC := 1;
            v_ltl_height NUMERIC := 1;
            v_ltl_volume_m3 NUMERIC := 0;
            v_ltl_truck_fraction NUMERIC := 0;
        BEGIN
            IF (v_ltl_details->>'dimensions') IS NOT NULL AND (v_ltl_details->>'dimensions') != '' THEN
                BEGIN
                    v_ltl_dim_arr := string_to_array(lower(v_ltl_details->>'dimensions'), 'x');
                    IF array_length(v_ltl_dim_arr, 1) = 3 THEN
                        v_ltl_length := (v_ltl_dim_arr[1])::NUMERIC / 100.0;
                        v_ltl_width := (v_ltl_dim_arr[2])::NUMERIC / 100.0;
                        v_ltl_height := (v_ltl_dim_arr[3])::NUMERIC / 100.0;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    v_ltl_length := 1; v_ltl_width := 1; v_ltl_height := 1;
                END;
            END IF;

            IF NOT v_ltl_stackable THEN
                v_ltl_height := 2.5; -- Asume altura de camión al no ser apilable
            END IF;

            v_ltl_volume_m3 := v_ltl_length * v_ltl_width * v_ltl_height * v_ltl_quantity;
            
            -- v_truck_capacity suele estar en pallets. 1 pallet = ~2.1m3 max en camión.
            v_ltl_truck_fraction := v_ltl_volume_m3 / NULLIF((v_truck_capacity * 2.1), 0);
            IF v_ltl_truck_fraction IS NULL THEN v_ltl_truck_fraction := 0; END IF;

            -- Regla Logística: Peso Volumétrico (1m3 = 333kg)
            IF (v_ltl_weight / 333.0) > v_ltl_volume_m3 THEN
                v_ltl_truck_fraction := (v_ltl_weight / 333.0) / NULLIF((v_truck_capacity * 2.1), 0);
            END IF;

            IF v_ltl_truck_fraction > 1.0 THEN v_ltl_truck_fraction := 1.0; END IF;

            -- Piso de 20% + Proporción con recargo del 30%
            v_ltl_factor := 0.20 + (v_ltl_truck_fraction * 1.3);
            v_subtotal := v_subtotal * v_ltl_factor;
        END;
    END IF;

    -- 7. TOTAL Y COMISIÓN
    v_commission := v_subtotal * v_vorian_commission_pct;
    v_total := (v_subtotal + v_commission) * v_market_factor;

    RETURN jsonb_build_object(
        'total', ROUND(v_total),
        'subtotal', ROUND(v_subtotal),
        'commission', ROUND(v_commission),
        'tolls_cost', ROUND(v_standard_tolls_cost),
        'currency', 'CLP',
        'metadata', jsonb_build_object(
            'engine', 'v6.0-DB-DRIVEN',
            'category', v_category_key,
            'diesel_price', v_diesel_cost
        ),
        'factors', jsonb_build_object(
            'base_cost_diesel', ROUND(v_costo_diesel),
            'base_cost_driver', ROUND(v_costo_tiempo),
            'base_cost_maintenance', ROUND(v_costo_desgaste),
            'base_margin', ROUND(v_costo_fijo + v_commission),
            'terrain_factor', 1.0,
            'weight_factor', 1.0,
            'distance_total', ROUND(v_km)
        )
    );
END;
$$;
