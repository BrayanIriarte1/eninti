# ENINTI · Plataforma de Suscripciones y Mantención Fotovoltaica

Plataforma web para gestionar las suscripciones de mantención de sistemas solares
fotovoltaicos de ENINTI: cobro recurrente, órdenes de trabajo en terreno y fichas
técnicas centralizadas. Tres perfiles (Cliente, Trabajador y Administrador) sobre
una sola base de datos.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 + React Router 7 |
| Backend | Node.js 22 LTS + Express 5 (módulos ES) |
| Base de datos | PostgreSQL 18 |
| Autenticación | JWT + scrypt |
| Pagos | Flow Suscripciones (sandbox) · pasarela simulada para la demo |

## Requisitos

- **Node.js 22 LTS** o superior
- **PostgreSQL 16+** (el proyecto se probó en PostgreSQL 18)

## Puesta en marcha (primera vez)

> Guía completa, con inicio manual de cada servidor y solución de problemas:
> [docs/GUIA_INICIO.md](docs/GUIA_INICIO.md).

### 1. Crear la base de datos

El proyecto usa su **propia base de datos** llamada `eninti`. **No** usa ni modifica
ninguna otra base del servidor. Créala una vez:

```bash
# Ajusta el usuario si no es "postgres"
psql -U postgres -c "CREATE DATABASE eninti;"
```

### 2. Configurar el backend

Copia `backend/.env.example` a `backend/.env` y ajusta `DATABASE_URL` con tu
usuario y contraseña de PostgreSQL:

```
DATABASE_URL=postgres://postgres:TU_CLAVE@localhost:5432/eninti
JWT_SECRET=una-clave-larga-y-secreta
AUTH_BYPASS=false
FLOW_MODE=simulado
```

> `backend/.env` está en `.gitignore`: nunca se sube al repositorio.

### 3. Instalar dependencias

```bash
npm run install:all
```

### 4. Cargar el esquema y los datos de prueba

```bash
npm run db:init --prefix backend
```

Esto ejecuta las migraciones (`database/schema`) y los datos ficticios
(`database/seeds`). Es seguro repetirlo: no duplica datos.

## Iniciar los servidores (cada vez)

Desde la raíz del proyecto, un solo comando levanta backend y frontend juntos:

```bash
npm run dev
```

- **Frontend (la app):** http://localhost:5174
- **Backend (la API):** http://localhost:3001/api

Para detener ambos: `Ctrl + C`. Si prefieres levantarlos por separado:

```bash
npm run dev --prefix backend    # API en el puerto 3001
npm run dev --prefix frontend   # App en el puerto 5174
```

## Credenciales de prueba

