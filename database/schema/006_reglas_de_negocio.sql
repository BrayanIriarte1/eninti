-- ENINTI · Migración 006: ajustes para las reglas de negocio de órdenes y suscripciones
--   · Una solicitud del cliente puede reprogramarse si su orden se canceló: la unicidad de
--     mantencion.id_solicitud pasa a aplicarse solo a las órdenes no canceladas.
--   · El historial de una orden admite cambios hechos por el proceso automático (cancelación
--     por morosidad): id_usuario NULL significa "Proceso automático".
-- Se puede ejecutar varias veces sin efectos adicionales.

ALTER TABLE mantencion DROP CONSTRAINT IF EXISTS mantencion_id_solicitud_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mantencion_solicitud_vigente
    ON mantencion(id_solicitud) WHERE id_solicitud IS NOT NULL AND estado <> 'cancelada';

ALTER TABLE mantencion_historial ALTER COLUMN id_usuario DROP NOT NULL;
