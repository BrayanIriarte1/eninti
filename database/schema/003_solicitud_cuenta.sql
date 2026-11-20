-- Solicitudes de cuenta (HU-07 revisada).
-- El cliente ya no crea su propia cuenta: desde el login envía una solicitud con sus
-- datos y los de su planta. El administrador la revisa y, al aprobarla, crea la ficha
-- del cliente y su cuenta web; luego registra la planta con su ficha técnica.
-- Repetir este archivo es seguro (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS solicitud_cuenta (
    id_solicitud_cuenta SERIAL        PRIMARY KEY,
    nombre              VARCHAR(120)  NOT NULL,
    rut                 VARCHAR(12)   NOT NULL,
    email               VARCHAR(120)  NOT NULL,
    telefono            VARCHAR(20)   NOT NULL,
    direccion_planta    VARCHAR(200)  NOT NULL,
    id_comuna           INTEGER       NOT NULL REFERENCES comuna(id_comuna) ON DELETE RESTRICT,
    potencia_kw         NUMERIC(6,2)  CHECK (potencia_kw IS NULL OR potencia_kw > 0),
    tiene_baterias      BOOLEAN,      -- NULL: el cliente no lo sabe
    mensaje             VARCHAR(500),
    estado              VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    fecha_solicitud     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_resolucion    TIMESTAMPTZ,
    resuelta_por        INTEGER       REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    id_cliente          INTEGER       REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    -- Una solicitud resuelta siempre sabe cuándo y quién la resolvió
    CHECK ((estado = 'pendiente') = (fecha_resolucion IS NULL)),
    CHECK (estado = 'pendiente' OR resuelta_por IS NOT NULL),
    -- Solo una aprobada queda enlazada a una ficha de cliente
    CHECK ((estado = 'aprobada') = (id_cliente IS NOT NULL))
);

-- Evita solicitudes pendientes duplicadas para el mismo RUT
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_cuenta_pendiente
    ON solicitud_cuenta (rut) WHERE estado = 'pendiente';