Todos son datos ficticios (RNF-04). Entra en http://localhost:5174 con:

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@eninti.test` | `Admin.2026` |
| Trabajador | `pedro.ramirez@eninti.test` | `Trabajador.2026` |
| Cliente | `maria.gonzalez@ejemplo.cl` | `Cliente.2026` |
| Cliente | `luis.perez@ejemplo.cl` | `Cliente.2026` |

Cada perfil es llevado automáticamente a su panel: el administrador a `/admin`,
el trabajador a su agenda y el cliente a Mi Cuenta.

### Contraseñas

- **Cambiarla**: administración y técnicos desde *Seguridad* en el menú; el cliente desde *Mis datos*.
  Se pide la actual y se cierran las demás sesiones abiertas.
- **Recuperarla**: *¿Olvidaste tu contraseña?* en el login envía un enlace de un solo uso
  que vence en 1 hora. Con `MAIL_MODE=consola` el correo, con el enlace, aparece en la
  terminal del backend.
- Requiere la migración `007_recuperar_contrasena.sql` (la aplica `npm run db:init`).

## Correo

Por defecto (`MAIL_MODE=consola`) los avisos solo aparecen en la terminal del backend.
Para enviarlos de verdad con Brevo (gratis, sin dominio propio) sigue
**[docs/CORREO.md](docs/CORREO.md)**. El administrador ve la configuración, la bitácora de
avisos y un botón de **correo de prueba** en *Sistema → Correos*.

## Cobro mensual automático (HU-13)

Cada día, desde las 9:00 (hora de Chile), la API genera las cuotas del mes en curso y cobra
en la pasarela las que vencen a los clientes con tarjeta inscrita. Se configura con
`COBRO_AUTOMATICO` y `COBRO_HORA` en `backend/.env`. El estado, el historial y el botón
**Ejecutar ahora** están en *Pagos del mes*.

- Se ejecuta **una vez al día**, aunque el servidor se reinicie, y nunca dos procesos a la vez.
- Una tarjeta rechazada se reintenta **una vez al día** y como máximo 5 veces; el cliente
  recibe un correo para revisar o cambiar su tarjeta.
- Un cobro que la pasarela deja **en espera** no se repite (evita cobrar dos veces): aparece
  en *Pagos del mes* para revisarlo y descartarlo si no se cobró.
- Cada intento queda registrado en `intento_cargo` (migración `008_cobro_automatico.sql`).

**En Render (plan gratuito)** el servidor se duerme sin visitas, así que el reloj interno
puede no correr. Crea una tarea gratuita en un servicio de cron (por ejemplo cron-job.org)
que todos los días, después de las 9:00, haga:

```
POST https://<tu-app>.onrender.com/api/tareas/cobro-diario
Authorization: Bearer <CRON_SECRET>
```

`CRON_SECRET` lo genera Render (está en `render.yaml`). Llamarla varias veces es seguro:
si hoy ya se ejecutó, responde `{ "omitida": true }`.

## Probar la pasarela de pagos (HU-13)

Con `FLOW_MODE=simulado` (por defecto), al inscribir un medio de pago desde
**Mi Cuenta** se abre una pasarela simulada. Usa cualquier dato de tarjeta ficticio;
los últimos dígitos **`0000`** fuerzan un rechazo para probar ese caso.

## Pruebas automáticas y linter

```bash
npm test        # tests del backend (node --test) y del frontend (Vitest)
npm run lint    # ESLint del frontend, con las reglas de los hooks de React
```

También se pueden correr por separado con `npm test --prefix backend` o `npm test --prefix frontend`.

## Estructura

```
ENINTI/
├── frontend/   # React: módulos auth, cliente, trabajador, administrador, publico
├── backend/    # Express: mismos módulos + pagos; capas rutas → controlador → servicio
├── database/   # schema/ (migraciones) y seeds/ (datos de prueba)
└── docs/       # Documentación del proyecto
```

## Documentación

- [docs/GUIA_DEL_CODIGO.md](docs/GUIA_DEL_CODIGO.md) — guía completa para entender el código: arquitectura, base de datos, backend, frontend, flujos, seguridad y trazabilidad de cada historia de usuario.
- [docs/GUIA_INICIO.md](docs/GUIA_INICIO.md) — instalación paso a paso, inicio manual de los servidores y solución de problemas.
- [docs/GUIA_OTRO_PC_Y_GITHUB.md](docs/GUIA_OTRO_PC_Y_GITHUB.md) — abrir el proyecto en otro PC y flujo de Git/GitHub (clonar, ramas, commit, push, Pull Request).
- [docs/RENDER.md](docs/RENDER.md) — publicar el proyecto en Render con la base en Neon.
- [docs/MANUAL.md](docs/MANUAL.md) — manual de uso por perfil y resumen de la API.
- **Documentación interactiva de la API (Swagger UI):** con los servidores arriba, abre
  http://localhost:5174/api/docs (o http://localhost:3001/api/docs). Documenta los 51 endpoints, con
  ejemplos listos para ejecutar con **Try it out**. La especificación OpenAPI está en
  [`backend/src/docs/openapi.js`](backend/src/docs/openapi.js) y se descarga en `/api/docs.json`.

## Equipos

| Equipo | Integrantes | Módulo |
|---|---|---|
| Equipo 1 | Cristofer Álvarez, Fernando Castillo | Cliente |
| Equipo 2 | Branyan Espinoza, Jeremy Herrera, Rachel Díaz | Trabajador |
| Conjunto | Ambos equipos | Administrador, autenticación, pagos y base de datos |

## Publicar en Render + Neon

Guía paso a paso en [docs/RENDER.md](docs/RENDER.md). En resumen:

1. Crea la base en Neon y copia la cadena de conexión **directa** (no la *pooled*) con `?sslmode=require`.
2. En Render: **New → Blueprint** con este repositorio (`render.yaml`) y completa `DATABASE_URL` y `APP_URL`.
3. Al arrancar, el servicio aplica las migraciones y, si la base está vacía, carga los datos de prueba: no hay que inicializar la base a mano.
4. Entra como administrador y **cambia las contraseñas de prueba** (son públicas en este README); el registro de Render lo advierte mientras sigan iguales.

Un solo dominio sirve la API (`/api`), la documentación (`/api/docs`) y el frontend compilado.
Variables opcionales: `FLOW_MODE=sandbox` + `FLOW_API_KEY` / `FLOW_SECRET_KEY` (pasarela real de pruebas),
`MAIL_MODE=brevo|resend` + `MAIL_API_KEY` / `MAIL_FROM` (correos de aviso).

Respaldo: `npm run db:respaldo --prefix backend` (requiere `pg_dump`) crea `respaldos/eninti-<fecha>.sql` y conserva 14 días.
