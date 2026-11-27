# Guía de estudio · Presentación ENINTI (modificación de código en vivo)

Versión del código estudiada: `main` @ `78b82a4` (merge PR #12, deploy a Render).

---

## 0. Antes de la presentación (checklist)

```bash
npm run install:all                 # dependencias raíz + backend + frontend
cp backend/.env.example backend/.env   # y ajustar DATABASE_URL / JWT_SECRET
npm run db:init --prefix backend    # crea tablas (schema/) y carga datos (seeds/)
npm run dev                         # backend :3001 + frontend :5174 a la vez
```

- Backend usa `node --watch` → **al guardar un archivo .js se reinicia solo**.
- Frontend usa Vite → **al guardar un .jsx la página se actualiza sola**.
- Si cambias un `.sql` de `database/schema/`, hay que volver a correr `db:init` (es seguro repetirlo).
- Swagger con todos los endpoints: `http://localhost:5174/api/docs`.

Cuentas de prueba:

| Rol | Correo | Clave |
|---|---|---|
| Administrador | admin@eninti.test | Admin.2026 |
| Trabajador | pedro.ramirez@eninti.test | Trabajador.2026 |
| Cliente (al día) | maria.gonzalez@ejemplo.cl | Cliente.2026 |
| Cliente (con deuda) | luis.perez@ejemplo.cl | Cliente.2026 |

Carmen Soto (RUT 33333333-3) **no tiene cuenta web** → sirve para demostrar "Crear cuenta". Jorge Castillo tiene una **solicitud de cuenta pendiente**.

---

## 1. El patrón que se repite SIEMPRE (apréndete esto y puedes navegar todo)

```
FRONTEND                                   BACKEND                                       BD
pages/XxxPage.jsx  → services/xxxService.js → xxx.routes.js → xxx.controller.js → xxx.service.js → PostgreSQL
(pantalla)           (1 línea por endpoint)   (URL + rol)      (lee req, parseId)   (validación + SQL)
```

**Pregunta del profe → dónde busco:**

| Si te piden cambiar… | Archivo |
|---|---|
| Un texto, botón, columna de tabla, etiqueta | `frontend/src/modules/<rol>/pages/*.jsx` |
| Una validación / regla de negocio / mensaje de error | `backend/src/modules/<rol>/*.service.js` |
| Quién puede entrar a un endpoint | `*.routes.js` (`permitirRoles(...)`) |
| Una URL de la API | `*.routes.js` **y** `frontend/.../services/*Service.js` |
| Un menú lateral | `frontend/src/shared/layouts/Layout.jsx` (constante `MENU`) |
| Una pantalla nueva | `frontend/src/routes/AppRoutes.jsx` + `MENU` |
| Un estado permitido / columna / tabla | `database/schema/00X_*.sql` (crear archivo **nuevo** `009_...sql`) |
| Datos de prueba | `database/seeds/*.sql` |
| Colores | `frontend/src/styles/global.css` (variables `:root`, ej. `--color-primario`) |
| Formato de pesos/fechas | `frontend/src/shared/utils/formato.js` |

**Truco #1 en vivo:** cada función, ruta y pantalla tiene un comentario con su caso de uso. Busca `CU-09` (o el que pida el profe) con `Ctrl+Shift+F` y verás todo su recorrido: pantalla → servicio del frontend → ruta → controlador → servicio del backend. La lista completa de casos de uso (incluidos los nuevos CU-23 a CU-35) está en `docs/CASOS_DE_USO_ACTUALIZADOS.md`.

**Truco #2:** usa la búsqueda global de VS Code (`Ctrl+Shift+F`) con el **texto que se ve en pantalla** o con el **mensaje de error**. Te lleva directo al archivo.

---

## 2. Casos de uso → código

### Visitante (sin sesión)

| CU | Backend | Frontend |
|---|---|---|
| **CU-01 Cotizar planes y servicios** (RNF-07) | `GET /api/publico/catalogo` → `publico.routes.js` → `catalogo.service.js · listarPublico()` (solo `activo`, orden por tipo y precio) | `publico/pages/CotizadorPage.jsx` |
| **CU-02 Solicitar cuenta y planta** (HU-07) | `POST /api/publico/solicitudes-cuenta` → `solicitudesCuenta.service.js · crear()` (valida RUT con módulo 11, teléfono `+56…`, una pendiente por RUT, límite 5/hora por IP) | `publico/pages/SolicitarCuentaPage.jsx` (botón "Contacta al administrador" del login) |

### Usuario registrado

| CU | Backend | Frontend |
|---|---|---|
| **CU-03 Iniciar sesión** | `auth.service.js · login()` — JWT **8 h** (`DURACION_SESION`), **5 fallos** (`MAX_INTENTOS`) → bloqueo **15 min** (`BLOQUEO_MS`), error genérico "Credenciales incorrectas o cuenta inactiva". Middleware `shared/middlewares/auth.js · autenticar` revalida en BD que el usuario siga activo en cada petición. | `auth/pages/LoginPage.jsx`, `shared/context/AuthContext.jsx` |

### Cliente (todo en `backend/src/modules/cliente/cliente.service.js`; todas parten de `fichaCliente(idUsuario)` = solo ve lo suyo)

| CU | Función backend | Página |
|---|---|---|
| **CU-04 Consultar estado de cuenta** (HU-08) | `cuenta()` — meses pagados, cuotas vencidas, deuda, últimos **50** pagos, medio de pago activo | `cliente/pages/CuentaPage.jsx` |
| **CU-05 Consultar mantenciones** (HU-09) | `mantenciones()` — última `finalizada` y próxima `pendiente/en_curso` por planta | `MantencionesClientePage.jsx` |
| **CU-06 Consultar ficha de planta** (HU-10) | `misPlantas()`, `obtenerPlanta()` — planta ajena → **404** | `MisPlantasPage.jsx`, `PlantaClientePage.jsx` |
| **CU-07 Solicitar mantención** (HU-11) | `crearSolicitud()` — queda `pendiente` | `SolicitudesClientePage.jsx` |
| **CU-08 Cancelar suscripción** (HU-12) | `cancelarSuscripcion()` — en transacción: `estado='cancelada'`, `motivo='cliente'`, anula cuotas futuras y preventivas pendientes (`reglasDeuda.js · cerrarSuscripciones`) | `CuentaPage.jsx` |
| **CU-09 Inscribir medio de pago** (HU-13) + «include» Aceptar condiciones (RF-19) | `iniciarInscripcion()` — exige `acepta_condiciones === true`, guarda `aceptacion_condiciones` (versión + IP), pide URL a `pagos/pasarela.service.js`. Confirmación: `pagos/pagos.service.js · confirmarInscripcionSimulada` (guarda **solo token + últimos 4**, la tarjeta anterior queda `inactivo`). Simulado: últimos 4 = `0000` → rechazo. | `CuentaPage.jsx` → `publico/pages/PasarelaSimuladaPage.jsx` |
| (extra) Confirmar orden terminada | `confirmarOrden()` — `por_confirmar` → `finalizada` o vuelve a `en_curso` | `MantencionesClientePage.jsx` |
| (extra) Pedir suscripción / cambio de datos | `solicitarSuscripcion()`, `solicitarCambioDatos()` | `CuentaPage.jsx`, `MisDatosPage.jsx` |

### Trabajador (`backend/src/modules/trabajador/trabajador.service.js` — el módulo más corto, ideal para explicar el patrón)

| CU | Función | Página |
|---|---|---|
| **CU-10 Consultar agenda** (HU-14) | `agenda()` — solo `id_trabajador = token`; abiertas por fecha ASC o `?historicas=true` | `trabajador/pages/AgendaPage.jsx` (+ `components/ordenUtils.jsx · enlaceMapa`) |
| **CU-11 Gestionar orden de trabajo** (HU-16) | `obtenerOrden()`, `cambiarEstado()` — valida transición con `shared/utils/estadosOrden.js`; salto inválido → **409** | `OrdenPage.jsx` |
| **CU-12 Registrar actividades y finalizar** «extend» (HU-05) | `cambiarEstado(..., {estado:'por_confirmar', actividades, fotos})` — exige actividades y 1–4 fotos (`shared/utils/fotos.js`, máx 3 MB c/u) | `OrdenPage.jsx` (`MAX_FOTOS = 4`) |

**Máquina de estados** (`backend/src/shared/utils/estadosOrden.js`):

```js
pendiente:     ['en_curso', 'cancelada'],
en_curso:      ['por_confirmar', 'cancelada'],
por_confirmar: ['finalizada', 'en_curso'],   // el cliente confirma o reclama
finalizada:    [],
cancelada:     [],
```

### Administrador (`backend/src/modules/administrador/`, todo bajo `/api/admin`, protegido por `permitirRoles('administrador')` en `administrador.routes.js`)

| CU | Servicio · función | Página |
|---|---|---|
| **CU-13 Gestionar solicitudes de cuenta** «include» Crear cliente y cuenta web | `solicitudesCuenta.service.js · aprobar()/rechazar()` → usa `clientes.service.js · crearCuentaCliente()` (transacción, contraseña ≥ 8 con letras y números: `shared/utils/password.js · erroresContrasena`) | `SolicitudesCuentaPage.jsx` |
| «extend» Registrar planta y ficha técnica | `plantas.service.js · crear()` (lista blanca `CAMPOS` con su tipo) | `PlantaFormPage.jsx` |
| **CU-14 Gestionar clientes y plantas** (HU-03) | `clientes.service.js` (`crear/actualizar/crearCuenta`), `plantas.service.js` (`listar/obtener/crear/actualizar`, `validarTraspaso`) , `suscripciones.service.js` | `ClientesPage.jsx`, `PlantasPage.jsx`, `PlantaDetallePage.jsx`, `components/SuscripcionPanel.jsx` |
| **CU-15 Gestionar trabajadores** (HU-15) | `trabajadores.service.js · crear/actualizar` — desactivar ⇒ órdenes abiertas quedan sin asignar + historial; cambiar clave cierra sesiones | `TrabajadoresPage.jsx` |
| **CU-16 Programar y asignar mantención** (HU-04, HU-17) | `mantenciones.service.js · crear()`, `asignar()`, `listar()` (filtros comuna/fechas/estado), `validarTrabajadorActivo()` + trigger BD `fn_validar_trabajador_mantencion` | `CalendarioPage.jsx` |
| **CU-17 Atender solicitudes de mantención** «extend» de CU-16 | `crear()` con `id_solicitud` (la pasa a `asignada`), `rechazarSolicitud()` | `SolicitudesAdminPage.jsx` |
| **CU-18 Consultar impagos** (HU-01) | `finanzas.service.js · impagos()` — agrupa cuotas `vencida` por suscripción | `ImpagosPage.jsx` |
| **CU-22 Registrar pago manual** «extend» de CU-18 (HU-02) | `finanzas.service.js · registrarPagoManual()` — `FOR UPDATE`, ya pagada → **409**, transferencia exige N° operación, monto = total de la cuota (sin abonos) | `ImpagosPage.jsx`, `components/ConfirmarPagoDialogo.jsx` |
| **CU-19 Listado mensual de pagos** (HU-06) | `finanzas.service.js · pagosDelMes()` + CSV en `finanzas.controller.js` (`;` y BOM) | `PagosMesPage.jsx` |
| **CU-20 Generar cuotas y procesar cargos** (HU-13) | `generarCuotas()` (idempotente, `ON CONFLICT DO NOTHING`), `procesarCargos()` (candado `pg_try_advisory_lock`, `intento_cargo`), automático diario en `pagos/cobroAutomatico.js` | `PagosMesPage.jsx`, `components/CobroAutomaticoPanel.jsx` |
| **CU-21 Administrar catálogo** (RNF-07) | `catalogo.service.js · crear/actualizar/listar` | `CatalogoPage.jsx` |

**Reglas de deuda** (`backend/src/modules/pagos/reglasDeuda.js`), se ejecutan al iniciar, cada hora y tras cada pago:
1. Cuota `pendiente` con vencimiento pasado → `vencida`.
2. Suscripción con alguna vencida → `con_deuda` (sigue activa). Sin vencidas → `al_dia`.
3. Deuda más antigua > **1 mes** (`interval '1 month'`) → `cancelada` por `morosidad`.

---

## 3. ⚠️ Diferencias entre el informe y el código actual (por si el profe compara)

| Informe U2 | Código real hoy |
|---|---|
| Suscripción `morosa` | Se llama **`con_deuda`** (migración `004`). |
| CU-12: el trabajador deja la orden **finalizada** | El trabajador la deja **`por_confirmar`** con fotos; el **cliente** confirma → `finalizada` (o reclama → `en_curso`). El admin puede cerrar sin cliente (`cerrarSinCliente`). |
| "14 tablas" | Hay más: `solicitud_suscripcion`, `solicitud_cambio_datos`, `mantencion_foto`, `aviso_correo`, `recuperacion_contrasena`, `intento_cargo`, `ejecucion_tarea`. |
| `GUIA_DEL_CODIGO.md` dice "no hay cron" y "no hay correo" | Ya existe cobro automático diario (`cobroAutomatico.js`) y correo (`notificaciones/correo.service.js`). |

| CU-09 «include» Aceptar condiciones | **Corregido**: ahora se muestran las condiciones y se exige la casilla «Acepto» (`cliente/components/AceptarCondiciones.jsx`). |

Si te preguntan: "el diseño evolucionó durante la implementación; el informe refleja la versión al 13-11". Los textos corregidos de la tabla de casos de uso y los diagramas en PlantUML están en `docs/CASOS_DE_USO_ACTUALIZADOS.md`.

---

## 4. Cambios en vivo probables — con la solución exacta

> Regla de oro: **si el cambio es una regla, se hace en el backend** (el frontend solo muestra). Si solo lo cambias en el frontend, alguien puede saltárselo llamando la API directo.

### A. Cambiar constantes de seguridad del login (CU-03)
`backend/src/modules/auth/auth.service.js` líneas 6-8:
```js
const DURACION_SESION = '8h';          // ej. '2h'
const MAX_INTENTOS = 5;                // ej. 3
const BLOQUEO_MS = 15 * 60 * 1000;     // ej. 30 * 60 * 1000 (30 min)
```

### B. Cambiar reglas de la contraseña (CU-13, CU-15)
`backend/src/shared/utils/password.js`:
```js
export const MINIMO_CONTRASENA = 8;    // ej. 10
// exigir además una mayúscula:
if (!/[A-Z]/.test(clave)) errores.push('Debe tener al menos una mayúscula');
```

### B2. Cambiar el texto o la versión de las condiciones (CU-09)
`frontend/src/modules/cliente/components/AceptarCondiciones.jsx`: el arreglo `clausulas` (texto) y `VERSION_CONDICIONES`. Si cambias el texto, sube la versión (ej. `'1.1'`): la base guarda qué versión aceptó cada cliente (`SELECT * FROM aceptacion_condiciones`).

### C. Cambiar cuántas fotos debe subir el técnico (CU-12)
Dos lugares (backend = regla, frontend = interfaz):
- `backend/src/shared/utils/fotos.js` → `export const MAX_FOTOS = 4;`
- `frontend/src/modules/trabajador/pages/OrdenPage.jsx` → `const MAX_FOTOS = 4;`

### D. Agregar/quitar una transición de estado de la orden (CU-11)
`backend/src/shared/utils/estadosOrden.js`. Ej.: permitir cancelar una orden `por_confirmar`:
```js
por_confirmar: ['finalizada', 'en_curso', 'cancelada'],
```
Luego correr `npm test --prefix backend` (hay `tests/estadosOrden.test.js`, puede que haya que ajustar la prueba).

### E. Cambiar el plazo de cancelación por morosidad (CU-18)
`backend/src/modules/pagos/reglasDeuda.js`, dentro de `aplicarReglasDeuda`:
```sql
AND c.fecha_vencimiento + interval '1 month' < CURRENT_DATE   -- ej. '2 months' o '60 days'
```

### F. Cambiar el rango del día de cobro (CU-14 / suscripción)
Está en **dos capas**:
- Backend `administrador/suscripciones.service.js`: `const esDiaCobro = (v) => ... v >= 1 && v <= 28;`
- BD `001_esquema.sql`: `CHECK (dia_cobro BETWEEN 1 AND 28)` → para cambiarlo hay que crear `database/schema/009_xxx.sql` con `ALTER TABLE suscripcion DROP CONSTRAINT ...; ADD CONSTRAINT ...` (no editar 001).
- Ojo: `make_date(..., s.dia_cobro)` en `generarCuotas` fallaría con día 31 en febrero → por eso es 28. **Buena respuesta para el profe.**

### G. Precio del plan / catálogo (CU-01, CU-21)
- Sin tocar código: Admin → **Catálogo** → editar precio (eso demuestra RNF-07 "precios son datos").
- Datos iniciales: `database/seeds/002_catalogo_e_historial.sql` (plan `15000`).
- Cuotas de las suscripciones de prueba: `database/seeds/001_datos_prueba.sql` (20000 / 18000).

### H. Validación nueva en un formulario del cliente (CU-07)
Ej. "el motivo de la solicitud debe tener mínimo 10 caracteres". `cliente/cliente.service.js · crearSolicitud`:
```js
if (texto.length < 10) throw new HttpError(400, 'Describe el motivo con al menos 10 caracteres');
```
El mensaje aparece solo en pantalla porque `Mensaje` muestra `error.message`.

### I. Cambiar cuántos pagos ve el cliente en su historial (CU-04)
`cliente/cliente.service.js · cuenta()` → `LIMIT 50`.

### J. Agregar una columna a una tabla de la interfaz
Ej. mostrar "Último acceso" en Trabajadores (CU-15). El backend **ya lo envía** (`SELECT_TRABAJADOR` incluye `ultimo_acceso`). En `TrabajadoresPage.jsx`:
```jsx
<th>Último acceso</th>                                   // en <thead>
<td data-label="Último acceso">
  {t.ultimo_acceso ? new Date(t.ultimo_acceso).toLocaleString('es-CL') : '—'}
</td>                                                    // en cada fila
```
(Siempre poner `data-label`: en móvil la tabla se convierte en tarjetas.)

Si el dato **no** viene del backend: agregarlo al `SELECT` del servicio correspondiente.

### K. Cambiar textos/colores de un estado
- Suscripción: `frontend/src/modules/administrador/components/EstadoSuscripcion.jsx` (`al_dia`, `con_deuda`, `cancelada`).
- Orden: `frontend/src/modules/trabajador/components/ordenUtils.jsx` (`por_confirmar: 'Esperando al cliente'`, etc.).
- Clases de color: `ok` (verde), `aviso` (amarillo), `alerta` (rojo), `neutro` (gris).

### L. Agregar un filtro al calendario (CU-16)
El backend `mantenciones.service.listar` ya acepta `id_comuna, desde, hasta, estado`. En `CalendarioPage.jsx` agregar el campo al estado `filtros` y un `<select>`; `adminService.listarMantenciones(filtros)` envía todo parámetro con valor.
Para un filtro **nuevo** (ej. por trabajador) agregar en el servicio:
```js
if (id_trabajador) agregar('m.id_trabajador = ?', id_trabajador);
```
y en `mantenciones.controller.js` pasar `req.query.id_trabajador`.

### M. Restringir quién puede hacer algo
En `*.routes.js`: `permitirRoles('administrador')` aplica a todo el router (`router.use(...)`). Para un endpoint puntual:
```js
router.get('/algo', autenticar, permitirRoles('administrador', 'trabajador'), controlador.algo);
```

### N. Nuevo dato en la ficha de la planta (ej. "marca de medidor")
1. `database/schema/009_medidor.sql`: `ALTER TABLE planta ADD COLUMN IF NOT EXISTS medidor VARCHAR(60);` → `npm run db:init --prefix backend`
2. `administrador/plantas.service.js` → agregar `medidor: 'texto_opcional'` en `CAMPOS` (con eso ya valida, inserta y actualiza; el `SELECT p.*` ya lo devuelve).
3. `PlantaFormPage.jsx` → input; `PlantaDetallePage.jsx` / `PlantaClientePage.jsx` → mostrarlo.

### O. Endpoint nuevo completo (si piden algo grande)
BD (si hace falta) → `xxx.service.js` (validar + SQL con `$1`) → `xxx.controller.js` (`parseId`, `res.json`) → línea en `xxx.routes.js` → línea en `frontend/.../services/xxxService.js` → página → `AppRoutes.jsx` + `MENU` en `Layout.jsx`.

---

## 5. Respuestas cortas para preguntas típicas

- **¿Cómo evitan que un cliente vea datos de otro?** Toda consulta del cliente filtra por `id_cliente` obtenido del token (`fichaCliente(req.usuario.id)`), nunca por un id enviado por el navegador. Lo ajeno da 404.
- **¿Cómo evitan doble pago?** Transacción + `SELECT ... FOR UPDATE` sobre la cuota; si ya está `pagada` → 409. En cobros automáticos además un candado `pg_try_advisory_lock` y la tabla `intento_cargo`.
- **¿Inyección SQL?** Consultas parametrizadas `$1, $2`; los nombres de columna dinámicos salen de listas blancas (`CAMPOS`).
- **¿Contraseñas?** scrypt con sal aleatoria (`password.js`), comparación `timingSafeEqual`.
- **¿Qué pasa si desactivo un trabajador?** Su token deja de valer al instante (middleware consulta `activo` en cada request) y sus órdenes abiertas quedan sin asignar.
- **¿Tarjetas?** Nunca se guarda el número: solo `token_pasarela` + `ultimos_4` (CHECK `^[0-9]{4}$`).
- **¿Qué garantiza la BD aunque la API falle?** Una suscripción vigente por planta (índice único parcial), una cuota por período (UNIQUE), CHECKs de estados/montos, trigger de trabajador activo, `ON DELETE RESTRICT`.
- **¿Por qué monolito modular?** Volumen chico; microservicios sería complejidad sin beneficio. Capas rutas → controlador → servicio → datos.

---

## 6. Plan de estudio para hoy (≈2 h)

1. (15 min) Levantar la app y recorrer cada rol con las cuentas de prueba siguiendo los CU del diagrama.
2. (20 min) Leer `trabajador.routes.js → trabajador.controller.js → trabajador.service.js` + `estadosOrden.js`. Es el patrón de todo.
3. (20 min) Leer `cliente.service.js` (CU-04 a CU-09).
4. (20 min) Leer `finanzas.service.js` + `reglasDeuda.js` (CU-18 a CU-22).
5. (30 min) **Practicar** 4-5 cambios de la sección 4 (A, C, H, J, D), ver el efecto en el navegador y deshacerlos con `git checkout -- .`
6. (15 min) Repasar la sección 5 en voz alta.
