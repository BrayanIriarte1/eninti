-- CU-36 · Solicitud de nueva planta por un cliente con cuenta.
-- El cliente indica dónde está su nueva instalación; el administrador la revisa y, al
-- aprobarla, completa la ficha técnica y se crea la planta (CU-14). Si la rechaza, el
-- motivo queda visible para el cliente. Mismo patrón que solicitud_suscripcion.
-- Idempotente: se puede ejecutar varias veces.

CREATE TABLE IF NOT EXISTS solicitud_planta (
    id_solicitud_planta  SERIAL        PRIMARY KEY,
    id_cliente           INTEGER       NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    id_comuna            INTEGER       NOT NULL REFERENCES comuna(id_comuna)   ON DELETE RESTRICT,
    direccion            VARCHAR(200)  NOT NULL,
    potencia_kw          NUMERIC(6,2)  CHECK (potencia_kw IS NULL OR potencia_kw > 0), -- si el cliente la conoce
    tiene_baterias       BOOLEAN,                                                     -- NULL: no sabe
    mensaje              VARCHAR(500),
    estado               VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    fecha_solicitud      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_resolucion     TIMESTAMPTZ,
    resuelta_por         INTEGER       REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    respuesta            VARCHAR(500), -- mensaje o motivo del rechazo, visible para el cliente
    id_planta            INTEGER       REFERENCES planta(id_planta) ON DELETE RESTRICT, -- planta creada al aprobar
    CHECK ((estado = 'pendiente') = (fecha_resolucion IS NULL)),
    CHECK (estado = 'pendiente' OR resuelta_por IS NOT NULL),
    CHECK ((estado = 'aprobada') = (id_planta IS NOT NULL))
);

-- Una sola solicitud pendiente por dirección de cada cliente
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_planta_pendiente
    ON solicitud_planta (id_cliente, lower(direccion)) WHERE estado = 'pendiente';

-- Bandeja del administrador: pendientes primero, más recientes arriba
CREATE INDEX IF NOT EXISTS idx_solicitud_planta_estado
    ON solicitud_planta (estado, fecha_solicitud DESC);
