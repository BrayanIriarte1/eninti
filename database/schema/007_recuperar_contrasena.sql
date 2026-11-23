-- ENINTI · Migración 007: cambio y recuperación de contraseña
--   · usuario.password_actualizado: cuándo cambió la contraseña. Los JWT emitidos antes
--     dejan de valer, así cambiar o restablecer la contraseña cierra las otras sesiones.
--   · recuperacion_contrasena: enlaces de un solo uso para restablecerla por correo.
--     Solo se guarda el hash SHA-256 del token (quien lea la base no puede usar el enlace),
--     vence en 1 hora y se marca como usado al restablecer.
-- Se puede ejecutar varias veces sin efectos adicionales.

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS password_actualizado TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS recuperacion_contrasena (
    id_recuperacion  SERIAL       PRIMARY KEY,
    id_usuario       INT          NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash       CHAR(64)     NOT NULL UNIQUE,
    expira           TIMESTAMPTZ  NOT NULL,
    usado            TIMESTAMPTZ,
    fecha_creacion   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recuperacion_usuario ON recuperacion_contrasena(id_usuario);
