-- Tabla de notificaciones del sistema para clientes y usuarios
-- NOTA: Se remueve la foreign key explícita para evitar incomprensiones de tipos (UUID vs TEXT) en PostgreSQL
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'status_change', 'geofence'
    "shipmentId" TEXT,
    read BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para consultas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications("userId", read);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_notifications" ON public.notifications;
CREATE POLICY "user_own_notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING ("userId"::text = auth.uid()::text)
    WITH CHECK ("userId"::text = auth.uid()::text);

DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);
