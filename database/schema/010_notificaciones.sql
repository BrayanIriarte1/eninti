-- CU-37 · Notificaciones en la plataforma (campana).
-- Avisa a cada usuario de los eventos que le competen: solicitudes nuevas y avance de las
-- visitas al administrador; respuestas y trabajos terminados al cliente; órdenes asignadas
-- o reabiertas al técnico. Una fila por destinatario, para que cada uno marque las suyas
-- como leídas. Las leídas con más de 90 días se eliminan solas (notificaciones.service.js).
-- Idempotente: se puede ejecutar varias veces.

CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion  SERIAL        PRIMARY KEY,
    id_usuario       INTEGER       NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo             VARCHAR(40)   NOT NULL,  -- p. ej. solicitud_cuenta, orden_terminada
    titulo           VARCHAR(160)  NOT NULL,
    detalle          VARCHAR(300),
    ruta             VARCHAR(200),            -- pantalla a la que lleva el aviso
    fecha            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    leida_en         TIMESTAMPTZ,
    CHECK (ruta IS NULL OR ruta LIKE '/%')
);

-- La campana pide las del usuario, las no leídas primero y las más recientes arriba
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario
    ON notificacion (id_usuario, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_notificacion_no_leidas
    ON notificacion (id_usuario) WHERE leida_en IS NULL;
