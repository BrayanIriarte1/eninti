# Guía del código · ENINTI

Esta guía explica **cómo está construida la plataforma y por qué**, para que
cualquier integrante pueda leer, modificar y ampliar el código sin tener que
adivinar. Está pensada para leerse en orden la primera vez y usarse después como
consulta.

> Documentos relacionados: [GUIA_INICIO.md](GUIA_INICIO.md) (instalar y arrancar),
> [GUIA_OTRO_PC_Y_GITHUB.md](GUIA_OTRO_PC_Y_GITHUB.md) (Git),
> [MANUAL.md](MANUAL.md) (uso por perfil) y la documentación interactiva de la API
> en `/api/docs`.

## Contenido

1. [Visión general](#1-visión-general)
2. [Mapa del repositorio](#2-mapa-del-repositorio)
3. [Base de datos](#3-base-de-datos)
4. [Backend](#4-backend)
5. [Frontend](#5-frontend)
6. [Flujos de extremo a extremo](#6-flujos-de-extremo-a-extremo)
7. [Seguridad: qué se hace y dónde](#7-seguridad-qué-se-hace-y-dónde)
8. [Trazabilidad: historia de usuario → archivos](#8-trazabilidad-historia-de-usuario--archivos)
9. [Receta: cómo agregar una funcionalidad](#9-receta-cómo-agregar-una-funcionalidad)
10. [Límites conocidos y deuda técnica](#10-límites-conocidos-y-deuda-técnica)
11. [Glosario](#11-glosario)

### Cómo leer el código por primera vez

Un orden que funciona, de lo fundamental a lo particular:

1. `database/schema/001_esquema.sql`: el modelo de datos. Todo lo demás gira en torno a él.
2. `backend/src/app.js` y `backend/src/routes/index.js`: cómo arranca y se organiza la API.
3. **Un módulo completo de punta a punta**: `trabajador.routes.js` → `trabajador.controller.js` → `trabajador.service.js`. Es el más corto y muestra el patrón que repiten todos.
4. `frontend/src/main.jsx` → `routes/AppRoutes.jsx` → `shared/context/AuthContext.jsx` → una página (por ejemplo `trabajador/pages/OrdenPage.jsx`).

---

## 1. Visión general

ENINTI es una plataforma para gestionar **suscripciones de mantención de plantas
solares fotovoltaicas**. Tiene tres tipos de usuario, cada uno con su propia parte
de la aplicación:

| Perfil | Qué hace |
|---|---|
| **Cliente** | Consulta su deuda y pagos, ve la ficha de su planta, pide mantenciones, inscribe su tarjeta y cancela. |
| **Trabajador** | Ve su agenda de visitas, consulta la ficha técnica y registra lo que hizo en terreno. |
| **Administrador** | Gestiona clientes, plantas, suscripciones, trabajadores, calendario, impagos y pagos. |

### Arquitectura

Son **tres piezas** que deben estar funcionando a la vez:

```
   Navegador                    Servidor Node                 PostgreSQL
 ┌────────────┐   HTTP/JSON   ┌────────────────┐    SQL     ┌────────────┐
 │  React     │ ────────────► │  Express API   │ ─────────► │  base      │
 │  (Vite)    │ ◄──────────── │  puerto 3001   │ ◄───────── │  "eninti"  │
 │  puerto    │   /api/...    │                │            │  puerto    │
 │  5174      │               │  módulos:      │            │  5432      │
 └────────────┘               │  auth, cliente,│            └────────────┘
       ▲                      │  trabajador,   │
       │ en desarrollo, Vite  │  administrador,│
       └─ reenvía /api al ────│  pagos, público│
          puerto 3001         └────────────────┘
```

Decisiones de diseño que conviene tener presentes:

- **Monolito modular.** Una sola API y una sola base de datos, dividida en módulos por
  perfil. No hay microservicios: para este volumen sería complejidad sin beneficio.
- **El navegador nunca habla con la base de datos.** Toda regla de negocio vive en el
  backend; el frontend solo muestra y envía datos.
- **La seguridad se aplica en el backend, no en la interfaz.** Ocultar un botón no
  protege nada: cada endpoint vuelve a comprobar el rol y la propiedad del recurso.
- **Sin CORS en desarrollo**, porque Vite reenvía las llamadas `/api` al backend
  (`frontend/vite.config.js`). El navegador cree que habla con un solo servidor.

### Tecnologías

| Capa | Tecnología | Para qué |
|---|---|---|
| Frontend | React 19, React Router 7, Vite 8 | Interfaz de una sola página (SPA) |
| Backend | Node.js 22, Express 5 (módulos ES) | API REST |
| Base de datos | PostgreSQL + librería `pg` | Datos relacionales y transacciones |
| Sesión | `jsonwebtoken` (JWT) | Identificar al usuario en cada petición |
| Contraseñas | `scrypt` de `node:crypto` | Guardar contraseñas de forma segura |
| Documentación | `swagger-ui-express` + OpenAPI 3 | Documentación interactiva de la API |
| Pruebas | `node:test` (incluido en Node) | Pruebas unitarias |

El proyecto casi no usa librerías externas a propósito: el backend tiene 4
dependencias y el frontend 3.

Tamaño aproximado: **~2.500 líneas de backend, ~2.700 de frontend y ~350 de SQL**.

---

## 2. Mapa del repositorio

```
eninti/
├── package.json              Scripts de la raíz: npm run dev / install:all
├── README.md                 Entrada al proyecto
│
├── database/
│   ├── schema/               Tablas (001, 002). Se ejecutan en orden alfabético
│   │   ├── 001_esquema.sql     11 tablas base
│   │   └── 002_operacion_y_pagos.sql   historial, catálogo y columnas nuevas
│   └── seeds/                Datos de prueba ficticios (se cargan solo si la base está vacía)
│
├── backend/
│   ├── .env.example          Plantilla de configuración (el .env real NO se sube)
│   ├── scripts/db-init.js    Ejecuta schema/ y seeds/ contra la base
│   ├── tests/                Pruebas unitarias (9)
│   └── src/
│       ├── server.js           Arranque: abre el puerto
│       ├── app.js              Arma Express: middlewares, rutas, errores
│       ├── routes/index.js     Monta cada módulo bajo su prefijo (/auth, /admin...)
│       ├── config/db.js        Conexión a PostgreSQL
│       ├── docs/openapi.js     Especificación de la API (alimenta /api/docs)
│       ├── shared/
│       │   ├── middlewares/    auth.js (sesión y roles), errorHandler.js
│       │   └── utils/          httpError, password, estadosOrden
│       └── modules/
│           ├── auth/           Login, registro, perfil
│           ├── cliente/        Todo lo que ve el cliente
│           ├── trabajador/     Agenda y órdenes
│           ├── administrador/  Clientes, plantas, finanzas, calendario...
│           ├── pagos/          Pasarela de pago (simulada y Flow)
│           └── publico/        Cotizador sin sesión
│
└── frontend/
    ├── vite.config.js        Puerto 5174 y reenvío de /api al 3001
    └── src/
        ├── main.jsx            Arranque de React
        ├── routes/AppRoutes.jsx   Todas las rutas y qué rol puede entrar
        ├── styles/global.css   Todos los estilos
        ├── shared/             Lo que usan todos los módulos
        │   ├── context/AuthContext.jsx   Sesión del usuario
        │   ├── components/     RutaProtegida, Mensaje
        │   ├── layouts/Layout.jsx        Barra superior y menú por rol
        │   └── utils/          api.js (cliente HTTP), formato.js
        └── modules/            auth, cliente, trabajador, administrador, publico
            └── <módulo>/ pages/ components/ services/
```

**Convención de nombres.** En el backend, cada módulo se divide en **rutas**
(qué URL existe), **controlador** (traduce HTTP a llamadas) y **servicio** (la lógica
y el SQL). En el frontend, cada módulo se divide en **pages** (pantallas),
**components** (piezas reutilizables) y **services** (llamadas a la API).

---

## 3. Base de datos

### 3.1 Las 13 tablas

| Tabla | Qué guarda | Notas importantes |
|---|---|---|
| `usuario` | Cuentas de acceso | `rol` es `cliente`, `trabajador` o `administrador`. `password_hash` nunca es la contraseña. |
| `comuna` | Comunas donde opera ENINTI | Catálogo para el calendario por comuna. |
| `cliente` | Ficha administrativa del suscriptor | `id_usuario` queda **vacío** hasta que el cliente crea su cuenta web. Así el administrador puede cargar clientes antes de que se registren. |
| `planta` | Instalación fotovoltaica y su ficha técnica | `baterias` es `NULL` si no tiene. Es un dato de seguridad para el técnico. |
| `suscripcion` | Plan mensual de una planta | Guarda la cuota y las mantenciones anuales *al momento de contratar*. |
| `aceptacion_condiciones` | Constancia de que el cliente aceptó las condiciones | Fecha, versión e IP (Ley 21.719). |
| `medio_pago` | Tarjeta inscrita en la pasarela | **Solo token y últimos 4 dígitos.** Nunca el número de tarjeta. |
| `cuota` | Cobro de un mes de una suscripción | Una por suscripción y período (`YYYY-MM`). |
| `pago` | Pago de una cuota | Por pasarela o registrado a mano; guarda quién lo registró. |
| `solicitud_mantencion` | Petición del cliente | Estados `pendiente`, `asignada`, `rechazada`, `cerrada`. |
| `mantencion` | Visita programada o ejecutada | Tiene un trabajador, un estado y las actividades realizadas. |
| `mantencion_historial` | Cada cambio de estado de una mantención | Quién, cuándo, de qué estado a cuál. Auditoría. |
| `catalogo_servicio` | Planes y servicios con precio | Alimenta el cotizador público. Los precios son datos, no código. |

### 3.2 Cómo se relacionan

```
 comuna ──┬──< cliente >── 0..1 ── usuario (cliente)
          │       │
          └──< planta >──────────────┐
                  │                  │
                  ├──< suscripcion   ├──< solicitud_mantencion ──0..1── mantencion
                  │       │          │
                  │       ├──< cuota ──< pago >── 0..1 ── medio_pago >── cliente
                  │       │                │
                  │       └──< aceptacion_condiciones     └─ registrado_por ── usuario (admin)
                  │
                  └──< mantencion >── trabajador (usuario) ;  mantencion ──< mantencion_historial >── usuario
```

`──<` significa "uno a muchos". Lectura práctica: **un cliente tiene muchas plantas;
cada planta tiene sus suscripciones, mantenciones y solicitudes; cada suscripción
genera una cuota por mes; cada cuota se paga con un pago.**

### 3.3 Reglas que garantiza la propia base de datos

Estas reglas se cumplen **aunque la API tuviera un error**, porque las exige
PostgreSQL:

| Regla | Cómo | Para qué |
|---|---|---|
| Una planta tiene **una sola** suscripción vigente | Índice único parcial `uq_suscripcion_vigente` (`WHERE estado <> 'cancelada'`) | Evitar cobrar dos veces |
| Una cuota por suscripción y período | `UNIQUE (id_suscripcion, periodo)` | Que generar cuotas dos veces no duplique |
| Cancelada ⇔ tiene fecha de cancelación | `CHECK ((estado='cancelada') = (fecha_cancelacion IS NOT NULL))` | Coherencia |
| Finalizada ⇒ tiene fecha de ejecución | `CHECK (estado <> 'finalizada' OR fecha_ejecucion IS NOT NULL)` | Trazabilidad |
| Pago por pasarela ⇔ tiene medio de pago | `CHECK ((origen='pasarela') = (id_medio_pago IS NOT NULL))` | Coherencia |
| Pago manual ⇒ sabe quién lo registró | `CHECK (origen='pasarela' OR registrado_por IS NOT NULL)` | Auditoría (RNF-08) |
| Montos positivos, día de cobro entre 1 y 28, período `YYYY-MM` | `CHECK` en cada columna | Datos válidos |
| No se borra en cascada | `ON DELETE RESTRICT` en todas las claves foráneas | Evitar perder historial |

**Lo que la base NO garantiza** (lo valida el backend): que quien se asigna a una
mantención sea un *trabajador activo*, y que los cambios de estado sigan la secuencia
correcta. La especificación original proponía un *trigger* para lo primero; se decidió
validarlo en la API (`mantenciones.service.js`, `validarTrabajadorActivo`).

### 3.4 Migraciones y datos de prueba

- Los archivos de `database/schema/` se ejecutan **en orden alfabético** y usan
  `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, así que **repetirlos es
  seguro**.
- Para cambiar el esquema, **no edites** `001_` ni `002_`: crea `003_descripcion.sql`.
- Los *seeds* (`database/seeds/`) comienzan con una guarda `IF EXISTS (SELECT 1 FROM ...)
  THEN RETURN`, por eso solo cargan datos en una base vacía.
- `npm run db:init --prefix backend` (`backend/scripts/db-init.js`) ejecuta primero
  `schema/` y luego `seeds/`, cada archivo en orden.

### 3.5 Los datos de prueba

| Tema | Detalle |
|---|---|
| Usuarios | 1 administrador, 1 trabajador, 2 clientes con cuenta (ver credenciales en el README) |
| Clientes | María, Luis y **Carmen, que no tiene cuenta web** (sirve para probar el registro) |
| Plantas | 5, repartidas en distintas comunas; algunas con baterías |
| Suscripciones | 4. La planta de Quillagua queda **sin suscripción** para probar el alta |
| Cuotas | Agosto a octubre de 2026. Luis debe septiembre y octubre (aparece en impagos) |
| Contraseñas | Se guardan con scrypt; las contraseñas en claro están solo en el comentario del seed |

---

## 4. Backend

### 4.1 Arranque

`server.js` solo lee el puerto y llama a `app.listen`. Todo lo demás está en
`app.js`, separado a propósito para poder importar la aplicación en pruebas sin abrir
un puerto.

El **orden de los middlewares en `app.js` importa**; Express los recorre de arriba a
abajo:

```
1. express.json()            Convierte el cuerpo JSON en req.body
2. /api/docs, /api/docs.json Documentación Swagger (sin autenticación)
3. /api  → routes/index.js   Las rutas reales de la API
4. 404                       Si ninguna ruta respondió
5. errorHandler              Captura cualquier error y lo convierte en JSON
```

Variables de entorno (`backend/.env`, leídas con `node --env-file`):

| Variable | Uso |
|---|---|
| `PORT` | Puerto de la API (3001) |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_SECRET` | Clave para firmar las sesiones |
| `AUTH_BYPASS` | Si es `true`, salta el login y entra como administrador. **Solo para depurar.** |
| `FLOW_MODE` | `simulado` (por defecto) o `sandbox` |
| `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL` | Credenciales de Flow (solo modo `sandbox`) |
| `APP_URL` | URL pública del frontend, para el retorno de la pasarela real |

### 4.2 El patrón de tres capas

Todos los módulos siguen el mismo esquema:

```
  RUTAS            CONTROLADOR              SERVICIO               BASE DE DATOS
  (qué URL)   →    (HTTP ⇄ función)    →    (reglas + SQL)    →    PostgreSQL
  *.routes.js      *.controller.js          *.service.js           config/db.js
```

| Capa | Responsabilidad | Lo que NO debe hacer |
|---|---|---|
| **Rutas** | Declarar URL, método y qué middleware de seguridad aplica | Lógica |
| **Controlador** | Leer `req`, validar el formato del id, llamar al servicio, responder con `res.json` | SQL o reglas de negocio |
| **Servicio** | Validar datos, aplicar reglas, ejecutar SQL, lanzar errores | Conocer `req`/`res` |

Ejemplo real, el cambio de estado de una orden:

```js
// trabajador.routes.js       → declara la URL y la protege
router.use(autenticar, permitirRoles('trabajador'));
router.post('/ordenes/:id/estado', trabajador.cambiarEstado);

// trabajador.controller.js   → traduce HTTP a una llamada
export async function cambiarEstado(req, res) {
  res.json(await trabajador.cambiarEstado(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

// trabajador.service.js      → valida, abre transacción, cambia estado, guarda historial
export async function cambiarEstado(id, idTrabajador, { estado, actividades, ... }) { ... }
```

Observa que el servicio recibe `req.usuario.id` (viene del token), **no** un id
enviado por el navegador. Así un trabajador no puede actuar como otro.

**Errores en funciones `async`.** Express 5 captura solo los errores de funciones
asíncronas y los manda al `errorHandler`. Por eso los servicios simplemente hacen
`throw new HttpError(...)` y no hay `try/catch` ni `next(err)` en los controladores.

### 4.3 Piezas compartidas (`shared/` y `config/`)

**`config/db.js`: conexión.** Crea un *pool* de conexiones a PostgreSQL y exporta
`query(texto, params)`. Además registra dos conversiones de tipos:

- Las columnas `DATE` llegan como texto `'YYYY-MM-DD'` (y no como objeto `Date`),
  para evitar desfases por zona horaria.
- Las columnas `NUMERIC` (como `potencia_kw`) llegan como número JavaScript.

**`utils/httpError.js`.** Clase `HttpError(status, mensaje, detalles)`. Lanzarla desde
cualquier servicio produce una respuesta con ese código HTTP.

**`middlewares/errorHandler.js`.** Convierte cualquier error en `{ "error": "...",
"detalles": ... }`:

| Origen | Resultado |
|---|---|
| `HttpError` | Su propio código y mensaje |
| Error de PostgreSQL conocido (`23505` repetido, `23503` referencia, `23514` regla, `22P02` formato, `22007`/`22008` fecha) | 409 o 400 con un mensaje legible |
| JSON mal formado | 400 |
| Cualquier otra cosa | **500** y el detalle va solo a la consola, nunca al cliente |

**`middlewares/auth.js`: sesión y roles.** Dos funciones que se usan en las rutas:

- `autenticar`: exige `Authorization: Bearer <token>`, verifica la firma del JWT y
  luego **consulta la base** para confirmar que el usuario sigue existiendo, está
  activo y conserva el mismo rol. Esa consulta es lo que hace que desactivar a un
  trabajador **invalide su token al instante**, aunque no haya expirado. Deja
  `req.usuario = { id, rol, nombre }`.
- `permitirRoles('administrador', ...)`: rechaza con 403 si el rol no está permitido.

**`utils/password.js`.** `hashPassword` genera una sal aleatoria de 16 bytes y
guarda `sal:hash` (scrypt, 64 bytes). `verificarPassword` compara con
`timingSafeEqual` para que el tiempo de respuesta no filtre información.

**`utils/estadosOrden.js`.** La máquina de estados de una mantención, en una tabla:

```
pendiente  ──►  en_curso  ──►  finalizada      (final)
    │               │
    └───────────────┴──►  cancelada             (final)
```

`puedeTransitar(desde, hacia)` responde si un cambio es válido. La usan el módulo
Trabajador y el Administrador, y está cubierta por pruebas unitarias.

### 4.4 Módulos

#### `auth/`: acceso (HU-07)

| Función | Qué hace |
|---|---|
| `login` | Busca al usuario por correo, verifica la contraseña y devuelve un JWT de 8 horas. El error es **siempre el mismo** ("Credenciales incorrectas o cuenta inactiva") sin revelar qué dato falló. |
| Bloqueo de intentos | Un `Map` en memoria cuenta fallos por correo. **5 fallos → bloqueo de 15 minutos** (error 429). |
| `registrarCliente` | Valida formato de RUT, correo y contraseña (≥ 8). El RUT debe existir en `cliente` y la ficha no debe tener cuenta. En **una transacción** crea el `usuario` y enlaza `cliente.id_usuario`. |
| `perfil` | Datos del usuario autenticado (`/auth/me`). |

El JWT contiene solo `{ id, rol }`. Todo lo demás se consulta en la base en cada
petición.

#### `cliente/`: lo que ve el cliente (HU-08 a HU-13)

El patrón clave está al inicio de `cliente.service.js`:

```js
async function fichaCliente(idUsuario) { ... }   // del usuario autenticado → su ficha de cliente
```

**Toda** función del módulo parte de ahí: filtra por el cliente dueño del token y
nunca por un id que mande el navegador. Un cliente que pide la planta de otro recibe
**404** (no 403), para no confirmar que existe.

| Función | HU | Qué hace |
|---|---|---|
| `misPlantas`, `obtenerPlanta` | 10 | Plantas con su suscripción vigente |
| `cuenta` | 8 | Resumen: suscripciones con meses pagados y deuda, cuotas por pagar, últimos 50 pagos, medio de pago |
| `mantenciones` | 9 | Por planta: última finalizada y próxima abierta (subconsultas con `LIMIT 1`) |
| `crearSolicitud`, `misSolicitudes` | 11 | Crea una solicitud `pendiente` (la planta debe ser suya) |
| `cancelarSuscripcion` | 12 | `UPDATE ... FROM planta` que solo afecta si la suscripción es del cliente y no está cancelada |
| `iniciarInscripcion` | 13 | En una transacción guarda la aceptación de condiciones (fecha, versión, IP) y pide a la pasarela la URL de inscripción |

#### `trabajador/`: órdenes en terreno (HU-05, HU-14, HU-16)

| Función | Qué hace |
|---|---|
| `agenda` | Solo las órdenes con `id_trabajador` = el del token. Abiertas por fecha ascendente, o cerradas con `?historicas=true`. |
| `obtenerOrden` | Ficha de la planta, datos del cliente, motivo de la solicitud e historial de estados. Una orden ajena responde 404. |
| `cambiarEstado` | Ver el flujo detallado en [6.2](#62-un-trabajador-finaliza-una-orden). |

#### `administrador/`: el módulo más grande

Está dividido en un servicio por tema, todos montados bajo `/api/admin`
y todos detrás de `autenticar` + `permitirRoles('administrador')`:

| Servicio | Responsabilidad |
|---|---|
| `clientes.service.js` | Alta y edición de la ficha de cliente; listado con cantidad de plantas y si tiene cuenta |
| `plantas.service.js` | CRUD de plantas y ficha técnica. Usa una lista blanca de campos (`CAMPOS`) con su tipo, que valida y también define qué columnas pueden escribirse |
| `suscripciones.service.js` | Alta de la suscripción, cambio de cuota, día de cobro y estado. Cancelar es definitivo |
| `trabajadores.service.js` | Alta, edición, restablecer clave, desactivar/reactivar |
| `mantenciones.service.js` | Calendario con filtros, programar, asignar, cancelar; bandeja de solicitudes |
| `finanzas.service.js` | Impagos, pagos manuales, listado mensual, motor de cuotas y cobro recurrente |
| `catalogo.service.js` | Administración de planes y servicios |

**Cómo se construyen los filtros dinámicos.** `plantas.service.listar` y
`mantenciones.service.listar` arman el `WHERE` según los filtros recibidos, agregando
cada valor a un arreglo `params` y usando marcadores `$1`, `$2`... Los **valores
nunca se concatenan en el SQL**, lo que evita la inyección SQL.

**`finanzas.service.js`: el corazón del dinero.** Conviene entender sus piezas:

- `impagos`: agrupa las cuotas `vencida` por suscripción, con meses adeudados, monto
  total y desde cuándo, ordenado por antigüedad.
- `registrarPagoManual`: dentro de una transacción bloquea la cuota con
  `SELECT ... FOR UPDATE`, rechaza (409) si ya está pagada, inserta el pago con
  `registrado_por`, marca la cuota `pagada` y recalcula el estado de la suscripción.
- `actualizarEstadoSuscripcion`: la suscripción queda `morosa` si tiene **alguna**
  cuota vencida y `al_dia` si no. Se invoca después de cada pago.
- `generarCuotas(periodo)`: crea una cuota por cada suscripción no cancelada con un
  único `INSERT ... SELECT ... ON CONFLICT DO NOTHING`. Es **idempotente**: ejecutarla
  dos veces no duplica. En la misma transacción marca `vencida` toda cuota `pendiente`
  cuya fecha ya pasó y recalcula los estados.
- `procesarCargos`: recorre las cuotas abiertas de clientes con medio de pago activo,
  pide el cargo a la pasarela y, si se aprueba, registra el pago en una transacción.
  Un rechazo **no** crea pago ni cambia la cuota.
- `pagosDelMes`: pagos de un mes `YYYY-MM`. El controlador puede devolverlos como CSV
  (separador `;` y marca BOM para que Excel respete las tildes).

#### `pagos/`: la pasarela (HU-13)

Dos archivos con responsabilidades distintas:

- **`pasarela.service.js`: el adaptador.** Es el único lugar que conoce a la pasarela.
  Según `FLOW_MODE` hace una de dos cosas:
  - `simulado` (por defecto): no sale a Internet. La inscripción emite un **JWT de 30
    minutos** que viaja hasta el formulario simulado. El cobro se aprueba siempre,
    salvo que los últimos 4 dígitos sean `0000`, que fuerza un rechazo.
  - `sandbox`: llama a la API de Flow, firmando los parámetros con HMAC-SHA256.
    **Esta rama está escrita pero nunca se ejecutó** (faltan credenciales).
- **`pagos.service.js`: la confirmación.** `confirmarInscripcionSimulada` valida el
  token y registra el medio de pago. Es **idempotente**: el token de la pasarela se
  deriva del `nonce` del JWT, y si ya existe un `medio_pago` con ese token se devuelve
  el mismo en lugar de duplicar. Al aprobar una tarjeta nueva, la anterior pasa a
  `inactivo`.

Separar el adaptador permite cambiar la pasarela sin tocar el resto del sistema.

#### `publico/`

Un solo endpoint sin autenticación: `GET /api/publico/catalogo`, que alimenta el
cotizador.

### 4.5 Transacciones y concurrencia

Cualquier operación que toque **más de una tabla** o que deba ser todo-o-nada usa este
patrón repetido:

```js
const conexion = await pool.connect();
try {
  await conexion.query('BEGIN');
  // ... varias consultas con "conexion", no con "query" ...
  await conexion.query('COMMIT');
} catch (err) {
  await conexion.query('ROLLBACK');
  throw err;
} finally {
  conexion.release();   // devolver la conexión al pool: SIEMPRE
}
```

- Se usa en: registro de cliente, cambio de estado de orden, programar mantención,
  pago manual, generar cuotas, cargos, inscripción de medio de pago.
- `SELECT ... FOR UPDATE` bloquea la fila mientras dura la transacción: si dos
  personas intentan pagar la misma cuota o cambiar el mismo estado a la vez, la
  segunda espera y luego ve el resultado de la primera.
- **`conexion.release()` en `finally` es obligatorio.** Olvidarlo agota el pool y la
  API se queda colgada.

### 4.6 Documentación de la API

`docs/openapi.js` describe los 46 endpoints en formato OpenAPI 3 y `app.js` la sirve
con Swagger UI en `/api/docs`. **Se mantiene a mano**: si agregas o cambias un
endpoint, actualiza su entrada. Para comprobar que sigue siendo válida, descarga
`/api/docs.json` a un archivo y ejecuta `npx @apidevtools/swagger-cli validate archivo.json`.

### 4.7 Pruebas

Hay 9 pruebas unitarias en `backend/tests/` (`npm test --prefix backend`):

| Archivo | Cubre |
|---|---|
| `estadosOrden.test.js` | Las transiciones válidas e inválidas de una orden |
| `password.test.js` | Formato del hash, verificación, sal aleatoria, hashes malformados |

No necesitan base de datos. **No hay pruebas automatizadas de los endpoints**: se
verificaron manualmente con una batería de casos que no quedó versionada (ver
[10](#10-límites-conocidos-y-deuda-técnica)).

---

## 5. Frontend

### 5.1 Arranque y estructura

```
main.jsx
 └─ <BrowserRouter>                 habilita las rutas
     └─ <AuthProvider>              carga y comparte la sesión
         └─ <AppRoutes>             decide qué pantalla mostrar según la URL
```

### 5.2 Sesión: `AuthContext`

`shared/context/AuthContext.jsx` guarda quién está conectado y lo comparte con toda la
aplicación mediante el hook `useAuth()`:

```js
const { usuario, cargando, login, registro, cerrarSesion } = useAuth();
```

- Al cargar la aplicación, si hay un token guardado, llama a `GET /auth/me` para
  recuperar el perfil. Si el token venció, lo borra. Mientras tanto `cargando` es
  `true`, para no mostrar el login por un instante a quien ya tenía sesión.
- `login` y `registro` guardan el token y el usuario.
- `inicioPorRol(rol)` devuelve la pantalla de inicio de cada perfil.

El token se guarda en `localStorage` con la clave `eninti_token`
(`shared/utils/api.js`).

### 5.3 Rutas y protección: `AppRoutes` + `RutaProtegida`

`routes/AppRoutes.jsx` es el **mapa de navegación**. Agrupa las pantallas por perfil
y cada grupo está envuelto en `RutaProtegida`:

```jsx
<Route element={<RutaProtegida roles={['administrador']} />}>
  <Route path="/admin" element={<Layout />}>
    <Route index element={<InicioAdminPage />} />
    <Route path="plantas" element={<PlantasPage />} />
    ...
```

`RutaProtegida` decide: sin sesión → `/login`; con sesión pero rol no permitido →
al inicio de su propio rol; correcto → deja pasar (`<Outlet />`).

> **Importante:** esto es comodidad, no seguridad. Quien manipule el navegador podría
> ver una pantalla que no le corresponde, pero **no obtendría datos**, porque cada
> endpoint del backend vuelve a verificar el rol (sección 7).

| Zona | Rutas |
|---|---|
| Públicas | `/login`, `/registro`, `/cotizador`, `/pasarela-simulada` |
| Administrador (`/admin/...`) | inicio, `plantas`, `plantas/nueva`, `plantas/:id`, `plantas/:id/editar`, `clientes`, `trabajadores`, `calendario`, `solicitudes`, `impagos`, `pagos`, `catalogo` |
| Trabajador (`/trabajador/...`) | `agenda`, `ordenes/:id` |
| Cliente (`/cliente/...`) | `cuenta`, `plantas`, `plantas/:id`, `mantenciones`, `solicitudes` |

`shared/layouts/Layout.jsx` es el marco común: barra superior, menú (distinto según el
rol, definido en la constante `MENU`), nombre del usuario y botón **Salir**.

### 5.4 Comunicación con la API

**`shared/utils/api.js`**: una sola función `api(ruta, { method, body })` que:

1. Agrega `Authorization: Bearer <token>` si hay sesión.
2. Hace `fetch` a `/api<ruta>`.
3. Si la respuesta es **401 con sesión activa** (token vencido o cuenta desactivada),
   borra el token y redirige a `/login`.
4. Si no es exitosa, lanza un `Error` con `message`, `detalles` y `status` copiados de
   la respuesta del backend.

**Servicios por módulo** (`modules/*/services/*.js`): un archivo con una línea por
endpoint. Las páginas no llaman a `fetch` directamente, siempre pasan por aquí:

```js
export const cambiarEstado = (id, datos) =>
  api(`/trabajador/ordenes/${id}/estado`, { method: 'POST', body: datos });
```

Así, si una URL cambia, se corrige en un único lugar.

### 5.5 El patrón de una página

Casi todas las pantallas siguen la misma estructura. Por ejemplo, `AgendaPage`:

```jsx
const [ordenes, setOrdenes] = useState([]);     // datos
const [error, setError]     = useState(null);   // error de la API
const [cargando, setCargando] = useState(true); // estado de carga

useEffect(() => {                                // pedir datos al montar
  miAgenda().then(setOrdenes).catch(setError).finally(() => setCargando(false));
}, []);

return (
  <section>
    <Mensaje error={error} />                    // muestra el error si lo hay
    {cargando && <p>Cargando…</p>}
    ...
```

Piezas que se repiten:

- **`Mensaje`** (`shared/components`): muestra el error de la API y su lista de
  `detalles` de validación, con `role="alert"` para lectores de pantalla.
- **Formularios controlados**: cada campo es un `<input value={...} onChange={...}>`
  enlazado al estado. Al fallar un guardado, el estado se conserva y **no se pierde lo
  escrito** (HU-03).
- **Recargar tras escribir**: después de una acción exitosa, la página vuelve a pedir
  los datos (`await cargar()`) en vez de intentar parchear el estado a mano.
- **`window.confirm`** antes de acciones destructivas (cancelar, desactivar).

### 5.6 Pantallas por módulo

| Módulo | Pantalla | Qué hace |
|---|---|---|
| **auth** | `LoginPage`, `RegistroPage` | Entrar y crear cuenta de cliente |
| **cliente** | `CuentaPage` | Deuda, suscripciones, cuotas por pagar, historial; inscribir medio de pago; cancelar |
| | `MisPlantasPage`, `PlantaClientePage` | Listado y ficha técnica |
| | `MantencionesClientePage` | Última y próxima mantención por planta |
| | `SolicitudesClientePage` | Pedir una mantención y ver sus estados |
| **trabajador** | `AgendaPage` | Tarjetas de visitas con enlace al mapa; alterna pendientes e historial |
| | `OrdenPage` | Ficha técnica, iniciar/finalizar, historial. Avisa si la planta tiene baterías |
| | `components/ordenUtils.jsx` | `enlaceMapa` (coordenadas o dirección) y `EtiquetaOrden` |
| **administrador** | `InicioAdminPage` | Indicadores: morosos, solicitudes pendientes, mantenciones sin asignar |
| | `PlantasPage`, `PlantaFormPage`, `PlantaDetallePage` | Plantas, ficha técnica y panel de suscripción (`SuscripcionPanel`) |
| | `ClientesPage`, `TrabajadoresPage` | Altas, ediciones y activar/desactivar |
| | `CalendarioPage` | Mantenciones agrupadas por comuna; asignar y cancelar |
| | `SolicitudesAdminPage` | Programar o rechazar solicitudes |
| | `ImpagosPage` | Morosos, contacto por WhatsApp o llamada, pago manual por cuota |
| | `PagosMesPage` | Listado mensual, CSV, generar cuotas y procesar cargos |
| | `CatalogoPage` | Administrar el catálogo del cotizador |
| **publico** | `CotizadorPage` | Planes y servicios sin iniciar sesión |
| | `PasarelaSimuladaPage` | Formulario de inscripción de tarjeta de la demostración |

### 5.7 Estilos

Todo está en `styles/global.css`, sin librerías de estilos. Se organiza así:

- **Variables CSS** al inicio (`--color-primario`, `--color-alerta-texto`, `--radio`,
  etc.). Para cambiar la paleta basta tocar ahí.
- **Accesibilidad**: texto base de 16 px, colores elegidos para buen contraste, foco
  visible (`outline` azul) en todos los controles.
- **Responsive**: las grillas usan `repeat(auto-fit, minmax(...))`, y a menos de 700
  px **las tablas se convierten en tarjetas** (cada celda muestra su `data-label`).
  Por eso toda `<td>` lleva `data-label="..."`.

Clases que más se reutilizan:

| Clase | Uso |
|---|---|
| `.tarjeta` | Caja blanca con borde |
| `.columnas` | Grilla de tarjetas que se adapta al ancho |
| `.tabla` | Tabla que se vuelve tarjetas en móvil |
| `.ficha` | Lista de pares *etiqueta / valor* (`<dl>`) |
| `.etiqueta` + `.ok` / `.alerta` / `.neutro` | Insignia de estado |
| `.boton` + `.secundario` / `.peligro` | Botones |
| `.formulario`, `.formulario-simple`, `.filtros`, `.fila`, `.acciones` | Distribución de formularios |
| `.tira` | Indicador grande (KPI) del panel |
| `.acceso`, `.acceso-tarjeta` | Pantallas de login, registro y pasarela |

---

## 6. Flujos de extremo a extremo

### 6.1 Inicio de sesión

```
LoginPage                 api.js                   Backend                         Base de datos
   │ login(email, clave)     │                        │                                  │
   │ ───────────────────────►│ POST /api/auth/login   │                                  │
   │                         │ ──────────────────────►│ ¿correo bloqueado? (Map)         │
   │                         │                        │ SELECT usuario por correo ──────►│
   │                         │                        │ scrypt: verificar contraseña     │
   │                         │                        │ firma JWT { id, rol } · 8 h      │
   │                         │ ◄──────────────────────│ { token, usuario }               │
   │ guardarToken (localStorage)                      │                                  │
   │ navigate(inicioPorRol(rol))                      │                                  │
```

En cada petición posterior, `api.js` adjunta el token y `autenticar` lo verifica y
consulta la base.

### 6.2 Un trabajador finaliza una orden

1. En `OrdenPage` el trabajador escribe las actividades y pulsa **Finalizar orden**.
2. La página llama `cambiarEstado(id, { estado: 'finalizada', actividades, ... })`.
3. `POST /api/trabajador/ordenes/:id/estado` pasa por `autenticar` (¿token válido y
   usuario activo?) y `permitirRoles('trabajador')`.
4. `trabajador.service.cambiarEstado`:
   - Rechaza con **400** si el estado no es `en_curso`/`finalizada`, o si finaliza
     **sin actividades**.
   - Abre una transacción y lee la orden con `FOR UPDATE`, **filtrando por
     `id_trabajador` = el del token** (si es ajena, 404).
   - Verifica con `puedeTransitar` que el salto sea válido; si no, **409**.
   - Actualiza la mantención (fecha de ejecución, actividades, observaciones).
   - Inserta una fila en `mantencion_historial` (estado anterior y nuevo, quién, cuándo).
   - `COMMIT` y devuelve la orden con su historial.
5. La página recarga la orden y muestra el nuevo estado. El **cliente** verá la visita
   en "Mantenciones" y el **administrador** en el calendario.

### 6.3 Inscribir una tarjeta y cobrar (modo simulado)

```
CLIENTE                                          BACKEND
 CuentaPage "Inscribir medio de pago"
   └─► POST /cliente/suscripciones/:id/inscripcion
                                       ├─ guarda aceptacion_condiciones (fecha, versión, IP)
                                       ├─ pasarela.iniciarInscripcion → JWT de 30 min
                                       └─ responde { url_pasarela: "/pasarela-simulada?token=..." }
 navigate(url_pasarela)
 PasarelaSimuladaPage: elige marca y últimos 4
   └─► POST /pagos/simulada/confirmar { token, resultado, marca, ultimos_4 }
                                       ├─ valida el token (¿expirado? ¿alterado?)
                                       ├─ ¿ya existe un medio_pago con ese token? → devuelve el mismo
                                       └─ INSERT medio_pago (token_pasarela, ultimos_4) · desactiva el anterior
 vuelve a /cliente/cuenta

ADMINISTRADOR (después)
 PagosMesPage "Procesar cargos recurrentes"
   └─► POST /admin/finanzas/procesar-cargos
                                       ├─ por cada cuota abierta de un cliente con tarjeta activa:
                                       │    pasarela.cobrar → aprobado (rechaza si ultimos_4 = 0000)
                                       └─ si aprobado: cuota → pagada · INSERT pago (origen "pasarela")
```

### 6.4 El ciclo mensual del dinero

```
 (admin) Generar cuotas del período
        │  una cuota "pendiente" por suscripción · las atrasadas pasan a "vencida"
        ▼
 Cuota PENDIENTE ──(pasa la fecha de vencimiento y se vuelve a ejecutar "generar")──► VENCIDA
        │                                                                              │
        ├── pago manual (admin) ──────────────┐                                        │
        └── cargo en pasarela ────────────────┼──────────────────────────────────────►─┘
                                              ▼
                                           PAGADA  → la suscripción vuelve a "al_dia"
                                                      si ya no quedan cuotas vencidas
```

**Punto clave:** nada en el sistema marca las cuotas como vencidas **por sí solo con
el paso del tiempo**. Ocurre cuando el administrador ejecuta *Generar cuotas*. No hay
tareas programadas (ver sección 10).

### 6.5 Registro de un cliente

1. ENINTI crea la ficha en **Administrador → Clientes** (con su RUT). Esa ficha no
   tiene `id_usuario`.
2. El cliente entra a `/registro` y envía RUT, correo y contraseña.
3. El backend comprueba que el RUT exista y no tenga cuenta, y en **una transacción**
   crea el `usuario` y enlaza `cliente.id_usuario`.
4. Desde ese momento el cliente solo ve datos filtrados por su `id_usuario`.

---

## 7. Seguridad: qué se hace y dónde

| Control | Dónde está | Cómo funciona |
|---|---|---|
| Contraseñas seguras | `shared/utils/password.js` | scrypt con sal aleatoria; comparación en tiempo constante |
| Sesión | `shared/middlewares/auth.js` | JWT de 8 h; en cada petición se revalida contra la base |
| Revocación inmediata | `auth.js` | Si el usuario se desactiva o cambia de rol, su token deja de valer |
| Autorización por rol | `permitirRoles` en cada `*.routes.js` | 403 si el rol no corresponde |
| Autorización por propiedad | `cliente.service.js` (`fichaCliente`), `trabajador.service.js` (`id_trabajador`) | Se filtra por el id del **token**, nunca por uno enviado por el cliente; lo ajeno responde 404 |
| Fuerza bruta | `auth.service.js` | 5 fallos → 15 min de bloqueo por correo |
| Mensaje de error genérico | `auth.service.js` | No revela si falló el correo o la contraseña |
| Inyección SQL | Todos los `*.service.js` | Consultas parametrizadas (`$1`, `$2`); los nombres de columna dinámicos salen de listas blancas |
| Datos de tarjeta | `pasarela.service.js`, `pagos.service.js`, tabla `medio_pago` | Solo token y últimos 4 dígitos; nunca el número ni el CVV |
| Notificación repetida de la pasarela | `pagos.service.js` | Idempotencia por token |
| Doble pago | `finanzas.service.js` | `FOR UPDATE` + estado de la cuota |
| Errores internos | `errorHandler.js` | El detalle va a la consola; al cliente solo "Error interno del servidor" |
| Secretos fuera del repositorio | `.gitignore` (`.env`) | `JWT_SECRET`, clave de Postgres y credenciales de Flow nunca se suben |

---

## 8. Trazabilidad: historia de usuario → archivos

| HU | Descripción | Backend | Frontend |
|---|---|---|---|
| HU-01 | Impagos y morosidad | `finanzas.service.js` (`impagos`) | `ImpagosPage`, `InicioAdminPage` |
| HU-02 | Registro manual de pagos | `finanzas.service.js` (`registrarPagoManual`) | `ImpagosPage` |
| HU-03 | Clientes y plantas | `clientes.service.js`, `plantas.service.js`, `suscripciones.service.js` | `ClientesPage`, `Planta*Page`, `SuscripcionPanel` |
| HU-04 | Calendario por comuna | `mantenciones.service.js` (`listar`) | `CalendarioPage` |
| HU-05 | Registro de mantención ejecutada | `trabajador.service.js` (`cambiarEstado`) | `OrdenPage` |
| HU-06 | Listado mensual de pagos | `finanzas.service.js` (`pagosDelMes`), `finanzas.controller.js` (CSV) | `PagosMesPage` |
| HU-07 | Registro y acceso del cliente | `auth.service.js` | `LoginPage`, `RegistroPage`, `AuthContext` |
| HU-08 | Mi Cuenta: pagos y deuda | `cliente.service.js` (`cuenta`) | `CuentaPage` |
| HU-09 | Última y próxima mantención | `cliente.service.js` (`mantenciones`) | `MantencionesClientePage` |
| HU-10 | Ficha técnica para el cliente | `cliente.service.js` (`misPlantas`, `obtenerPlanta`) | `MisPlantasPage`, `PlantaClientePage` |
| HU-11 | Solicitud de mantención | `cliente.service.js`, `mantenciones.service.js` (bandeja) | `SolicitudesClientePage`, `SolicitudesAdminPage` |
| HU-12 | Cancelación de la suscripción | `cliente.service.js` (`cancelarSuscripcion`) | `CuentaPage` |
| HU-13 | Medio de pago y condiciones | `cliente.service.js` (`iniciarInscripcion`), `pagos/*`, `finanzas.service.js` (`procesarCargos`) | `CuentaPage`, `PasarelaSimuladaPage`, `PagosMesPage` |
| HU-14 | Agenda con mapa | `trabajador.service.js` (`agenda`) | `AgendaPage`, `ordenUtils.jsx` |
| HU-15 | Cuentas de trabajadores | `trabajadores.service.js`, `auth.js` (revocación) | `TrabajadoresPage` |
| HU-16 | Ficha y estado de la orden | `trabajador.service.js`, `estadosOrden.js`, `mantencion_historial` | `OrdenPage` |
| HU-17 | Asignación de mantenciones | `mantenciones.service.js` (`asignar`, `validarTrabajadorActivo`) | `CalendarioPage`, `SolicitudesAdminPage` |
| RNF-07 | Precios como datos | `catalogo.service.js`, `publico.routes.js` | `CatalogoPage`, `CotizadorPage` |

---

## 9. Receta: cómo agregar una funcionalidad

Se sigue siempre el mismo recorrido, de abajo hacia arriba. **Ejemplo concreto:**
agregar el **filtro por comuna al calendario** (la API ya lo soporta; solo falta la
pantalla), y luego, entre paréntesis, qué haría falta para algo que sí requiera un
endpoint nuevo.

**Solo frontend (el caso del filtro por comuna)**

1. Abre `frontend/src/modules/administrador/pages/CalendarioPage.jsx`.
2. Agrega `id_comuna: ''` al estado `filtros`.
3. Carga las comunas con `listarComunas()` (ya existe en `adminService.js`).
4. Agrega un `<select>` de comuna junto a los de estado y fechas, igual que los demás.
5. `listarMantenciones(filtros)` ya envía `id_comuna` porque `adminService` incluye
   todo parámetro con valor.

**Si necesitas un endpoint nuevo, de abajo hacia arriba:**

1. **Base de datos:** si hace falta una columna o tabla, crea `database/schema/003_xxx.sql`
   con `IF NOT EXISTS`. No edites los archivos anteriores.
2. **Servicio** (`modules/<perfil>/<tema>.service.js`): la lógica y el SQL con
   parámetros. Lanza `HttpError` ante datos inválidos. Usa transacción si toca más
   de una tabla.
3. **Controlador**: una función que lea `req`, valide los ids con `parseId`, llame al
   servicio y responda.
4. **Ruta**: una línea `router.get(...)` en el archivo `*.routes.js` del módulo, que ya
   trae `autenticar` y `permitirRoles`.
5. **Documentación**: agrega la entrada en `backend/src/docs/openapi.js`.
6. **Servicio del frontend**: una línea en `modules/<perfil>/services/`.
7. **Página**: usa el patrón de la sección 5.5 y reutiliza las clases de `global.css`.
8. **Ruta del frontend**: regístrala en `AppRoutes.jsx` y, si va en el menú, en `MENU`
   de `Layout.jsx`.
9. **Prueba**: si hay una regla de negocio pura, escribe una prueba en `backend/tests/`.
10. **Verifica y sube**: `npm test --prefix backend`, `npm run build --prefix frontend`
    y revisa el flujo en el navegador. Luego sigue [GUIA_OTRO_PC_Y_GITHUB.md](GUIA_OTRO_PC_Y_GITHUB.md).

**Reglas que conviene respetar**

- Toda consulta que dependa del usuario debe filtrar por `req.usuario.id`, nunca por un
  id que llegue en el cuerpo o la URL sin comprobar propiedad.
- Nunca concatenes valores dentro del SQL; usa `$1`, `$2`.
- Si cambias un estado, hazlo en una transacción y deja constancia en el historial.
- Los textos de cara al usuario van en español y los mensajes de error no deben revelar
  detalles internos.

---

## 10. Límites conocidos y deuda técnica

Esta sección es deliberadamente franca: es lo que **no** está resuelto, para que nadie
lo dé por hecho.

**Seguridad y cumplimiento**

| Tema | Situación | Impacto |
|---|---|---|
| **Identidad en el registro (HU-07)** | Bastan el RUT y un correo para crear la cuenta. Quien conozca el RUT de un cliente puede apropiarse de su cuenta. | **El más importante.** Falta un código de activación o verificación. |
| **Condiciones de servicio (HU-13, RF-19)** | `CuentaPage` envía `acepta_condiciones: true` al pulsar el botón, **sin mostrar las condiciones ni pedir una casilla**. | No es un consentimiento informado real. |
| Bloqueo de intentos en memoria | El contador vive en un `Map`; se pierde al reiniciar y no se comparte entre procesos. | Sirve para un solo proceso. |
| Token en `localStorage` | Es legible por cualquier script de la página. | Alternativa: cookie `HttpOnly`. Hay que documentar la decisión. |
| Parámetros de scrypt | Se usan los valores por defecto de Node. | Falta fijarlos y medirlos. |
| `.env` con `AUTH_BYPASS` | Existe un atajo que salta la autenticación. | Debe estar siempre en `false` fuera de depuración. |

**Funcionalidad**

| Tema | Situación |
|---|---|
| Flow real | El código `sandbox` está escrito pero **nunca se ejecutó**, y usa cargos sueltos (`customer/charge`) en lugar del flujo de planes y suscripciones de Flow. Hay que rehacerlo contra su documentación. |
| Sin tareas programadas | Las cuotas se generan, vencen y se cobran **solo cuando el administrador pulsa los botones**. No hay cron. |
| Cobro y registro no son atómicos | En `procesarCargos` el cargo en la pasarela ocurre **fuera** de la transacción. Si la base fallara justo después de un cargo aprobado, se cobraría sin registrar el pago. Con la pasarela real habría que guardar primero un intento y conciliar. |
| Correo transaccional | No existe (confirmación de suscripción, fecha asignada). Está en el alcance del MVP. |
| Calendario | La pantalla no tiene el selector de comuna (el backend sí lo soporta). |
| Estado de la suscripción duplicado | `morosa`/`al_dia` se **recalcula** desde las cuotas, pero el administrador también puede fijarlo a mano con `PATCH /admin/suscripciones/:id`. Son dos fuentes de verdad. |
| Estado `cerrada` de una solicitud | Existe en la base, pero ningún flujo lo usa. |
| Catálogo y suscripción | `catalogo_servicio` no se relaciona con `suscripcion`: la cuota se ingresa a mano. |
| Roles como `CHECK` | Los tres perfiles están fijos en la base; agregar uno exige una migración. |
| Coordenadas | `planta.latitud/longitud` existen, pero ningún formulario las captura; el mapa usa la dirección. |

**Calidad y mantenimiento**

| Tema | Situación |
|---|---|
| Pruebas de endpoints | No hay pruebas automatizadas de la API. Se verificó con 94 casos manuales cuyo script no se conservó. Conviene versionarlo como prueba de integración. |
| Pruebas del frontend | No hay. |
| Documentación OpenAPI manual | Puede desincronizarse del código. |
| Acoplamiento entre módulos del frontend | `CuentaPage` y `MisPlantasPage` importan `EstadoSuscripcion` del módulo administrador, y `CalendarioPage` importa `EtiquetaOrden` del módulo trabajador. Deberían estar en `shared/components`. |
| `parseId` repetido | Está definido en 3 controladores; los del administrador lo importan de `plantas.controller.js`. Debería vivir en `shared/utils`. |
| Patrón de transacción repetido | El bloque `BEGIN/COMMIT/ROLLBACK` se copia en varios servicios; una función auxiliar `enTransaccion(fn)` lo simplificaría. |
| Despliegue | Hoy el backend no sirve el frontend compilado (`frontend/dist`), así que aún no hay un modo "un solo servidor" para producción. |
| Rendimiento y accesibilidad | Se diseñó para 16 px, contraste AA y 360 px, pero **no se midió** (RNF-01, RNF-02, RNF-05). |
| Respaldo | No hay respaldo automático de la base (RNF-09). |

---

## 11. Glosario

| Término | Significado |
|---|---|
| **HU** | Historia de usuario (HU-01 a HU-17), un requerimiento funcional |
| **RF / RNF** | Requerimiento funcional / no funcional |
| **MVP** | Producto mínimo viable: la primera versión utilizable |
| **API REST** | Servicio web que se consulta con peticiones HTTP (GET, POST...) y responde JSON |
| **Endpoint** | Una URL concreta de la API (por ejemplo, `GET /api/cliente/cuenta`) |
| **JWT** | Token firmado que prueba quién es el usuario sin guardar sesiones en el servidor |
| **scrypt** | Algoritmo lento para guardar contraseñas, resistente a ataques de fuerza bruta |
| **Rol** | Perfil de acceso: cliente, trabajador o administrador |
| **Middleware** | Función que se ejecuta antes de llegar a la lógica de un endpoint (por ejemplo, verificar el token) |
| **Pool de conexiones** | Conjunto reutilizable de conexiones abiertas a la base de datos |
| **Transacción** | Grupo de operaciones SQL que se aplican todas o ninguna |
| **Idempotente** | Que repetir la operación produce el mismo resultado, sin duplicar efectos |
| **Migración** | Script SQL versionado que modifica el esquema de la base |
| **Seed** | Script que carga datos de prueba |
| **SPA** | Aplicación de una sola página: el navegador no recarga, React cambia la pantalla |
| **Proxy (Vite)** | Reenvío de las llamadas `/api` del frontend hacia el backend en desarrollo |
| **Sandbox** | Ambiente de pruebas de una pasarela de pago, sin dinero real |
| **Token (pasarela)** | Referencia opaca a una tarjeta inscrita; reemplaza al número de tarjeta |
| **Impago / morosidad** | Cuotas vencidas sin pagar |
| **CLP** | Pesos chilenos; los montos se guardan como enteros sin decimales |
