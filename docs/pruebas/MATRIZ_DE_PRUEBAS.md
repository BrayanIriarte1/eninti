# Matriz de pruebas · ENINTI

Verificación de las historias de usuario (HU) y de los requerimientos no funcionales (RNF)
con **resultado esperado, resultado observado, fecha, ambiente y evidencia**, tal como exige
la definición de Hecho (RNF-11) y el criterio de término de las Fases 3 y 5 del Informe U2.

- **Fecha de ejecución:** 28-11-2026.
- **Revisión del código:** rama `feat/cierre-verificacion` (sobre `main` `edff23a`).
- **Ambiente local:** Windows 11, Node.js 26, PostgreSQL 18, frontend compilado (`vite build`)
  servido por la API en `http://localhost:3001`.
- **Ambiente publicado:** https://eninti.onrender.com (Render, plan gratuito, y Neon).
- **Cómo repetirla:** `npm test` (unitarias), `npm run test:integracion --prefix backend`
  (API + PostgreSQL) y `node scripts/medir-calidad.mjs` (rendimiento, 360 px y accesibilidad).

Estado: **Aprobada** = el resultado observado coincide con el esperado ·
**Pendiente UAT** = falta la validación del Product Owner (Fase 6).

## 1. Resumen

| Conjunto | Pruebas | Resultado |
|---|---|---|
| Unitarias del backend (`node --test`) | 41 | 41 aprobadas |
| Unitarias del frontend (Vitest) | 14 | 14 aprobadas |
| Integración: API completa contra PostgreSQL (`tests/integracion`) | 31 | 31 aprobadas |
| Restauración de respaldo (`db:restaurar --verificar`) | 23 tablas | 0 diferencias |
| Desborde a 360 px | 32 pantallas | 0 con desborde |
| Accesibilidad automática | 32 pantallas × 2 anchos | 0 hallazgos tras corregir 2 (ver §4) |
| ESLint del frontend | — | sin errores |

## 2. Historias de usuario

La columna *Evidencia* indica el archivo y el nombre de la prueba automática
(`tests/integracion/…` corre contra PostgreSQL real; `tests/…` son unitarias).

