-- 🚀 VORIAN TARIFF AUTOMATION SCRIPT
-- Este script realiza tres tareas principales:
-- 1. Asegura que la categoría 4 se mapee a la categoría 1 (Motos -> Autos).
-- 2. Limpia duplicados en la matriz de concesiones.
-- 3. Propaga automáticamente los precios de CAT1 y CAT2 basados en CAT3 para pórticos estándar.

BEGIN;

-- 1. MAPEO DE CATEGORÍAS (1 y 4 -> 1)
-- Si llegaras a cargar datos con categoría 4, este comando los normaliza a 1.
UPDATE public.concession_matrices 
SET category = 1 
WHERE category = 4;

-- 2. PROPAGACIÓN DE PRECIOS EN TABLA PORTICOS
-- Si un pórtico tiene CAT3 pero no CAT1/CAT2, calculamos:
-- CAT 2 = 70% de CAT 3
-- CAT 1 = 40% de CAT 3
UPDATE public.porticos
SET tariffs_json = jsonb_set(
    jsonb_set(
        tariffs_json,
        '{cat2}',
        jsonb_build_object(
            'price_tbfp', ROUND((tariffs_json->'cat3'->>'price_tbfp')::NUMERIC * 0.7),
            'price_tbp', ROUND((tariffs_json->'cat3'->>'price_tbp')::NUMERIC * 0.7),
            'price_ts', ROUND((tariffs_json->'cat3'->>'price_ts')::NUMERIC * 0.7),
            'tbp_laboral', tariffs_json->'cat3'->'tbp_laboral',
            'ts_laboral', tariffs_json->'cat3'->'ts_laboral',
            'tbp_sabado', tariffs_json->'cat3'->'tbp_sabado',
            'ts_sabado', tariffs_json->'cat3'->'ts_sabado',
            'tbp_domingo', tariffs_json->'cat3'->'tbp_domingo',
            'ts_domingo', tariffs_json->'cat3'->'ts_domingo'
        )
    ),
    '{cat1}',
    jsonb_build_object(
        'price_tbfp', ROUND((tariffs_json->'cat3'->>'price_tbfp')::NUMERIC * 0.4),
        'price_tbp', ROUND((tariffs_json->'cat3'->>'price_tbp')::NUMERIC * 0.4),
        'price_ts', ROUND((tariffs_json->'cat3'->>'price_ts')::NUMERIC * 0.4),
        'tbp_laboral', tariffs_json->'cat3'->'tbp_laboral',
        'ts_laboral', tariffs_json->'cat3'->'ts_laboral',
        'tbp_sabado', tariffs_json->'cat3'->'tbp_sabado',
        'ts_sabado', tariffs_json->'cat3'->'ts_sabado',
        'tbp_domingo', tariffs_json->'cat3'->'tbp_domingo',
        'ts_domingo', tariffs_json->'cat3'->'ts_domingo'
    )
)
WHERE (concession_name IS DISTINCT FROM 'AVO' OR concession_name IS NULL)
  AND tariffs_json->'cat3' IS NOT NULL 
  AND (tariffs_json->'cat3'->>'price_tbfp')::NUMERIC > 0
  AND (
    (tariffs_json->'cat1'->>'price_tbfp') IS NULL OR 
    (tariffs_json->'cat1'->>'price_tbfp')::NUMERIC = 0
  );

-- 3. SINCRONIZACIÓN DE MATRICES AVO (Opcional: Si quieres que CAT1/2 se deriven de CAT3 en AVO también)
-- Descomenta esto si quieres que los precios de los tramos AVO también se calculen automáticamente:
/*
UPDATE public.concession_matrices m_dest
SET tbfp_price = ROUND(m_src.tbfp_price * CASE WHEN m_dest.category = 2 THEN 0.7 ELSE 0.4 END),
    tbp_price = ROUND(m_src.tbp_price * CASE WHEN m_dest.category = 2 THEN 0.7 ELSE 0.4 END)
FROM public.concession_matrices m_src
WHERE m_dest.concession_name = 'AVO'
  AND m_src.concession_name = 'AVO'
  AND m_dest.entry_portico_ref = m_src.entry_portico_ref
  AND m_dest.exit_portico_ref = m_src.exit_portico_ref
  AND m_src.category = 3
  AND m_dest.category IN (1, 2)
  AND m_dest.tbfp_price = 0;
*/

COMMIT;

-- ✅ LOG FINAL:
SELECT 
    category, 
    COUNT(*) as total_matrices 
FROM public.concession_matrices 
GROUP BY category;
