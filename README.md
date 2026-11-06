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

## Probar la pasarela de pagos (HU-13)

Con `FLOW_MODE=simulado` (por defecto), al inscribir un medio de pago desde
**Mi Cuenta** se abre una pasarela simulada. Usa cualquier dato de tarjeta ficticio;
los últimos dígitos **`0000`** fuerzan un rechazo para probar ese caso.

## Pruebas automáticas

```bash
npm test --prefix backend
```

## Estructura

```
ENINTI/
├── frontend/   # React: módulos auth, cliente, trabajador, administrador, publico
├── backend/    # Express: mismos módulos + pagos; capas rutas → controlador → servicio
├── database/   # schema/ (migraciones) y seeds/ (datos de prueba)
└── docs/       # Documentación del proyecto
```

## Documentación

- [docs/GUIA_INICIO.md](docs/GUIA_INICIO.md) — instalación paso a paso, inicio manual de los servidores y solución de problemas.
- [docs/GUIA_OTRO_PC_Y_GITHUB.md](docs/GUIA_OTRO_PC_Y_GITHUB.md) — abrir el proyecto en otro PC y flujo de Git/GitHub (clonar, ramas, commit, push, Pull Request).
- [docs/MANUAL.md](docs/MANUAL.md) — manual de uso por perfil y resumen de la API.
- **Documentación interactiva de la API (Swagger UI):** con los servidores arriba, abre
  http://localhost:5174/api/docs (o http://localhost:3001/api/docs). Documenta los 46 endpoints, con
  ejemplos listos para ejecutar con **Try it out**. La especificación OpenAPI está en
  [`backend/src/docs/openapi.js`](backend/src/docs/openapi.js) y se descarga en `/api/docs.json`.

## Equipos

| Equipo | Integrantes | Módulo |
|---|---|---|
| Equipo 1 | Cristofer Álvarez, Fernando Castillo | Cliente |
| Equipo 2 | Branyan Espinoza, Jeremy Herrera, Rachel Díaz | Trabajador |
| Conjunto | Ambos equipos | Administrador, autenticación, pagos y base de datos |
