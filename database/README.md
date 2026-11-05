# Base de datos

Base de datos PostgreSQL de la plataforma ENINTI. Se trabaja en conjunto entre ambos equipos.

## Estructura

```
database/
├── schema/       # Script de creación de tablas
├── migrations/   # Cambios incrementales al esquema
├── seeds/        # Datos de prueba (ficticios)
└── diagramas/    # Modelo entidad-relación (MER)
```

## Modelo

El script `schema/001_esquema.sql` crea 11 tablas:

| Tabla | Contenido | Historias |
|---|---|---|
| `usuario` | Cuentas de acceso con rol cliente, trabajador o administrador | HU-07, HU-15 |
| `comuna` | Comunas donde opera ENINTI | HU-04 |
| `cliente` | Datos del suscriptor; se enlaza a `usuario` cuando se registra | HU-03, HU-07 |
| `planta` | Instalación fotovoltaica y su ficha técnica | HU-03, HU-10 |
| `suscripcion` | Suscripción mensual de la planta (único tipo): cuota, día de cobro y 2 mantenciones al año | HU-03, HU-12 |
| `aceptacion_condiciones` | Registro de aceptación de las condiciones del servicio | HU-13 |
| `medio_pago` | Token de la pasarela; nunca el número de tarjeta | HU-13 |
| `cuota` | Cuota mensual generada por periodo (`YYYY-MM`) | HU-01, HU-08 |
| `pago` | Pago de una cuota, por pasarela o registrado a mano | HU-02, HU-06 |
| `solicitud_mantencion` | Solicitud hecha por el cliente | HU-11 |
| `mantencion` | Mantención programada, asignada a un trabajador y su registro | HU-04, HU-05, HU-16, HU-17 |

`seeds/001_datos_prueba.sql` carga datos ficticios (solo si la base está vacía).
