# Manual de uso y referencia de la API · ENINTI

Documento operativo de la plataforma: qué hace cada perfil, las 17 historias de
usuario implementadas y el detalle de los endpoints de la API REST.

## Credenciales de prueba

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@eninti.test` | `Admin.2026` |
| Trabajador | `pedro.ramirez@eninti.test` | `Trabajador.2026` |
| Cliente | `maria.gonzalez@ejemplo.cl` | `Cliente.2026` |
| Cliente | `luis.perez@ejemplo.cl` | `Cliente.2026` |

## Inicio de servidores

```bash
npm run dev            # backend (3001) + frontend (5174)
```

App: http://localhost:5174 · API: http://localhost:3001/api

---

## Perfil Administrador

Tras iniciar sesión llega al panel `/admin` con indicadores de morosidad,
solicitudes pendientes y mantenciones sin asignar.

| Sección | Qué permite | HU |
|---|---|---|
| Plantas | Crear/editar la ficha técnica y gestionar la suscripción de cada planta | HU-03 |
| Clientes | Alta y edición de la ficha administrativa; la columna **Cuenta web** muestra el correo y el último acceso, o el correo con que el cliente pidió su cuenta (se usa al pulsar *Crear cuenta*) | HU-03, HU-07 |
| Trabajadores | Crear, editar y desactivar cuentas de trabajador | HU-15 |
| Calendario | Ver mantenciones por comuna, asignar trabajador, ver las fotos del trabajo y cerrar una orden sin el cliente | HU-04, HU-17 |
| Solicitudes | Programar como mantención o rechazar las solicitudes del cliente | HU-11 |
| Suscripciones | Aceptar (fijando cuota y día de cobro) o rechazar las solicitudes de suscripción, viendo la deuda del cliente | HU-12 |
| Nuevas plantas | Aprobar con la ficha técnica (y, si el cliente ya contrató el plan, crear su suscripción en el mismo paso) o rechazar con motivo las plantas que piden los clientes | CU-36 |
| Cambios de datos | Aprobar o rechazar los cambios de correo o teléfono que piden los clientes | HU-07 |
| Impagos | Ver morosos por antigüedad, contactar y registrar pagos manuales; indica si el cliente tiene cuenta web y tarjeta o paga por transferencia/efectivo | HU-01, HU-02 |
| Pagos del mes | Listado mensual, exportar CSV, generar cuotas y procesar cargos | HU-06 |
| Catálogo | Administrar planes y servicios del cotizador | RNF-07 |

**Flujo financiero del mes:** en *Pagos del mes* se usa "Generar cuotas del
período" para emitir las cuotas y marcar vencidas las atrasadas; "Procesar cargos
recurrentes" cobra en la pasarela a quienes tengan medio de pago activo. Los pagos
por transferencia o efectivo se registran desde *Impagos → Ver cuotas*.

**Reglas de deuda (automáticas).** El estado de la suscripción ya no se marca a mano:

| Situación | Estado de la suscripción |
|---|---|
| Sin cuotas vencidas | **Al día** |
| Alguna cuota vencida hace menos de un mes | **Activa con deuda**: sigue vigente y se puede pagar |
| Se paga toda la deuda | Vuelve de inmediato a **Al día** |
| La deuda más antigua supera un mes **y** el cliente no tiene tarjeta activa, o el cobro de esa cuota ya fue rechazado | **Cancelada por morosidad**; las cuotas futuras se anulan y la deuda queda por cobrar |
| La deuda supera un mes pero el cliente tiene tarjeta activa y aún no se intenta el cobro (o está en espera) | Sigue **activa con deuda** hasta que el cobro se resuelva |

Las reglas se aplican al iniciar la API, cada hora, al generar cuotas, al procesar
cargos y al registrar un pago. **Solo el administrador otorga suscripciones:** si el
cliente cancela o queda cancelado por deuda, debe enviar una solicitud desde *Mi cuenta*
y el administrador la acepta (con la cuota acordada, mínimo $1.000) o la rechaza explicando el motivo.

## Perfil Trabajador

| Sección | Qué permite | HU |
|---|---|---|
| Mi agenda | Ver solo sus órdenes, ordenadas por fecha, con enlace a Google Maps | HU-14 |
| Detalle de orden | Ver ficha técnica, iniciar la visita y enviarla al cliente con actividades y fotos | HU-05, HU-16 |

El enlace del mapa busca en Google Maps **la dirección registrada de la planta**
(dirección, comuna y región), así se abre exactamente el lugar escrito.

**Cierre de la orden con el cliente:** `pendiente → en curso → esperando al cliente → finalizada`.
Al terminar, el técnico registra las actividades y adjunta de 1 a 4 fotos (se pueden
tomar con la cámara del celular; el navegador las reduce a unos 300 KB). La orden queda
*esperando al cliente*. El cliente revisa las fotos y responde si se solucionó el
problema y si quedó satisfecho: si se solucionó, la orden queda **finalizada**; si no,
vuelve a **en curso** con su comentario para que el técnico regrese. Cada paso queda en
el historial. Si el cliente no puede confirmar, el administrador puede cerrarla desde el
*Calendario* indicando el motivo.

## Perfil Cliente

| Sección | Qué permite | HU |
|---|---|---|
| Mi cuenta | Deuda, meses pagados, historial, inscribir medio de pago, cancelar y pedir una nueva suscripción | HU-08, HU-12, HU-13 |
| Mis plantas | Consultar la ficha técnica y el estado del plan de cada planta, y **solicitar una nueva planta** (máximo 3 pendientes) | HU-10, CU-36 |
| Mantenciones | Confirmar los trabajos terminados (con fotos), última y próxima mantención | HU-09 |
| Solicitudes | Pedir una mantención y seguir su estado | HU-11 |
| Mis datos | Ver sus datos y pedir cambiar correo o teléfono (con motivo); se aplica cuando el administrador aprueba | HU-07 |

## Campana de notificaciones (los tres perfiles)

Arriba a la derecha de cada panel hay una **campana** con el número de avisos sin leer
(CU-37). Se actualiza sola cada 30 segundos y al volver a la pestaña. Al pulsar un aviso
queda leído y lleva a la pantalla correspondiente; *Marcar todas como leídas* las limpia.

| Perfil | Recibe avisos de |
|---|---|
| Administrador | Solicitudes nuevas (cuenta, mantención, suscripción, planta, cambio de datos), cancelaciones de suscripción, técnico que inicia o termina una visita, cliente que confirma o reclama, cobros rechazados |
| Cliente | Respuestas a sus solicitudes, mantención programada o cancelada, trabajo terminado por confirmar, cobro rechazado |
| Técnico | Visita asignada, cancelada o reabierta por reclamo del cliente |

Los avisos leídos de más de 90 días se borran solos.

## Cuentas de cliente

El cliente **no crea su propia cuenta** (HU-07). Si aún no tiene acceso, en el login
pulsa **Contacta al administrador** (`/solicitar-cuenta`) y envía sus datos y los de su
planta. El administrador revisa la solicitud en **Nuevas cuentas**, crea el cliente y su
cuenta con una contraseña inicial, se la comunica y registra la planta.

## Público (sin sesión)

- `/cotizador` — planes y servicios con precios (RNF-07).
- `/pasarela-simulada` — formulario de inscripción de tarjeta para la demo (HU-13).
  Últimos dígitos **0000**: la pasarela rechaza la tarjeta y *Mi cuenta* lo informa.
  **0002**: la tarjeta se inscribe, pero los cobros mensuales se rechazan.
  Cualquier otro número: se inscribe y se cobra bien.

---

## Referencia de la API

> **Documentación interactiva (Swagger UI):** http://localhost:5174/api/docs
> (también en http://localhost:3001/api/docs). Muestra los endpoints con sus
> parámetros, esquemas y respuestas, y permite ejecutarlos con **Try it out**.
> Para los endpoints protegidos: ejecuta `POST /auth/login`, copia el `token` y
> pégalo en el botón **Authorize**. La especificación OpenAPI en JSON está en
> `/api/docs.json`; se mantiene en `backend/src/docs/openapi.js` y debe
> actualizarse junto con cada endpoint nuevo.
>
> Las tablas siguientes son un resumen rápido.

Base: `/api`. Salvo las rutas públicas y de autenticación, todas requieren el
encabezado `Authorization: Bearer <token>` obtenido en el login.

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Inicia sesión. Devuelve `token` y `usuario` |
| GET | `/auth/me` | Perfil del usuario autenticado |

### Público
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/publico/catalogo` | Planes y servicios activos |
| POST | `/pagos/simulada/confirmar` | Retorno de la pasarela simulada |

