-- Script de Migración de Estados para Supabase SQL Editor
-- Pega este código en el editor SQL de tu panel de Supabase y ejecútalo.

BEGIN;

-- 1. Actualizar los envíos 'Booked' que quieres poner en camino al origen
UPDATE "shipments"
SET "status" = 'EN_ROUTE_TO_PICKUP'
WHERE "status" = 'Booked';

-- 2. (Opcional) Si también tienes envíos 'Pending' antiguos y quieres pasarlos a PENDING
UPDATE "shipments"
SET "status" = 'PENDING'
WHERE "status" = 'Pending';

-- 3. (Opcional) Si tienes envíos 'In transit' antiguos
UPDATE "shipments"
SET "status" = 'IN_TRANSIT'
WHERE "status" = 'In transit';

-- 4. (Opcional) Si tienes envíos 'Delivered' antiguos
UPDATE "shipments"
SET "status" = 'COMPLETED'
WHERE "status" = 'Delivered';

-- 5. (Opcional) Si tienes envíos 'Cancelled' antiguos
UPDATE "shipments"
SET "status" = 'CANCELLED'
WHERE "status" = 'Cancelled';

COMMIT;
