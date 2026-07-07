-- 🛡️ VORIAN FREIGHT - ACCEPT LOAD RPC
-- Función para que una Empresa acepte una carga desde el Load Board.
-- Utiliza "SELECT FOR UPDATE" para prevenir condiciones de carrera (First-come-first-serve).

CREATE OR REPLACE FUNCTION public.accept_load(
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
    -- El NOWAIT causaría un error si otro proceso ya lo bloqueó, pero preferimos
    -- dejar que espere o manejarlo suavemente. Para este caso, simplemente bloqueamos.
    SELECT * INTO v_shipment 
    FROM public.shipments 
    WHERE id = p_shipment_id 
    FOR UPDATE;

    -- 2. Validar que la carga exista
    IF v_shipment IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'La carga no existe.'
        );
    END IF;

    -- 3. Validar que la carga siga disponible
    IF v_shipment.status != 'PENDING' OR v_shipment."carrierId" IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'La carga ya fue tomada por otra empresa o no está disponible.'
        );
    END IF;

    -- 4. Adjudicar la carga
    UPDATE public.shipments
    SET 
        "carrierId" = p_company_id,
        status = 'ACCEPTED',
        "updatedAt" = NOW()
    WHERE id = p_shipment_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', '¡Carga adjudicada con éxito!'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error interno al procesar la solicitud: ' || SQLERRM
        );
END;
$$;
