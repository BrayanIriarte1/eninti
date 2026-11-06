# Backend

API REST de la plataforma ENINTI, en Node.js 22 con Express 5 (módulos ES), PostgreSQL y
autenticación JWT.

> Para entender cómo está construido, lee [../docs/GUIA_DEL_CODIGO.md](../docs/GUIA_DEL_CODIGO.md).

## Estructura

```
backend/
├── scripts/db-init.js       # Carga database/schema y database/seeds
├── tests/                   # Pruebas unitarias (node:test)
└── src/
    ├── server.js            # Abre el puerto
    ├── app.js               # Middlewares, Swagger, rutas y manejo de errores
    ├── config/db.js         # Conexión a PostgreSQL
    ├── docs/openapi.js      # Especificación OpenAPI (alimenta /api/docs)
    ├── routes/index.js      # Monta cada módulo bajo su prefijo
    ├── shared/              # Middleware de sesión y roles, errores y utilidades
    └── modules/             # rutas → controlador → servicio, un módulo por carpeta
        ├── auth/            # /api/auth        login, registro, perfil
        ├── cliente/         # /api/cliente     cuenta, plantas, solicitudes, pago
        ├── trabajador/      # /api/trabajador  agenda y órdenes de trabajo
        ├── administrador/   # /api/admin       clientes, plantas, finanzas, calendario...
        ├── pagos/           # /api/pagos       pasarela de pago (simulada y Flow)
        └── publico/         # /api/publico     cotizador sin sesión
```

## Cómo levantarlo

Instalación, base de datos y variables de entorno están en
[../docs/GUIA_INICIO.md](../docs/GUIA_INICIO.md). Resumen, desde esta carpeta:

```
npm install
npm run db:init     # crea tablas y carga datos de prueba (repetirlo es seguro)
npm run dev         # reinicia solo al guardar cambios
npm test            # pruebas unitarias
```

Requiere `backend/.env` (copia `.env.example`). La API queda en http://localhost:3001/api.

## Documentación de la API

Con el servidor arriba, abre **http://localhost:3001/api/docs** (Swagger UI) o descarga la
especificación en `/api/docs.json`. Documenta los 46 endpoints con ejemplos ejecutables.
Los endpoints protegidos piden el token de `POST /api/auth/login` en el botón **Authorize**.

## Variables de entorno

| Variable | Uso |
|---|---|
| `PORT` | Puerto de la API (3001) |
| `DATABASE_URL` | Conexión a PostgreSQL; la base debe llamarse `eninti` |
| `JWT_SECRET` | Clave para firmar las sesiones |
| `AUTH_BYPASS` | `true` salta el login y entra como administrador. Solo para depurar; déjalo en `false` |
| `FLOW_MODE` | `simulado` (por defecto) o `sandbox` (Flow real, requiere credenciales) |
| `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL` | Credenciales de Flow (solo en modo `sandbox`) |
| `APP_URL` | URL pública del frontend, para el retorno de la pasarela real |
