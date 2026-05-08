-- 🛡️ MOTOR DE PRECIOS VORIAN 4.0 (EXCLUSIVO & CONSOLIDADO 3/4)
-- Actualización para soportar Camiones 3/4 y Modalidades de Carga

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
    v_service_mode TEXT := COALESCE(params->>'p_service_mode', 'exclusive'); -- 'exclusive' or 'consolidated'
    v_cargo_units NUMERIC := COALESCE((params->>'p_cargo_units')::NUMERIC, 1); -- pallets, meters, etc.
    v_pickup_date TIMESTAMPTZ := COALESCE((params->>'p_pickup_date')::TIMESTAMPTZ, now());
    v_route_geometry TEXT := params->>'p_route_geometry';
    
    -- ⚙️ Variables del Polinomio Estructural (Valores base ajustables por vehículo)
    v_costo_fijo_operacional NUMERIC;
    v_costo_variable_km NUMERIC;
    v_rendimiento_km_litro NUMERIC;
    v_diesel_cost NUMERIC := 1050.0;
    v_truck_capacity_units NUMERIC; -- Capacidad en pallets
    
    -- 📈 Acumuladores
    v_costo_combustible NUMERIC;
    v_subtotal_polinomio NUMERIC := 0;
    v_faf_percent NUMERIC := 0.0;
    
    -- 🚧 Peajes
    v_standard_tolls_cost NUMERIC := 0;
    v_avo_total_cost NUMERIC := 0;
    v_avo_entry_ref TEXT;
    v_avo_exit_ref TEXT;
    v_category_num INTEGER;
    
    -- 🛰️ Geospatial
    v_route_line GEOMETRY;
    v_multiplier NUMERIC := 1.0;
    v_commission NUMERIC;
    v_total NUMERIC;
    
    v_current_hour_min INTEGER;
    v_day_of_week INTEGER;
    v_is_peak BOOLEAN := FALSE;
BEGIN
    -- 1. CONFIGURACIÓN POR TIPO DE VEHÍCULO
    IF v_vehicle_type = 'camion_3_4' THEN
        v_costo_fijo_operacional := 65000;  -- Menor que rampla (120k)
        v_costo_variable_km := 450;         -- Menor desgaste
        v_rendimiento_km_litro := 5.5;      -- Mejor rendimiento (~5.5 km/l)
        v_truck_capacity_units := 8;        -- Capacidad promedio 8 pallets
        v_category_num := 2;                -- CAT 2
    ELSIF v_vehicle_type IN ('camion', 'simple', 'camion_simple') THEN
        v_costo_fijo_operacional := 85000;
        v_costo_variable_km := 650;
        v_rendimiento_km_litro := 3.5;
        v_truck_capacity_units := 12;
        v_category_num := 2;
    ELSE -- Rampla / Pesado
        v_costo_fijo_operacional := 120000;
        v_costo_variable_km := 850;
        v_rendimiento_km_litro := 2.2;
        v_truck_capacity_units := 28;
        v_category_num := 3;
    END IF;

    -- 2. EXTRACCIÓN DEL VALOR DIÉSEL
    BEGIN
        SELECT "dieselCostPerLiter" INTO v_diesel_cost FROM public.settings WHERE id = 'global';
        IF v_diesel_cost IS NULL THEN v_diesel_cost := 1050.0; END IF;
    EXCEPTION WHEN OTHERS THEN
        v_diesel_cost := 1050.0; 
    END;

    -- 3. PREPARACIÓN GEOMÉTRICA Y PEAJES
    IF v_route_geometry IS NOT NULL AND v_route_geometry != '' THEN
        v_route_line := ST_SetSRID(ST_GeomFromGeoJSON(v_route_geometry), 4326);
        
        -- A. PEAJES ESTÁNDAR
        SELECT COALESCE(SUM(CASE WHEN v_category_num = 2 THEN cost_cat2 ELSE cost_rampla END), 0)
        INTO v_standard_tolls_cost
        FROM public.porticos
        WHERE ST_DWithin(location::geometry, v_route_line, 0.0005)
          AND (concession_name IS NULL OR concession_name != 'AVO');

        -- B. PEAJES AVO (Simplificado para este ejemplo, asumiendo lógica previa)
        -- ... (Lógica de matrices AVO aquí si se requiere, pero mantenemos v_avo_total_cost = 0 por simplicidad en el snippet)
    END IF;

    -- 4. CÁLCULO DEL POLINOMIO (COSTO TOTAL CAMIÓN)
    IF v_diesel_cost > 900 THEN
        v_faf_percent := ((v_diesel_cost - 900) / 20) * 0.005;
    END IF;

    v_costo_combustible := (v_km / v_rendimiento_km_litro) * v_diesel_cost;
    v_subtotal_polinomio := v_costo_fijo_operacional + v_costo_combustible + (v_km * v_costo_variable_km);
    v_subtotal_polinomio := v_subtotal_polinomio * (1 + v_faf_percent);
    v_subtotal_polinomio := v_subtotal_polinomio + v_standard_tolls_cost;

    -- 5. LÓGICA DE CONSOLIDADO VS EXCLUSIVO
    IF v_service_mode = 'consolidated' THEN
        -- Precio por unidad de carga (pallet)
        -- Se aplica un factor de consolidación (1.4x) para cubrir ineficiencias y mayor gestión
        -- El cliente paga proporcional a su espacio
        v_subtotal_polinomio := (v_subtotal_polinomio * 1.4) * (v_cargo_units / v_truck_capacity_units);
        
        -- Mínimo de cobro: 1 pallet
        IF v_cargo_units < 1 THEN v_cargo_units := 1; END IF;
    ELSE
        -- Exclusive: Paga el camión completo
        v_subtotal_polinomio := v_subtotal_polinomio;
    END IF;

    -- 6. COMISIÓN Y TOTAL
    v_commission := v_subtotal_polinomio * 0.15; -- 15% Vorian
    v_total := v_subtotal_polinomio + v_commission;

    -- 7. RETORNO
    RETURN jsonb_build_object(
        'subtotal', ROUND(v_subtotal_polinomio),
        'commission', ROUND(v_commission),
        'total', ROUND(v_total),
        'currency', 'CLP',
        'service_mode', v_service_mode,
        'vehicle_type', v_vehicle_type,
        'factors', jsonb_build_object(
            'diesel_price', v_diesel_cost,
            'faf_percent', v_faf_percent,
            'capacity_used', CASE WHEN v_service_mode = 'consolidated' THEN (v_cargo_units / v_truck_capacity_units) ELSE 1 END
        )
    );
END;
$$;