| HU | Criterio verificado | Resultado esperado | Resultado observado | Evidencia | Estado |
|---|---|---|---|---|---|
| HU-01 Impagos | Las cuotas vencidas se agrupan por suscripción con monto | Lista no vacía con los datos de prueba y monto adeudado > 0 | Lista con deudas y montos | `historias.integracion.js` · HU-01 | Aprobada · Pendiente UAT |
| HU-01 Morosidad | Deuda de más de un mes cancela solo si no hay tarjeta o el cobro fue rechazado | Sin tarjeta → cancelada; con tarjeta → sigue con deuda hasta cobrar; rechazo → cancelada; cobro en espera → no se cancela | Los 4 escenarios se comportan así | `morosidad.integracion.js` (3 pruebas) | Aprobada |
| HU-02 Pago manual | Transferencia exige N° de operación; el pago guarda quién lo registró; no hay doble pago | 400 sin referencia; pago con `registrado_por` = administrador; segundo pago 409 | 400 / pago auditado / 409 | `historias.integracion.js` · HU-02 | Aprobada · Pendiente UAT |
| HU-03 Clientes y plantas | Alta y edición con validación; nueva planta por solicitud del cliente | Planta creada a nombre del cliente con su ficha; datos inválidos 400 | Como se esperaba | `solicitudPlanta.integracion.js` (7 pruebas) | Aprobada · Pendiente UAT |
| HU-04 Calendario | Mantenciones por comuna, con trabajador o «Sin asignar» | Vista correcta en 360 y 1280 px | Revisada en navegador; sin desborde | `scripts/medir-calidad.mjs` · `/admin/calendario` | Pendiente UAT |
| HU-05 Registro de la visita | No se envía sin actividades ni sin fotos | 400 sin fotos; 200 con actividades y 1 foto; queda «por confirmar» | 400 / 200 / por confirmar | `historias.integracion.js` · HU-16 y HU-05 | Aprobada · Pendiente UAT |
| HU-06 Listado mensual | Pagos del período | 200 con el período AAAA-MM | 200 | `historias.integracion.js` · HU-06 | Aprobada · Pendiente UAT |
| HU-07 Acceso | El login no revela qué dato falló; cada perfil solo entra a lo suyo | Mismo mensaje 401 para correo y clave erróneos; 403 en rutas de otro rol | Como se esperaba | `historias.integracion.js` · HU-07 y RNF-10 | Aprobada · Pendiente UAT |
| HU-08 Mi cuenta | Resumen del cliente autenticado | 200 con sus suscripciones | 200 | `historias.integracion.js` · HU-08 | Aprobada · Pendiente UAT (≤ 3 acciones: prueba de usabilidad) |
| HU-09 Última y próxima | Visitas finalizadas y programadas por planta | Se ven en *Mantenciones* | Revisado en navegador | `/cliente/mantenciones` | Pendiente UAT |
| HU-10 Ficha técnica | Planta propia visible; ajena 404 | 200 con potencia e inversor; 404 para una planta de otro cliente | 200 / 404 | `historias.integracion.js` · HU-10 | Aprobada · Pendiente UAT |
| HU-11 Solicitud de mantención | Pendiente visible para el administrador y aviso al programarla | Aviso al cliente al programar | Aviso en campana y correo | `notificaciones.integracion.js` · programar una orden | Aprobada · Pendiente UAT |
| HU-12 Cancelación | Cancela con motivo «cliente»; una ya cancelada se trata como ajena | 200 y `motivo_cancelacion = cliente`; 404 al repetir | 200 / cliente / 404 | `historias.integracion.js` · HU-12 | Aprobada · Pendiente UAT |
| HU-13 Medio de pago | Exige aceptar condiciones; cobro automático aprueba o rechaza | 400 sin aceptar; tarjeta 0002 rechazada, 4242 aprobada | Como se esperaba | `historias.integracion.js` · HU-13; `morosidad.integracion.js`; `tests/pasarela.test.js` | Aprobada (simulada) · Flow con credenciales reales pendiente |
| HU-14 Agenda | Solo órdenes propias, ordenadas por fecha | Ninguna orden ajena; fechas ascendentes | Como se esperaba | `historias.integracion.js` · HU-14 | Aprobada · Pendiente UAT |
| HU-15 Trabajadores | Al desactivar, el token anterior deja de servir | 200 antes; 401 después | 200 / 401 | `historias.integracion.js` · HU-15 | Aprobada |
| HU-16 Estados de la orden | Sin saltos; historial; bloqueo mientras espera al cliente | 409 al saltar; historial `en_curso → por_confirmar`; 409 al cambiar una orden por confirmar | Como se esperaba | `historias.integracion.js` · HU-16 y HU-05; `tests/estadosOrden.test.js` | Aprobada |
| HU-17 Asignación | Solo trabajadores activos | 400 al asignar a un administrador; 201 a un técnico | 400 / 201 | `historias.integracion.js` · HU-17 | Aprobada |
| CU-23 Confirmación | El cliente confirma y la orden se finaliza | Estado `finalizada` | `finalizada` | `historias.integracion.js` · CU-23 | Aprobada · Pendiente UAT |
| CU-36 Nueva planta | Duplicados, límite de 3, aislamiento, aprobación con ficha y plan opcional | 409 / 409 / 403 / 200 con planta y suscripción | Como se esperaba | `solicitudPlanta.integracion.js` | Aprobada · Pendiente UAT |
| CU-37 Campana | Avisos al rol correcto; aislamiento; marcar leídas | Admin, técnico y cliente reciben sus avisos; ajeno 404 | Como se esperaba | `notificaciones.integracion.js` (6 pruebas) | Aprobada · Pendiente UAT |

## 3. Requerimientos no funcionales

### RNF-05 · Carga inicial con red 3G simulada (< 5 s)

Medido con Edge sin ventana, ancho 360 px, caché desactivada y los perfiles de red de
Chrome DevTools. FCP = primer contenido visible; LCP = contenido principal visible.

| Página | Ambiente | Red | FCP | LCP | Transferido |
|---|---|---|---|---|---|
| Inicio de sesión | **Publicado (Render)** | 3G rápido (562,5 ms; 1,6 Mbit/s) | 2,1 s | **2,1 s** | 125 KB |
| Inicio de sesión | Publicado (Render) | 3G lento (2.000 ms; 500 kbit/s) | 6,4 s | 6,4 s | 125 KB |
| Inicio de sesión | Local | 3G rápido | 3,4 s | 3,4 s | 422 KB |
| Agenda del técnico | Local | 3G rápido | 3,6 s | 5,4 s | 431 KB |
| Mi cuenta del cliente | Local | 3G rápido | 3,6 s | 5,3 s | 415 KB |
| Agenda / Mi cuenta | Local | 3G lento | 12,2 s | 14,1 s | 396 KB |

**Lectura.** En el sitio publicado la carga inicial **cumple** el RNF-05 con 3G (2,1 s): Render
comprime los archivos (125 KB frente a 422 KB sin comprimir en el servidor local). Las vistas con
sesión se midieron solo en local, sin compresión, y quedan en 5,3–5,4 s de LCP. Esa cifra es
pesimista, porque en Render el paquete se descarga comprimido igual que en el login.
**Pendiente:** medir la agenda y *Mi cuenta* en Render con una sesión real. Con 3G lento ninguna
vista baja de 5 s; si se exige ese escenario, convendría dividir el paquete JavaScript por perfil.

