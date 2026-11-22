-- ENINTI · Migración 005: reglas de integridad en la base y registro de avisos
--   · Trigger fn_validar_trabajador_mantencion: una mantención solo se asigna a un usuario
--     con rol 'trabajador' y activo (HU-17), aunque la API tuviera un error.
--   · mantencion.fecha_actualizacion: última modificación de la orden (diccionario U1).
--   · aviso_correo: bitácora de los correos transaccionales enviados o fallidos (HU-11, HU-13, HU-17).
--   · medio_pago: el token de la pasarela no se repite (idempotencia de la inscripción).
-- Es idempotente: se puede ejecutar varias veces con npm run db:init.

CREATE OR REPLACE FUNCTION fn_validar_trabajador_mantencion() RETURNS trigger AS $$
BEGIN
  IF NEW.id_trabajador IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.id_trabajador IS DISTINCT FROM OLD.id_trabajador)
     AND NOT EXISTS (SELECT 1 FROM usuario u
                     WHERE u.id_usuario = NEW.id_trabajador AND u.rol = 'trabajador' AND u.activo) THEN
    RAISE EXCEPTION 'Solo se puede asignar la mantención a un trabajador activo'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_trabajador_mantencion ON mantencion;
CREATE TRIGGER trg_validar_trabajador_mantencion
  BEFORE INSERT OR UPDATE OF id_trabajador ON mantencion
  FOR EACH ROW EXECUTE FUNCTION fn_validar_trabajador_mantencion();

ALTER TABLE mantencion ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION fn_mantencion_fecha_actualizacion() RETURNS trigger AS $$
BEGIN
  NEW.fecha_actualizacion := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mantencion_fecha_actualizacion ON mantencion;
CREATE TRIGGER trg_mantencion_fecha_actualizacion
  BEFORE UPDATE ON mantencion
  FOR EACH ROW EXECUTE FUNCTION fn_mantencion_fecha_actualizacion();

CREATE UNIQUE INDEX IF NOT EXISTS uq_medio_pago_token ON medio_pago(token_pasarela)
  WHERE estado = 'activo';

CREATE TABLE IF NOT EXISTS aviso_correo (
    id_aviso      SERIAL        PRIMARY KEY,
    destinatario  VARCHAR(120)  NOT NULL,
    asunto        VARCHAR(200)  NOT NULL,
    motivo        VARCHAR(40)   NOT NULL, -- suscripcion_confirmada, mantencion_programada, ...
    proveedor     VARCHAR(20)   NOT NULL, -- consola, brevo, resend
    estado        VARCHAR(20)   NOT NULL CHECK (estado IN ('enviado', 'fallido')),
    detalle       VARCHAR(300),
    fecha_envio   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aviso_correo_fecha ON aviso_correo(fecha_envio);
