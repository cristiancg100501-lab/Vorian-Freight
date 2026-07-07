-- 🛡️ VORIAN FREIGHT - RETURN LOAD RPC
-- Función para que una Empresa devuelva una carga al mercado.
-- Cambia la carga a PENDING y suma 1 "strike" leve a la empresa.

CREATE OR REPLACE FUNCTION public.return_load(
    p_shipment_id TEXT,
    p_company_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shipment RECORD;
    v_success BOOLEAN := FALSE;
    v_message TEXT;
BEGIN
    -- 1. Intentar bloquear la fila para actualización
    SELECT * INTO v_shipment 
    FROM public.shipments 
    WHERE id = p_shipment_id 
    FOR UPDATE;

    -- 2. Validar que la carga exista
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'La carga no existe.');
    END IF;

    -- 3. Validar que la carga pertenezca a esta empresa y esté ACCEPTED
    IF v_shipment."carrierId" != p_company_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'No tienes permiso para devolver esta carga.');
    END IF;

    IF v_shipment.status != 'ACCEPTED' THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Esta carga ya no está en un estado que permita devolución.');
    END IF;

    -- 4. Devolver la carga al mercado (PENDING)
    UPDATE public.shipments
    SET 
        "carrierId" = NULL,
        status = 'PENDING',
        "updatedAt" = NOW()
    WHERE id = p_shipment_id;

    -- 5. Penalizar a la empresa sumándole 1 strike
    UPDATE public."companyProfiles"
    SET strikes = COALESCE(strikes, 0) + 1
    WHERE id = p_company_id;

    v_success := TRUE;
    v_message := 'Carga devuelta al mercado exitosamente. Se ha registrado 1 strike en su perfil.';
    
    RETURN jsonb_build_object('success', v_success, 'message', v_message);
END;
$$;
