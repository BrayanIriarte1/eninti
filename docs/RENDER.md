# Publicar ENINTI en Render

Un solo servicio web de Render entrega la API (`/api`), la documentación (`/api/docs`) y el
frontend compilado desde el mismo dominio. La base de datos es PostgreSQL en **Neon** (gratis y
sin vencimiento; la base gratuita de Render se borra a los 30 días).

Tiempo estimado: 20 minutos. Todo lo que sigue se hace con **tus** cuentas.

## 1. Base de datos en Neon

1. Crea una cuenta en <https://neon.tech> y un proyecto (región: **AWS São Paulo**, la más cercana a Chile).
2. En **Connection details** desactiva **Connection pooling** y copia la cadena de conexión
   **directa**. Debe terminar en `?sslmode=require`:
   ```
   postgresql://usuario:clave@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   La conexión *pooled* no sirve: no acepta la zona horaria que el servidor fija al conectarse.

No hace falta crear las tablas: el servicio las crea al arrancar (paso 3).

## 2. Servicio en Render

1. Crea una cuenta en <https://render.com> entrando con GitHub y da acceso al repositorio.
2. **New → Blueprint**, elige el repositorio y la rama `main`. Render lee `render.yaml`.
3. Te pedirá las variables marcadas como secretas:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La cadena directa de Neon del paso 1 |
   | `APP_URL` | La URL del servicio, p. ej. `https://eninti.onrender.com` (si aún no la sabes, pon cualquiera y corrígela después) |
   | `MAIL_API_KEY`, `MAIL_FROM` | Las de Brevo ([CORREO.md](CORREO.md)); vacías por ahora si no las tienes |
   | `FLOW_API_KEY`, `FLOW_SECRET_KEY` | Vacías mientras `FLOW_MODE=simulado` |

   `JWT_SECRET` y `CRON_SECRET` los genera Render solo.
4. **Apply**. El primer despliegue tarda unos 3 minutos.

## 3. Qué pasa en cada despliegue

- **Build** (`npm run build`): instala dependencias y compila el frontend.
- **Arranque** (`npm run db:init --prefix backend && npm start`): aplica las migraciones de
  `database/schema` y, si la base está vacía, carga los datos de prueba. Es seguro repetirlo:
  en una base con datos solo agrega lo nuevo. Cada vez que fusiones un PR en `main`, Render
  vuelve a desplegar solo.

## 4. Después del primer despliegue (importante)

1. Abre la URL y entra con `admin@eninti.test` / `Admin.2026`.
2. **Cambia la contraseña** en *Sistema → Seguridad*. Las contraseñas de prueba están publicadas
   en el README: en un sitio público cualquiera podría entrar. Haz lo mismo con las demás cuentas
   de prueba o desactívalas. Mientras sigan iguales, el registro de Render lo advierte al arrancar.
3. Si `APP_URL` quedó provisoria, corrígela en **Environment** (Render reinicia el servicio).
4. Correo: con `MAIL_MODE=consola` los avisos y la recuperación de contraseña solo aparecen en el
   registro. Para que lleguen, sigue [CORREO.md](CORREO.md) y cambia `MAIL_MODE` a `brevo`.
   *Sistema → Correos* muestra si la configuración está completa y envía un correo de prueba.

## 5. Cobro automático con el plan gratuito

El plan gratuito **duerme el servidor** tras 15 minutos sin visitas (la siguiente visita tarda
~1 minuto en despertarlo), así que el reloj interno del cobro diario puede no correr. Crea una
tarea gratis en <https://cron-job.org>:

- URL: `https://<tu-servicio>.onrender.com/api/tareas/cobro-diario`
- Método: **POST**, todos los días a las **10:00** (hora de Chile)
- Cabecera: `Authorization: Bearer <CRON_SECRET>` (cópialo de **Environment** en Render)

Si ese día ya se ejecutó, responde `{ "omitida": true }`; repetirla no cobra dos veces.

## 6. Límites del plan gratuito

| | Límite | Qué significa |
|---|---|---|
| Render free | Duerme sin tráfico, 750 h/mes | La primera visita del día es lenta |
| Neon free | 0,5 GB | Alcanza para años de datos; las fotos de las órdenes son lo que más ocupa |

Para un uso real con clientes conviene el plan **Starter** de Render (no duerme), y Neon sigue
sirviendo. Respaldos: `npm run db:respaldo --prefix backend` con la `DATABASE_URL` de Neon en
`backend/.env` (requiere `pg_dump`).

## Problemas frecuentes

- **El despliegue falla en «db:init»**: revisa `DATABASE_URL` (directa, con `?sslmode=require`).
- **Error 404 o pantalla en blanco**: revisa en **Logs** que el build haya terminado («built in»).
- **Pagos con Flow sandbox**: `FLOW_MODE=sandbox` con sus credenciales; Flow debe poder llegar a
  `APP_URL/api/pagos/flow/retorno`, por eso `APP_URL` debe ser la URL pública real.
