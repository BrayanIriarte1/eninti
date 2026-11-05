-- ENINTI · Modelo de datos de la plataforma de suscripciones
-- Basado en el diagrama "ENINTI – Modelo de datos", con estas correcciones:
--   · Sin tabla plan: existe un único tipo de suscripción mensual; la cuota vive en suscripcion.
--   · usuario.nombre: necesario para identificar trabajadores y administradores (HU-15).
--   · mantencion.id_trabajador reemplaza al texto "responsable" (asignación HU-17).
--   · pago: medio de pago y registrado_por opcionales según el origen del pago (HU-02).
--   · Restricciones de unicidad: una suscripción vigente por planta y una cuota por periodo.

-- Usuarios del sistema y su perfil de acceso
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario      SERIAL        PRIMARY KEY,
    nombre          VARCHAR(120)  NOT NULL,
    email           VARCHAR(120)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    rol             VARCHAR(20)   NOT NULL CHECK (rol IN ('cliente', 'trabajador', 'administrador')),
    activo          BOOLEAN       NOT NULL DEFAULT true,
    fecha_creacion  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Comunas donde opera ENINTI (calendario por comuna, HU-04)
CREATE TABLE IF NOT EXISTS comuna (
    id_comuna  SERIAL       PRIMARY KEY,
    nombre     VARCHAR(60)  NOT NULL UNIQUE
);

-- Cliente suscriptor. id_usuario queda vacío hasta que el cliente se registra (HU-07)
CREATE TABLE IF NOT EXISTS cliente (
    id_cliente  SERIAL        PRIMARY KEY,
    id_usuario  INTEGER       UNIQUE REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    rut         VARCHAR(12)   NOT NULL UNIQUE,
    nombre      VARCHAR(120)  NOT NULL,
    telefono    VARCHAR(20),
    direccion   VARCHAR(200),
    id_comuna   INTEGER       REFERENCES comuna(id_comuna) ON DELETE RESTRICT
);

