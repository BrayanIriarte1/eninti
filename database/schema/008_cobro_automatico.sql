-- ENINTI · Migración 008: cobro mensual automático
--   · intento_cargo: cada intento de cobro en la pasarela, aprobado o no. Sirve para:
--       - auditar los cobros (también los rechazados),
--       - no reintentar una cuota más de una vez al día ni insistir con una tarjeta muerta,
--       - no volver a cobrar una cuota que la pasarela dejó «pendiente» (evita el cobro doble).
--   · ejecucion_tarea: bitácora de la tarea diaria (generar cuotas del mes y cobrar), para
--     ejecutarla una sola vez al día y mostrar su último resultado en el panel.
-- Se puede ejecutar varias veces sin efectos adicionales.

CREATE TABLE IF NOT EXISTS intento_cargo (
    id_intento     SERIAL       PRIMARY KEY,
    id_cuota       INTEGER      NOT NULL REFERENCES cuota(id_cuota) ON DELETE CASCADE,
    id_medio_pago  INTEGER      REFERENCES medio_pago(id_medio_pago) ON DELETE SET NULL,
    monto          INTEGER      NOT NULL CHECK (monto > 0),
    resultado      VARCHAR(12)  NOT NULL CHECK (resultado IN ('aprobado', 'rechazado', 'pendiente', 'error', 'descartado')),
    referencia     VARCHAR(80),
    origen         VARCHAR(12)  NOT NULL CHECK (origen IN ('manual', 'automatico')),
    fecha          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intento_cargo_cuota ON intento_cargo(id_cuota, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_intento_cargo_pendiente ON intento_cargo(id_cuota) WHERE resultado = 'pendiente';

CREATE TABLE IF NOT EXISTS ejecucion_tarea (
    id_ejecucion  SERIAL       PRIMARY KEY,
    tarea         VARCHAR(40)  NOT NULL,
    origen        VARCHAR(12)  NOT NULL CHECK (origen IN ('programado', 'manual', 'externo')),
    inicio        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fin           TIMESTAMPTZ,
    estado        VARCHAR(12)  NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'ok', 'error')),
    resultado     JSONB,
    error         TEXT
);
CREATE INDEX IF NOT EXISTS idx_ejecucion_tarea ON ejecucion_tarea(tarea, inicio DESC);
