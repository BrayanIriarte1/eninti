-- Normaliza los RUT guardados antes del rutificador (cb45e63) al formato canónico
-- 12345678-9 (sin puntos, con guion y DV en mayúscula), el mismo que usa
-- shared/utils/rut.js. Así la búsqueda "este RUT ya tiene cuenta" encuentra también
-- a los clientes antiguos. Es idempotente; si al normalizar un RUT chocaría con otro
-- ya existente (cliente duplicado), se deja intacto para revisarlo a mano.

CREATE OR REPLACE FUNCTION pg_temp.rut_canonico(valor TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN length(x) < 2 THEN x ELSE left(x, length(x) - 1) || '-' || right(x, 1) END
  FROM (SELECT upper(regexp_replace(valor, '[^0-9kK]', '', 'g')) AS x) AS limpio
$$;

UPDATE cliente c
SET rut = pg_temp.rut_canonico(c.rut)
WHERE c.rut <> pg_temp.rut_canonico(c.rut)
  AND NOT EXISTS (SELECT 1 FROM cliente otro WHERE otro.rut = pg_temp.rut_canonico(c.rut));

UPDATE solicitud_cuenta s
SET rut = pg_temp.rut_canonico(s.rut)
WHERE s.rut <> pg_temp.rut_canonico(s.rut)
  AND NOT (s.estado = 'pendiente' AND EXISTS (
    SELECT 1 FROM solicitud_cuenta otra
    WHERE otra.estado = 'pendiente' AND otra.rut = pg_temp.rut_canonico(s.rut)
  ));
