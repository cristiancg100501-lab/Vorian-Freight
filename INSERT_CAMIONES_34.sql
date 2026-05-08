-- Inserción de especificaciones reales para Camiones 3/4 en Chile
-- Estos datos representan las medidas estándar de fábrica y carrozados comunes.

INSERT INTO public.vehicle_specs (
  category, 
  name, 
  description, 
  max_weight_kg, 
  max_volume_m3, 
  max_pallets, 
  length_m, 
  width_m, 
  height_m
) VALUES 
-- 1. Kia Frontier (El más común en Chile)
('Light', 'Kia Frontier (Furgón Cerrado)', 'Camión 3/4 estándar con carrocería cerrada, ideal para paquetería y retail.', 1700, 9.5, 4, 3.10, 1.70, 1.80),

-- 2. Hyundai Porter (Similar al Frontier, muy usado en ciudad)
('Light', 'Hyundai Porter H100 (Barandas)', 'Camión 3/4 con barandas rebatibles, excelente para carga sobredimensionada o materiales de construcción.', 1650, 8.0, 4, 3.11, 1.63, 0.38),

-- 3. Chevrolet NKR (Un poco más grande, límite de la categoría)
('Light', 'Chevrolet NKR 512 (Furgón Paquetero)', 'Camión ligero de mayor envergadura, usado para distribución intensiva.', 2500, 14.0, 6, 4.30, 1.90, 1.90),

-- 4. Foton Aumark / JAC (Alternativas chinas populares)
('Light', 'Foton Aumark / JAC (Furgón)', 'Alternativa económica 3/4, dimensiones ligeramente superiores para volumen.', 1800, 11.0, 4, 3.30, 1.80, 1.85)

ON CONFLICT DO NOTHING;