-- Planta fotovoltaica con su ficha técnica (HU-03, HU-10)
CREATE TABLE IF NOT EXISTS planta (
    id_planta          SERIAL        PRIMARY KEY,
    id_cliente         INTEGER       NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    id_comuna          INTEGER       NOT NULL REFERENCES comuna(id_comuna)   ON DELETE RESTRICT,
    direccion          VARCHAR(200)  NOT NULL,
    potencia_kw        NUMERIC(6,2)  NOT NULL CHECK (potencia_kw > 0),
    inversor           VARCHAR(100)  NOT NULL,
    paneles            VARCHAR(100)  NOT NULL,
    baterias           VARCHAR(100), -- NULL si la planta no tiene baterías
    fecha_instalacion  DATE          NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_planta_cliente ON planta(id_cliente);
CREATE INDEX IF NOT EXISTS idx_planta_comuna  ON planta(id_comuna);

-- Suscripción mensual de mantención de una planta (único tipo de suscripción).
-- La cuota y las mantenciones anuales se guardan aquí para conservar lo pactado si cambian.
CREATE TABLE IF NOT EXISTS suscripcion (
    id_suscripcion     SERIAL       PRIMARY KEY,
    id_planta          INTEGER      NOT NULL REFERENCES planta(id_planta) ON DELETE RESTRICT,
    monto_mensual      INTEGER      NOT NULL CHECK (monto_mensual > 0), -- CLP
    fecha_inicio       DATE         NOT NULL DEFAULT CURRENT_DATE,
    dia_cobro          SMALLINT     NOT NULL DEFAULT 1 CHECK (dia_cobro BETWEEN 1 AND 28),
    -- Mantenciones preventivas incluidas por año (HU-04 las programa a partir de este valor)
    mantenciones_anuales SMALLINT   NOT NULL DEFAULT 2 CHECK (mantenciones_anuales > 0),
    estado             VARCHAR(20)  NOT NULL DEFAULT 'al_dia'
                       CHECK (estado IN ('al_dia', 'morosa', 'cancelada')),
    fecha_cancelacion  DATE,
    CHECK ((estado = 'cancelada') = (fecha_cancelacion IS NOT NULL))
);

-- Una planta tiene como máximo una suscripción vigente
CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_vigente
    ON suscripcion(id_planta) WHERE estado <> 'cancelada';

-- Aceptación digital de las condiciones del servicio (RF-19, RNF-04)
CREATE TABLE IF NOT EXISTS aceptacion_condiciones (
    id_aceptacion        SERIAL       PRIMARY KEY,
    id_suscripcion       INTEGER      NOT NULL REFERENCES suscripcion(id_suscripcion) ON DELETE RESTRICT,
    version_condiciones  VARCHAR(10)  NOT NULL,
    fecha_aceptacion     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ip_origen            VARCHAR(45)  -- admite IPv6
);

-- Medio de pago inscrito en la pasarela (HU-13).
-- Solo se guarda el token y datos de referencia, nunca el número de tarjeta (RNF-03).
CREATE TABLE IF NOT EXISTS medio_pago (
    id_medio_pago      SERIAL        PRIMARY KEY,
    id_cliente         INTEGER       NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    token_pasarela     VARCHAR(255)  NOT NULL,
    marca              VARCHAR(20),
    ultimos_4          CHAR(4)       CHECK (ultimos_4 ~ '^[0-9]{4}$'),
    estado             VARCHAR(20)   NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    fecha_inscripcion  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Cuota mensual generada para cada suscripción (HU-01, HU-08)
CREATE TABLE IF NOT EXISTS cuota (
    id_cuota           SERIAL       PRIMARY KEY,
    id_suscripcion     INTEGER      NOT NULL REFERENCES suscripcion(id_suscripcion) ON DELETE RESTRICT,
    periodo            CHAR(7)      NOT NULL CHECK (periodo ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), -- 'YYYY-MM'
    monto              INTEGER      NOT NULL CHECK (monto > 0),
    fecha_vencimiento  DATE         NOT NULL,
    estado             VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente', 'pagada', 'vencida', 'anulada')),
    UNIQUE (id_suscripcion, periodo)
);

CREATE INDEX IF NOT EXISTS idx_cuota_estado ON cuota(estado);

-- Pago de una cuota: por la pasarela (automático) o registrado a mano (HU-02)
CREATE TABLE IF NOT EXISTS pago (
    id_pago         SERIAL        PRIMARY KEY,
    id_cuota        INTEGER       NOT NULL REFERENCES cuota(id_cuota) ON DELETE RESTRICT,
    id_medio_pago   INTEGER       REFERENCES medio_pago(id_medio_pago) ON DELETE RESTRICT,
    registrado_por  INTEGER       REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    origen          VARCHAR(20)   NOT NULL CHECK (origen IN ('pasarela', 'transferencia', 'efectivo')),
    monto           INTEGER       NOT NULL CHECK (monto > 0),
    fecha_pago      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    referencia      VARCHAR(100),
    -- Pago por pasarela si y solo si tiene medio de pago; un pago manual siempre registra quién lo ingresó (RNF-08)
    CHECK ((origen = 'pasarela') = (id_medio_pago IS NOT NULL)),
    CHECK (origen = 'pasarela' OR registrado_por IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pago_cuota ON pago(id_cuota);
CREATE INDEX IF NOT EXISTS idx_pago_fecha ON pago(fecha_pago);

-- Solicitud de mantención hecha por el cliente (HU-11)
CREATE TABLE IF NOT EXISTS solicitud_mantencion (
    id_solicitud     SERIAL        PRIMARY KEY,
    id_planta        INTEGER       NOT NULL REFERENCES planta(id_planta) ON DELETE RESTRICT,
    fecha_solicitud  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    motivo           VARCHAR(255)  NOT NULL,
    estado           VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'asignada', 'rechazada', 'cerrada')),
    fecha_asignada   DATE
);

-- Mantención programada o ejecutada (HU-04, HU-05, HU-14, HU-16, HU-17).
-- id_trabajador debe ser un usuario con rol 'trabajador' (se valida en la API).
CREATE TABLE IF NOT EXISTS mantencion (
    id_mantencion     SERIAL       PRIMARY KEY,
    id_planta         INTEGER      NOT NULL REFERENCES planta(id_planta) ON DELETE RESTRICT,
    id_solicitud      INTEGER      UNIQUE REFERENCES solicitud_mantencion(id_solicitud) ON DELETE RESTRICT,
    id_trabajador     INTEGER      REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    tipo              VARCHAR(20)  NOT NULL CHECK (tipo IN ('preventiva', 'correctiva')),
    fecha_programada  DATE         NOT NULL,
    fecha_ejecucion   DATE,
    actividades       TEXT,
    estado            VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'en_curso', 'finalizada', 'cancelada')),
    CHECK (estado <> 'finalizada' OR fecha_ejecucion IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mantencion_trabajador ON mantencion(id_trabajador, fecha_programada);
CREATE INDEX IF NOT EXISTS idx_mantencion_fecha      ON mantencion(fecha_programada);
