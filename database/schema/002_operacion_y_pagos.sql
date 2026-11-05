-- ENINTI · Migración 002: trazabilidad de órdenes, catálogo de servicios y pagos
--   · mantencion_historial: registra cada transición de estado con su responsable (HU-16, RNF-08).
--   · catalogo_servicio: planes y servicios como datos, no código (RNF-07, cotizador público).
--   · medio_pago admite el estado 'rechazado' que informa la pasarela (HU-13).
--   · usuario.telefono y usuario.ultimo_acceso según el diccionario de datos del informe U1.

-- Historial de estados de una mantención (HU-16).
-- Cada cambio guarda quién lo hizo y cuándo; la API valida las transiciones permitidas.
CREATE TABLE IF NOT EXISTS mantencion_historial (
    id_historial     SERIAL        PRIMARY KEY,
    id_mantencion    INTEGER       NOT NULL REFERENCES mantencion(id_mantencion) ON DELETE RESTRICT,
    id_usuario       INTEGER       NOT NULL REFERENCES usuario(id_usuario)       ON DELETE RESTRICT,
    estado_anterior  VARCHAR(20),  -- NULL en la creación de la orden
    estado_nuevo     VARCHAR(20)   NOT NULL,
    comentario       VARCHAR(255),
    fecha_cambio     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_mantencion ON mantencion_historial(id_mantencion, fecha_cambio);

-- Catálogo público de planes y servicios (cotizador, RNF-07).
-- tipo: 'plan' se cobra mensual, 'servicio' es un trabajo puntual.
CREATE TABLE IF NOT EXISTS catalogo_servicio (
    id_item      SERIAL        PRIMARY KEY,
    nombre       VARCHAR(120)  NOT NULL UNIQUE,
    descripcion  VARCHAR(255)  NOT NULL,
    tipo         VARCHAR(20)   NOT NULL CHECK (tipo IN ('plan', 'servicio')),
    precio       INTEGER       NOT NULL CHECK (precio >= 0), -- CLP, IVA incluido
    activo       BOOLEAN       NOT NULL DEFAULT true
);

-- La pasarela puede rechazar una inscripción de tarjeta (HU-13)
ALTER TABLE medio_pago DROP CONSTRAINT IF EXISTS medio_pago_estado_check;
ALTER TABLE medio_pago ADD CONSTRAINT medio_pago_estado_check
    CHECK (estado IN ('activo', 'inactivo', 'rechazado'));

-- Columnas del diccionario de datos U1 que faltaban en usuario
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefono       VARCHAR(20);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS ultimo_acceso  TIMESTAMPTZ;

-- Ubicación de la planta para el enlace al mapa de la agenda del trabajador (HU-14)
ALTER TABLE planta ADD COLUMN IF NOT EXISTS latitud   NUMERIC(9,6);
ALTER TABLE planta ADD COLUMN IF NOT EXISTS longitud  NUMERIC(9,6);

-- Observaciones libres del técnico al registrar la mantención (HU-05)
ALTER TABLE mantencion ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Identificadores de la pasarela (Flow sandbox): cliente externo y suscripción externa.
-- Solo referencias opacas; nunca datos de tarjeta (RNF-03).
ALTER TABLE cliente     ADD COLUMN IF NOT EXISTS flow_customer_id VARCHAR(60);
ALTER TABLE suscripcion ADD COLUMN IF NOT EXISTS flow_subscription_id VARCHAR(60);
