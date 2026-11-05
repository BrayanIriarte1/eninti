# Frontend

Interfaz web de la plataforma ENINTI, desarrollada en React.

## Estructura

```
frontend/
├── public/              # Archivos estáticos
└── src/
    ├── modules/         # Un módulo por carpeta
    │   ├── auth/        # Inicio de sesión y registro (Conjunto)
    │   ├── cliente/     # Módulo Cliente (Equipo 1)
    │   ├── trabajador/  # Módulo Trabajador (Equipo 2)
    │   └── administrador/ # Módulo Administrador (Conjunto)
    ├── shared/          # Componentes, layouts, hooks y utilidades comunes
    ├── routes/          # Rutas de la aplicación
    └── styles/          # Estilos globales
```

Cada módulo se organiza en `pages/`, `components/` y `services/`.

## Cómo levantarlo

Con el backend corriendo en el puerto 3001:

```
npm install
npm run dev
```

Abre http://localhost:5174/admin/plantas. Vite redirige las llamadas a `/api` hacia el backend.
