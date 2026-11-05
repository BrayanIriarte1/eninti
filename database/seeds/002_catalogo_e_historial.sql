-- Catálogo público de planes y servicios para el cotizador (RNF-07).
-- Precios de referencia declarados en el informe U1; se administran como datos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM catalogo_servicio) THEN
    RETURN;
  END IF;

  INSERT INTO catalogo_servicio (nombre, descripcion, tipo, precio) VALUES
    ('Plan de mantención básico',
     'Suscripción mensual con 2 mantenciones preventivas al año por planta. IVA incluido.',
     'plan', 15000),
    ('Mantención preventiva adicional',
     'Limpieza de módulos, reapriete de conexiones, revisión de inversor y estructuras.',
     'servicio', 60000),
    ('Visita correctiva de emergencia',
     'Diagnóstico y reparación de fallas en terreno. Valor base; repuestos se cotizan aparte.',
     'servicio', 150000),
    ('Revisión de banco de baterías',
     'Medición de tensiones, inspección de bornes y verificación de parámetros de carga.',
     'servicio', 45000),
    ('Informe técnico de rendimiento',
     'Evaluación del desempeño de la planta con lectura del inversor y recomendaciones.',
     'servicio', 35000);

  -- Historial inicial de las mantenciones de prueba (HU-16):
  -- la orden finalizada registra sus transiciones completas.
  INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario, fecha_cambio)
  SELECT m.id_mantencion, u.id_usuario, h.anterior, h.nuevo, h.comentario,
         m.fecha_programada::timestamptz + h.offset_horas * interval '1 hour'
  FROM mantencion m
  JOIN usuario u ON u.rol = 'trabajador'
  CROSS JOIN (VALUES
    (NULL,        'en_curso',   'Inicio de la visita', 9),
    ('en_curso',  'finalizada', 'Trabajo completado',  11)
  ) AS h(anterior, nuevo, comentario, offset_horas)
  WHERE m.estado = 'finalizada';
END $$;
