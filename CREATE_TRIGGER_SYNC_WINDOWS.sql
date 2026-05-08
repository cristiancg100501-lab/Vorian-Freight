-- 1. Crear la función del trigger
CREATE OR REPLACE FUNCTION public.sync_portico_time_windows()
RETURNS TRIGGER AS $$
DECLARE
    v_tbp_sabado TEXT;
    v_ts_laboral TEXT;
    v_tbp_domingo TEXT;
    v_tbp_laboral TEXT;
    v_ts_domingo TEXT;
    v_ts_sabado TEXT;
    v_cat TEXT;
BEGIN
    -- Si no hay JSON de tarifas, no hacer nada
    IF NEW.tariffs_json IS NULL THEN
        RETURN NEW;
    END IF;

    -- 2. Extraer la primera ventana horaria válida que se encuentre en CUALQUIER categoría
    FOR v_cat IN SELECT * FROM jsonb_object_keys(NEW.tariffs_json)
    LOOP
        IF NEW.tariffs_json->v_cat->>'tbp_sabado' IS NOT NULL THEN v_tbp_sabado := COALESCE(v_tbp_sabado, NEW.tariffs_json->v_cat->>'tbp_sabado'); END IF;
        IF NEW.tariffs_json->v_cat->>'ts_laboral' IS NOT NULL THEN v_ts_laboral := COALESCE(v_ts_laboral, NEW.tariffs_json->v_cat->>'ts_laboral'); END IF;
        IF NEW.tariffs_json->v_cat->>'tbp_domingo' IS NOT NULL THEN v_tbp_domingo := COALESCE(v_tbp_domingo, NEW.tariffs_json->v_cat->>'tbp_domingo'); END IF;
        IF NEW.tariffs_json->v_cat->>'tbp_laboral' IS NOT NULL THEN v_tbp_laboral := COALESCE(v_tbp_laboral, NEW.tariffs_json->v_cat->>'tbp_laboral'); END IF;
        IF NEW.tariffs_json->v_cat->>'ts_domingo' IS NOT NULL THEN v_ts_domingo := COALESCE(v_ts_domingo, NEW.tariffs_json->v_cat->>'ts_domingo'); END IF;
        IF NEW.tariffs_json->v_cat->>'ts_sabado' IS NOT NULL THEN v_ts_sabado := COALESCE(v_ts_sabado, NEW.tariffs_json->v_cat->>'ts_sabado'); END IF;
    END LOOP;

    -- 3. Aplicar estas ventanas horarias de vuelta a TODAS las categorías esperadas (cat1, cat2, cat3)
    FOR v_cat IN SELECT unnest(ARRAY['cat1', 'cat2', 'cat3'])
    LOOP
        -- Asegurar que la categoría exista en el JSON, si no, crearla vacía para que el panel de admin no falle
        IF NOT NEW.tariffs_json ? v_cat THEN
            NEW.tariffs_json := jsonb_set(NEW.tariffs_json, ARRAY[v_cat], '{}'::jsonb);
        END IF;

        IF v_tbp_sabado IS NOT NULL THEN NEW.tariffs_json := jsonb_set(NEW.tariffs_json, ARRAY[v_cat, 'tbp_sabado'], to_jsonb(v_tbp_sabado)); END IF;
        IF v_ts_laboral IS NOT NULL THEN NEW.tariffs_json := jsonb_set(NEW.tariffs_json, ARRAY[v_cat, 'ts_laboral'], to_jsonb(v_ts_laboral)); END IF;
        IF v_tbp_domingo IS NOT NULL THEN NEW.tariffs_json := jsonb_set(NEW.tariffs_json, ARRAY[v_cat, 'tbp_domingo'], to_jsonb(v_tbp_domingo)); END IF;
        IF v_tbp_laboral IS NOT NULL THEN NEW.tariffs_json := jsonb_set(NEW.tariffs_json, ARRAY[v_cat, 'tbp_laboral'], to_jsonb(v_tbp_laboral)); END IF;
        IF v_ts_domingo IS NOT NULL THEN NEW.tariffs_json := jsonb_set(NEW.tariffs_json, ARRAY[v_cat, 'ts_domingo'], to_jsonb(v_ts_domingo)); END IF;
        IF v_ts_sabado IS NOT NULL THEN NEW.tariffs_json := jsonb_set(NEW.tariffs_json, ARRAY[v_cat, 'ts_sabado'], to_jsonb(v_ts_sabado)); END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear el Trigger
DROP TRIGGER IF EXISTS trigger_sync_portico_time_windows ON public.porticos;

CREATE TRIGGER trigger_sync_portico_time_windows
BEFORE INSERT OR UPDATE ON public.porticos
FOR EACH ROW
EXECUTE FUNCTION public.sync_portico_time_windows();

-- 5. Actualizar la tabla entera para que el Trigger se ejecute y sincronice todos los datos existentes
UPDATE public.porticos SET tariffs_json = tariffs_json;
