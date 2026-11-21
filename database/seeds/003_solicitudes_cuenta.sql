-- Solicitud de cuenta de ejemplo para la demostración (datos ficticios, RNF-04).
-- Solo se carga en bases de demostración (con los datos ficticios de 001) y si la tabla
-- está vacía: nunca en una base real.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM solicitud_cuenta)
     OR NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'admin@eninti.test') THEN
    RETURN;
  END IF;

  INSERT INTO solicitud_cuenta (nombre, rut, email, telefono, direccion_planta, id_comuna, potencia_kw, tiene_baterias, mensaje)
  SELECT 'Jorge Castillo Muñoz', '44444444-4', 'jorge.castillo@ejemplo.cl', '+56944444444',
         'Pasaje Los Algarrobos 321', id_comuna, 3.2, false,
         'Tengo paneles instalados hace dos años y quiero contratar el plan de mantención.'
  FROM comuna WHERE nombre = 'Calama';
END $$;
