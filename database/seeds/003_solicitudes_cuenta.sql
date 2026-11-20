-- Solicitud de cuenta de ejemplo para la demostración (datos ficticios, RNF-04).
-- Solo se carga si la tabla está vacía.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM solicitud_cuenta) THEN
    RETURN;
  END IF;

  INSERT INTO solicitud_cuenta (nombre, rut, email, telefono, direccion_planta, id_comuna, potencia_kw, tiene_baterias, mensaje)
  SELECT 'Jorge Castillo Muñoz', '44444444-4', 'jorge.castillo@ejemplo.cl', '+56944444444',
         'Pasaje Los Algarrobos 321', id_comuna, 3.2, false,
         'Tengo paneles instalados hace dos años y quiero contratar el plan de mantención.'
  FROM comuna WHERE nombre = 'Calama';
END $$;
