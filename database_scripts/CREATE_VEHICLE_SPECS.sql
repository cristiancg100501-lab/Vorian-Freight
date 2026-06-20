-- 🚛 TABLA DE ESPECIFICACIONES TÉCNICAS DE VEHÍCULOS
-- Permite gestionar capacidades, medidas y límites para mejor asignación de carga

CREATE TABLE IF NOT EXISTS public.vehicle_specs (
    id TEXT PRIMARY KEY, -- ej: 'camion_3_4', 'rampla_20', 'rampla_40'
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'cat1', 'cat2', 'cat3'
    max_weight_kg NUMERIC NOT NULL,
    max_volume_m3 NUMERIC NOT NULL,
    max_pallets INTEGER NOT NULL,
    length_m NUMERIC,
    width_m NUMERIC,
    height_m NUMERIC,
    description TEXT,
    icon_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar datos base para camiones 3/4 y Ramplas
INSERT INTO public.vehicle_specs (id, name, category, max_weight_kg, max_volume_m3, max_pallets, length_m, width_m, height_m, description, icon_name)
VALUES 
('camion_3_4', 'Camión 3/4', 'cat2', 3500, 18, 8, 4.5, 2.1, 2.2, 'Ideal para distribución urbana y carga general de tamaño medio.', 'Truck'),
('camion_simple', 'Camión Simple (CAT 2)', 'cat2', 10000, 35, 12, 7.0, 2.4, 2.4, 'Camión rígido de 2 ejes para cargas pesadas locales.', 'Truck'),
('rampla_20', 'Rampla 20 FT', 'cat3', 28000, 33, 10, 6.0, 2.4, 2.4, 'Transporte de contenedores de 20 pies y carga pesada masiva.', 'Truck'),
('rampla_40', 'Rampla 40 FT', 'cat3', 28000, 67, 22, 12.0, 2.4, 2.4, 'Transporte de contenedores de 40 pies y carga de gran volumen.', 'Truck')
ON CONFLICT (id) DO UPDATE SET
    max_weight_kg = EXCLUDED.max_weight_kg,
    max_volume_m3 = EXCLUDED.max_volume_m3,
    max_pallets = EXCLUDED.max_pallets,
    length_m = EXCLUDED.length_m,
    width_m = EXCLUDED.width_m,
    height_m = EXCLUDED.height_m,
    updated_at = now();
