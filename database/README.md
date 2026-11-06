# Base de datos

Base de datos PostgreSQL de la plataforma ENINTI. Se trabaja en conjunto entre ambos equipos.
El detalle de cada tabla, sus relaciones y las reglas que garantiza la base está en
[../docs/GUIA_DEL_CODIGO.md](../docs/GUIA_DEL_CODIGO.md#3-base-de-datos).

## Estructura

```
database/
├── schema/       # Tablas. Se ejecutan en orden alfabético
│   ├── 001_esquema.sql              # 11 tablas base
│   └── 002_operacion_y_pagos.sql    # historial de mantenciones, catálogo y columnas nuevas
├── seeds/        # Datos de prueba ficticios (solo se cargan si la base está vacía)
├── migrations/   # Reservada para cambios futuros
└── diagramas/    # Modelo entidad-relación
```

## Cómo cargarla

Con la base `eninti` ya creada y el `.env` del backend configurado:

```
npm run db:init --prefix backend
```

Ejecuta primero `schema/` y luego `seeds/`. Es seguro repetirlo: las tablas usan
`IF NOT EXISTS` y los datos de prueba solo se insertan en una base vacía.

## Modelo: 13 tablas

| Tabla | Contenido | Historias |
|---|---|---|
| `usuario` | Cuentas de acceso con rol cliente, trabajador o administrador | HU-07, HU-15 |
| `comuna` | Comunas donde opera ENINTI | HU-04 |
| `cliente` | Datos del suscriptor; se enlaza a `usuario` cuando se registra | HU-03, HU-07 |
| `planta` | Instalación fotovoltaica y su ficha técnica | HU-03, HU-10 |
| `suscripcion` | Suscripción mensual de la planta: cuota, día de cobro y mantenciones al año | HU-03, HU-12 |
| `aceptacion_condiciones` | Registro de aceptación de las condiciones del servicio | HU-13 |
| `medio_pago` | Token de la pasarela y últimos 4 dígitos; nunca el número de tarjeta | HU-13 |
| `cuota` | Cuota mensual generada por período (`YYYY-MM`) | HU-01, HU-08 |
| `pago` | Pago de una cuota, por pasarela o registrado a mano | HU-02, HU-06 |
| `solicitud_mantencion` | Solicitud hecha por el cliente | HU-11 |
| `mantencion` | Mantención programada, asignada a un trabajador y su registro | HU-04, HU-05, HU-16, HU-17 |
| `mantencion_historial` | Cada cambio de estado de una mantención, con responsable | HU-16 |
| `catalogo_servicio` | Planes y servicios con precio, para el cotizador | RNF-07 |

## Cómo cambiar el esquema

**No edites** `001_` ni `002_`. Crea un archivo nuevo `schema/003_descripcion.sql` con
sentencias `IF NOT EXISTS` o `ADD COLUMN IF NOT EXISTS`, para que se pueda ejecutar sobre
bases que ya tienen los datos. Los datos de prueba nuevos van en `seeds/`, con una guarda
que evite duplicarlos.

> `npm run db:init` nunca borra datos. Para volver al estado inicial hay que recrear la
> base `eninti` (ver la sección de reinicio en [../docs/GUIA_INICIO.md](../docs/GUIA_INICIO.md)).