### RNF-02 · Sin desplazamiento horizontal a 360 px

Revisadas **32 pantallas** de los cuatro perfiles (público, administrador, técnico y cliente):
**0 con desborde** (`scrollWidth` = `clientWidth`). Evidencia: `scripts/medir-calidad.mjs`.

### RNF-01 · Accesibilidad (revisión automática WCAG 2.1 AA)

Revisadas las 32 pantallas a 360 y 1280 px: idioma del documento, títulos, un `h1` por página
sin saltos de nivel, imágenes con `alt`, botones y enlaces con nombre accesible, controles de
formulario con etiqueta y contraste de texto (4,5:1, o 3:1 para texto grande).

| Hallazgo | Pantallas | Corrección |
|---|---|---|
| El número de teléfono no tenía nombre accesible (el `<label>` solo nombra el primer control, el código de país) | Solicitar cuenta, Clientes, Trabajadores, Mis datos | `aria-label="Número de teléfono"` en `TelefonoInput.jsx` |
| El selector de trabajador de cada visita no tenía nombre | Calendario | `aria-label` con la fecha de la visita |

Tras corregirlos: **0 hallazgos**. En contraste se midieron 1.711 textos sobre fondo liso con
**0 fallas**; otros 1.746 están sobre imágenes o degradados y no se pueden calcular de forma
automática (portadas de inicio): se revisan a ojo en la UAT. El texto base es de 16 px.
**Pendiente:** navegación completa con teclado y lector de pantalla, y la prueba de usabilidad con
personas del perfil objetivo (meta: ≥ 80 % de tareas sin ayuda; información de pago en ≤ 3 acciones).

### RNF-09 · Respaldo y restauración

| Paso | Resultado |
|---|---|
| `npm run db:respaldo` | Respaldo de 743 KB creado con `pg_dump` |
| `npm run db:restaurar -- --verificar` | Restaurado en una base temporal en 1,2 s; **23 de 23 tablas con la misma cantidad de filas**; base temporal eliminada |

El objetivo RPO ≤ 24 h exige programar el respaldo diario del ambiente publicado (tarea programada
que ejecute `npm run db:respaldo` contra la base de Neon) o usar la restauración que ofrezca el plan
contratado; queda como decisión operativa para la puesta en marcha.

### RNF-03, RNF-08 y RNF-10 · Seguridad

| Control | Evidencia | Estado |
|---|---|---|
| Sin datos de tarjeta en la base (solo token y 4 dígitos) | `historias.integracion.js` · RNF-03 (revisa las columnas de `medio_pago`) | Aprobada |
| Autorización por recurso (planta ajena 404, aviso ajeno 404, rutas de otro rol 403) | `historias.integracion.js`, `notificaciones.integracion.js`, `solicitudPlanta.integracion.js` | Aprobada |
| Contraseñas con scrypt y sal aleatoria | `tests/password.test.js` | Aprobada |
| Bloqueo del correo tras 5 intentos fallidos (429, aun con la clave correcta) | `historias.integracion.js` · RNF-10 | Aprobada |
| Límite de peticiones por IP (429) | `tests/seguridad.test.js` · limitarTasa | Aprobada |
| Usuario desactivado pierde el acceso de inmediato | `historias.integracion.js` · HU-15 | Aprobada |
| Pagos y cambios de estado auditados | `historias.integracion.js` · HU-02 y HU-16 | Aprobada |

## 4. Defectos encontrados y corregidos en esta verificación

| # | Defecto | Corrección |
|---|---|---|
| 1 | Se aceptaba una cuota mensual simbólica ($1) | Mínimo de $1.000 en backend (`shared/utils/cuota.js`) y en los formularios |
| 2 | Teléfono sin nombre accesible | `aria-label` en `TelefonoInput.jsx` |
| 3 | Selector de trabajador del calendario sin nombre accesible | `aria-label` en `CalendarioPage.jsx` |
| 4 | `pg_dump` fallaba si PostgreSQL no estaba en el PATH | Búsqueda automática en `backend/scripts/pg-herramientas.js` |

## 5. Pendiente para el cierre (Fase 6)

1. **UAT con el Product Owner** siguiendo [docs/actas/GUION_UAT.md](../actas/GUION_UAT.md) y firma del
   [acta de aceptación](../actas/ACTA_DE_ACEPTACION.md).
2. Prueba de usabilidad con 2 o 3 personas del perfil objetivo.
3. Medir la agenda y *Mi cuenta* en Render con sesión (RNF-05).
4. Flow sandbox con credenciales reales (opcional: la pasarela simulada ya demuestra el ciclo).
