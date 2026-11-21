-- ENINTI · Migración 004: cierre de órdenes con el cliente, reglas de deuda y solicitudes del cliente
--   · La orden termina en 'por_confirmar' con fotos del técnico; el cliente confirma y recién ahí queda 'finalizada'.
--   · Suscripción: 'al_dia' → 'con_deuda' (cuota vencida, sigue activa) → 'cancelada' por morosidad
--     cuando la deuda más antigua supera un mes. Se guarda el motivo de cada cancelación.
--   · Volver a suscribirse exige una solicitud que el administrador acepta (solicitud_suscripcion).
--   · El cliente pide cambiar su correo o teléfono y el administrador aprueba (solicitud_cambio_datos).
-- Es idempotente: se puede ejecutar varias veces con npm run db:init.

-- ---------------------------------------------------------------- Órdenes
ALTER TABLE mantencion DROP CONSTRAINT IF EXISTS mantencion_estado_check;
ALTER TABLE mantencion ADD CONSTRAINT mantencion_estado_check
    CHECK (estado IN ('pendiente', 'en_curso', 'por_confirmar', 'finalizada', 'cancelada'));

-- Respuesta del cliente al cerrar la orden
ALTER TABLE mantencion ADD COLUMN IF NOT EXISTS satisfecho          BOOLEAN;
ALTER TABLE mantencion ADD COLUMN IF NOT EXISTS problema_resuelto   BOOLEAN;
ALTER TABLE mantencion ADD COLUMN IF NOT EXISTS comentario_cliente  VARCHAR(500);
ALTER TABLE mantencion ADD COLUMN IF NOT EXISTS fecha_confirmacion  TIMESTAMPTZ;

-- Fotos del trabajo realizado que el técnico envía al cliente (comprimidas en el navegador)
CREATE TABLE IF NOT EXISTS mantencion_foto (
    id_foto        SERIAL       PRIMARY KEY,
    id_mantencion  INTEGER      NOT NULL REFERENCES mantencion(id_mantencion) ON DELETE CASCADE,
    tipo_mime      VARCHAR(20)  NOT NULL CHECK (tipo_mime IN ('image/jpeg', 'image/png', 'image/webp')),
    datos          BYTEA        NOT NULL,
    fecha_subida   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_foto_mantencion ON mantencion_foto(id_mantencion);

-- ---------------------------------------------------------------- Suscripciones
ALTER TABLE suscripcion DROP CONSTRAINT IF EXISTS suscripcion_estado_check;
UPDATE suscripcion SET estado = 'con_deuda' WHERE estado = 'morosa';
ALTER TABLE suscripcion ADD CONSTRAINT suscripcion_estado_check
    CHECK (estado IN ('al_dia', 'con_deuda', 'cancelada'));

ALTER TABLE suscripcion ADD COLUMN IF NOT EXISTS motivo_cancelacion VARCHAR(20);
ALTER TABLE suscripcion DROP CONSTRAINT IF EXISTS suscripcion_motivo_cancelacion_check;
ALTER TABLE suscripcion ADD CONSTRAINT suscripcion_motivo_cancelacion_check
    CHECK (motivo_cancelacion IN ('cliente', 'morosidad', 'administrador'));

-- Solicitud del cliente para (volver a) tener una suscripción en una de sus plantas
CREATE TABLE IF NOT EXISTS solicitud_suscripcion (
    id_solicitud_suscripcion  SERIAL        PRIMARY KEY,
    id_planta                 INTEGER       NOT NULL REFERENCES planta(id_planta) ON DELETE RESTRICT,
    mensaje                   VARCHAR(500),
    estado                    VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                              CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    fecha_solicitud           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_resolucion          TIMESTAMPTZ,
    resuelta_por              INTEGER       REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    respuesta                 VARCHAR(500), -- acuerdo o motivo del rechazo, visible para el cliente
    id_suscripcion            INTEGER       REFERENCES suscripcion(id_suscripcion) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_suscripcion_pendiente
    ON solicitud_suscripcion(id_planta) WHERE estado = 'pendiente';

-- ---------------------------------------------------------------- Cambio de datos del cliente
CREATE TABLE IF NOT EXISTS solicitud_cambio_datos (
    id_solicitud_cambio  SERIAL        PRIMARY KEY,
    id_cliente           INTEGER       NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    email_nuevo          VARCHAR(120),
    telefono_nuevo       VARCHAR(20),
    motivo               VARCHAR(300)  NOT NULL,
    estado               VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    fecha_solicitud      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_resolucion     TIMESTAMPTZ,
    resuelta_por         INTEGER       REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    respuesta            VARCHAR(300),
    CHECK (email_nuevo IS NOT NULL OR telefono_nuevo IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_cambio_pendiente
    ON solicitud_cambio_datos(id_cliente) WHERE estado = 'pendiente';