### Cliente (`rol = cliente`)
| Método | Ruta | HU |
|---|---|---|
| GET | `/cliente/cuenta` | HU-08 |
| GET | `/cliente/plantas`, `/cliente/plantas/:id` | HU-10 |
| GET | `/cliente/mantenciones` | HU-09 |
| GET/POST | `/cliente/solicitudes` | HU-11 |
| POST | `/cliente/suscripciones/:id/cancelar` | HU-12 |
| POST | `/cliente/suscripciones/:id/inscripcion` | HU-13 |
| POST | `/cliente/solicitudes-suscripcion` | HU-12 |
| GET | `/cliente/ordenes/por-confirmar` | HU-05 |
| POST | `/cliente/ordenes/:id/confirmar` | HU-05, HU-16 |
| GET | `/cliente/datos` · POST `/cliente/datos/solicitudes` | HU-07 |
| GET/POST | `/cliente/solicitudes-planta` | CU-36 |

### Trabajador (`rol = trabajador`)
| Método | Ruta | HU |
|---|---|---|
| GET | `/trabajador/agenda` | HU-14 |
| GET | `/trabajador/ordenes/:id` | HU-16 |
| POST | `/trabajador/ordenes/:id/estado` (`en_curso`, o `por_confirmar` con `actividades` y `fotos`) | HU-05, HU-16 |

