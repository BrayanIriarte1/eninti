# Frontend

Interfaz web de la plataforma ENINTI, en React 19 con Vite 8 y React Router 7.

> Para entender cómo está construido, lee [../docs/GUIA_DEL_CODIGO.md](../docs/GUIA_DEL_CODIGO.md#5-frontend).

## Estructura

```
frontend/
├── vite.config.js           # Puerto 5174 y reenvío de /api al backend (3001)
└── src/
    ├── main.jsx             # Arranque: router y sesión
    ├── routes/AppRoutes.jsx # Todas las rutas y qué rol puede entrar
    ├── styles/global.css    # Estilos (variables, componentes, responsive)
    ├── shared/              # Sesión, rutas protegidas, layout, cliente HTTP, utilidades
    └── modules/             # Un módulo por perfil: pages/, components/, services/
        ├── auth/            # Inicio de sesión y registro
        ├── cliente/         # Mi cuenta, plantas, mantenciones, solicitudes
        ├── trabajador/      # Agenda y órdenes de trabajo
        ├── administrador/   # Plantas, clientes, calendario, finanzas, catálogo...
        └── publico/         # Cotizador y pasarela de pago simulada
```

## Cómo levantarlo

Con el backend corriendo en el puerto 3001 (instalación completa en
[../docs/GUIA_INICIO.md](../docs/GUIA_INICIO.md)):

```
npm install
npm run dev       # http://localhost:5174
npm run build     # compilación de producción en dist/
```

Abre http://localhost:5174 e inicia sesión; cada perfil llega a su propio panel. Las
credenciales de prueba están en el [README principal](../README.md#credenciales-de-prueba).
Vite redirige las llamadas a `/api` hacia el backend.
