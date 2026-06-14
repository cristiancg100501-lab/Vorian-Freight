-- FIX: Eliminar el cobro duplicado del Diésel (FAF) y habilitar la Matemática Forense
CREATE OR REPLACE FUNCTION public.calculate_pricing_v5(
    p_distance_km numeric,
    p_duration_hrs numeric,
    p_equipment_type text DEFAULT 'camion_pesado',
    p_weight_kg numeric DEFAULT 1000,
    p_diesel_price numeric DEFAULT 1050
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- ⚙️ Variables de Calibración
    v_costo_fijo NUMERIC;
    v_desgaste_km NUMERIC;
    v_rendimiento NUMERIC;
    v_costo_hora_chofer NUMERIC;
    v_truck_capacity NUMERIC;
    v_category_key TEXT;
    
    -- 📈 Componentes del Costo
    v_costo_diesel NUMERIC;
    v_costo_tiempo NUMERIC;
    v_costo_desgaste NUMERIC;
    v_costo_base_operativo NUMERIC;
    
    -- 🚧 Peajes y Ajustes
    v_tolls_cost NUMERIC := 0; -- Se calcularán en el backend ahora
    v_weight_factor NUMERIC := 1.0;
    v_subtotal NUMERIC;
    v_commission NUMERIC;
    v_total NUMERIC;
    v_vorian_commission_pct NUMERIC;
BEGIN
    -- 1. CARGAR CONFIGURACIÓN GLOBAL
    SELECT 
        COALESCE(vorian_commission, 15) / 100.0,
        COALESCE(costo_chofer_hr, 7000)
    INTO v_vorian_commission_pct, v_costo_hora_chofer
    FROM public.settings WHERE id = 'global';

    -- 2. CARGAR PARÁMETROS DEL VEHÍCULO
    SELECT 
        COALESCE(vr.baseFare, 65000),
        COALESCE(vr.costPerKm, 200),
        COALESCE(vr.fuelEfficiency, 9.0),
        COALESCE(vs.max_pallets, 8),
        COALESCE(vs.category, 'cat2')
    INTO v_costo_fijo, v_desgaste_km, v_rendimiento, v_truck_capacity, v_category_key
    FROM public.vehicle_specs vs
    LEFT JOIN public.vehicleRates vr ON vr.id = vs.id
    WHERE vs.id = p_equipment_type;

    -- Fallback si no existe
    IF v_costo_fijo IS NULL THEN
        v_costo_fijo := 120000; v_desgaste_km := 850; v_rendimiento := 2.2; v_truck_capacity := 28; v_category_key := 'cat3';
    END IF;

    -- Factor de peso
    IF p_weight_kg > 15000 THEN
        v_weight_factor := 1.0 + ((p_weight_kg - 15000) / 1000) * 0.05;
    END IF;

    -- 3. ECUACIÓN CORE
    v_costo_diesel := (p_distance_km / v_rendimiento) * p_diesel_price;
    v_costo_tiempo := p_duration_hrs * v_costo_hora_chofer;
    v_costo_desgaste := p_distance_km * v_desgaste_km;
    
    v_costo_base_operativo := v_costo_fijo + v_costo_diesel + v_costo_tiempo + v_costo_desgaste;

    -- ELIMINAMOS EL FAF (No se cobra el diesel dos veces)
    v_subtotal := v_costo_base_operativo * v_weight_factor;

    -- TOTAL Y COMISIÓN
    v_commission := v_subtotal * v_vorian_commission_pct;
    v_total := (v_subtotal + v_commission);

    -- RETORNO COMPLETO CON FACTORS
    RETURN jsonb_build_object(
        'total', ROUND(v_total),
        'subtotal', ROUND(v_subtotal),
        'commission', ROUND(v_commission),
        'currency', 'CLP',
        'metadata', jsonb_build_object(
            'engine', 'v5.1-FIXED',
            'category', v_category_key,
            'diesel_price', p_diesel_price
        ),
        'factors', jsonb_build_object(
            'base_cost_diesel', ROUND(v_costo_diesel),
            'base_cost_driver', ROUND(v_costo_tiempo),
            'base_cost_maintenance', ROUND(v_costo_desgaste),
            'base_margin', ROUND(v_costo_fijo + v_commission),
            'terrain_factor', 1.0,
            'weight_factor', ROUND(v_weight_factor, 2),
            'distance_total', ROUND(p_distance_km, 1)
        )
    );
END;
$$;