### Administrador (`rol = administrador`)
| Método | Ruta | HU |
|---|---|---|
| GET/POST/PUT | `/admin/clientes`, `/admin/clientes/:id` | HU-03 |
| GET/POST/PUT | `/admin/plantas`, `/admin/plantas/:id` | HU-03 |
| GET/POST/PATCH | `/admin/plantas/:id/suscripciones`, `/admin/suscripciones/:id` | HU-03 |
| GET/POST/PATCH | `/admin/trabajadores`, `/admin/trabajadores/:id` | HU-15 |
| GET/POST | `/admin/mantenciones` | HU-04 |
| PATCH | `/admin/mantenciones/:id/asignar` | HU-17 |
| POST | `/admin/mantenciones/:id/cancelar` | HU-16 |
| GET | `/admin/mantenciones/:id/fotos` | HU-05 |
| POST | `/admin/mantenciones/:id/cerrar` (sin confirmación del cliente) | HU-16 |
| GET/POST | `/admin/solicitudes-suscripcion`, `/:id/aprobar`, `/:id/rechazar` | HU-12 |
| GET/POST | `/admin/solicitudes-datos`, `/:id/aprobar`, `/:id/rechazar` | HU-07 |
| GET/POST | `/admin/solicitudes`, `/admin/solicitudes/:id/rechazar` | HU-11 |
| GET/POST | `/admin/solicitudes-planta`, `/:id/aprobar` (con `suscripcion` opcional), `/:id/rechazar` | CU-36 |
| GET | `/admin/finanzas/impagos` | HU-01 |
| POST | `/admin/cuotas/:id/pagos` | HU-02 |
| GET | `/admin/finanzas/pagos?periodo=YYYY-MM&formato=csv` | HU-06 |
| POST | `/admin/finanzas/generar-cuotas` | motor de cuotas |
| POST | `/admin/finanzas/procesar-cargos` | cobro recurrente |
| GET/POST/PATCH | `/admin/catalogo`, `/admin/catalogo/:id` | RNF-07 |

### Notificaciones (cualquier perfil con sesión)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/notificaciones` | Últimos 30 avisos propios y cantidad sin leer (CU-37) |
| POST | `/notificaciones/:id/leer` | Marca un aviso propio como leído (uno ajeno responde 404) |
| POST | `/notificaciones/leer-todas` | Marca todos los avisos propios como leídos |

---

## Seguridad implementada

- Contraseñas con **scrypt + sal aleatoria** (RNF-10).
- **JWT de 8 horas**; cada petición revalida que el usuario siga activo, de modo
  que desactivar un trabajador invalida sus tokens vigentes (HU-15).
- **Bloqueo por 5 intentos** fallidos de login durante 15 minutos (RNF-10).
- Autorización **por rol y por propiedad del recurso** en el backend: un cliente
  nunca ve plantas ajenas, un trabajador nunca ve órdenes ajenas.
- La pasarela **nunca almacena el número de tarjeta**: solo token y últimos 4
  dígitos (RNF-03). La confirmación es idempotente (notificación repetida).
- Consultas **parametrizadas** y transacciones en operaciones de pago y estado.
