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
| Clientes | Alta y edición de la ficha administrativa del cliente | HU-03 |
| Trabajadores | Crear, editar y desactivar cuentas de trabajador | HU-15 |
| Calendario | Ver mantenciones agrupadas por comuna, filtrar y asignar trabajador | HU-04, HU-17 |
| Solicitudes | Programar como mantención o rechazar las solicitudes del cliente | HU-11 |
| Impagos | Ver morosos por antigüedad, contactar y registrar pagos manuales | HU-01, HU-02 |
| Pagos del mes | Listado mensual, exportar CSV, generar cuotas y procesar cargos | HU-06 |
| Catálogo | Administrar planes y servicios del cotizador | RNF-07 |

**Flujo financiero del mes:** en *Pagos del mes* se usa "Generar cuotas del
período" para emitir las cuotas y marcar vencidas las atrasadas; "Procesar cargos
recurrentes" cobra en la pasarela a quienes tengan medio de pago activo. Los pagos
por transferencia o efectivo se registran desde *Impagos → Ver cuotas*.

## Perfil Trabajador

| Sección | Qué permite | HU |
|---|---|---|
| Mi agenda | Ver solo sus órdenes, ordenadas por fecha, con enlace al mapa | HU-14 |
| Detalle de orden | Ver ficha técnica, iniciar y finalizar la visita con actividades | HU-05, HU-16 |

El cambio de estado respeta la secuencia `pendiente → en curso → finalizada` y
guarda historial con responsable y hora. No se puede finalizar sin registrar
actividades. La ficha advierte si la planta tiene banco de baterías.

## Perfil Cliente

| Sección | Qué permite | HU |
|---|---|---|
| Mi cuenta | Deuda, meses pagados, historial, inscribir medio de pago y cancelar | HU-08, HU-12, HU-13 |
| Mis plantas | Consultar la ficha técnica de cada planta propia | HU-10 |
| Mantenciones | Última mantención finalizada y próxima programada | HU-09 |
| Solicitudes | Pedir una mantención y seguir su estado | HU-11 |

También se registra y accede desde `/registro` con un RUT previamente registrado
por ENINTI (HU-07).

## Público (sin sesión)

- `/cotizador` — planes y servicios con precios (RNF-07).
- `/pasarela-simulada` — formulario de inscripción de tarjeta para la demo (HU-13).

---

## Referencia de la API

Base: `/api`. Salvo las rutas públicas y de autenticación, todas requieren el
encabezado `Authorization: Bearer <token>` obtenido en el login.

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Inicia sesión. Devuelve `token` y `usuario` |
| POST | `/auth/registro` | Registro del cliente (RUT ya registrado) |
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

### Trabajador (`rol = trabajador`)
| Método | Ruta | HU |
|---|---|---|
| GET | `/trabajador/agenda` | HU-14 |
| GET | `/trabajador/ordenes/:id` | HU-16 |
| POST | `/trabajador/ordenes/:id/estado` | HU-05, HU-16 |

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
| GET/POST | `/admin/solicitudes`, `/admin/solicitudes/:id/rechazar` | HU-11 |
| GET | `/admin/finanzas/impagos` | HU-01 |
| POST | `/admin/cuotas/:id/pagos` | HU-02 |
| GET | `/admin/finanzas/pagos?periodo=YYYY-MM&formato=csv` | HU-06 |
| POST | `/admin/finanzas/generar-cuotas` | motor de cuotas |
| POST | `/admin/finanzas/procesar-cargos` | cobro recurrente |
| GET/POST/PATCH | `/admin/catalogo`, `/admin/catalogo/:id` | RNF-07 |

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
