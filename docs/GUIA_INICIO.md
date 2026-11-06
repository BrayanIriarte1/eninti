# Guía de instalación e inicio manual · ENINTI

Pasos para dejar la plataforma funcionando en un computador nuevo y para iniciar
los servidores a mano, sin atajos. Está escrita para **Windows**; en Linux o macOS
los pasos son los mismos cambiando las rutas.

Resumen: la plataforma son **dos procesos** (la API y la app web) que hablan con
**una base de datos PostgreSQL**. Los tres deben estar funcionando a la vez.

| Pieza | Puerto | Qué es |
|---|---|---|
| PostgreSQL | 5432 | Base de datos `eninti` |
| Backend (API) | 3001 | Express, expone `/api` |
| Frontend (app) | 5174 | Vite + React, lo que se abre en el navegador |

---

## 1. Requisitos previos

Instala una sola vez:

1. **Node.js 22 LTS** (mínimo 20.6): https://nodejs.org
2. **PostgreSQL 16 o superior** (probado en 18): https://www.postgresql.org/download/
   Durante la instalación anota la contraseña del usuario `postgres`.
3. **Git**: https://git-scm.com

Verifica en una terminal **nueva** (PowerShell o Git Bash):

```bash
node --version     # debe mostrar v20.6 o superior
npm --version
git --version
```

> Si `node` no se reconoce justo después de instalarlo, cierra y abre la terminal:
> el PATH solo se actualiza en terminales nuevas.

## 2. Obtener el código

```bash
git clone https://github.com/BrayanIriarte1/eninti.git
cd eninti
```

## 3. Instalar dependencias

Son tres instalaciones independientes (raíz, backend y frontend). El comando
`install:all` las hace todas:

```bash
npm run install:all
```

Equivale a hacerlas a mano:

```bash
npm install                       # raíz: trae "concurrently", que levanta ambos servidores
npm install --prefix backend      # Express, pg, jsonwebtoken
npm install --prefix frontend     # React, Vite, React Router
```

> Sin la instalación de la raíz, `npm run dev` falla con "concurrently no se
> reconoce". Si solo usarás el inicio manual de la sección 6, no la necesitas.

## 4. Crear la base de datos

El proyecto usa su **propia base de datos**, llamada `eninti`. No toca ninguna otra
base que tengas en el mismo servidor de PostgreSQL.

Con `psql` (en Windows suele estar en `C:\Program Files\PostgreSQL\<versión>\bin`):

```bash
psql -U postgres -h localhost -c "CREATE DATABASE eninti;"
```

Te pedirá la contraseña de `postgres`. Si prefieres una interfaz gráfica, también
sirve pgAdmin o la extensión de PostgreSQL de VS Code: crea una base llamada
`eninti`.

## 5. Configurar variables de entorno

Copia la plantilla y edítala:

```bash
cp backend/.env.example backend/.env
```

Abre `backend/.env` y ajusta como mínimo estas líneas:

```ini
PORT=3001
DATABASE_URL=postgres://postgres:TU_CLAVE@localhost:5432/eninti
JWT_SECRET=una-frase-larga-y-aleatoria-que-solo-tu-conozcas
AUTH_BYPASS=false
FLOW_MODE=simulado
```

Qué significa cada una:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. Formato `postgres://usuario:clave@host:puerto/base`. La base debe ser `eninti`. |
| `JWT_SECRET` | Clave con la que se firman las sesiones. Elige un texto largo; si la cambias, todas las sesiones abiertas dejan de valer. |
| `AUTH_BYPASS` | Déjalo en `false`. En `true` salta el login y deja pasar todo como administrador (solo para depurar). |
| `FLOW_MODE` | `simulado` usa una pasarela de pago de mentira (no necesita cuenta). `sandbox` usa Flow real y exige `FLOW_API_KEY` y `FLOW_SECRET_KEY`. |

> **Contraseñas con símbolos:** si la clave de Postgres tiene caracteres como `@`,
> `:`, `/` o `#`, escríbelos codificados en `DATABASE_URL` (`@` → `%40`, `:` →
> `%3A`, `/` → `%2F`, `#` → `%23`).
>
> **Seguridad:** `backend/.env` está en `.gitignore` y nunca debe subirse a GitHub.

## 6. Cargar el esquema y los datos de prueba

Crea las tablas y carga los usuarios, plantas, cuotas y catálogo ficticios:

```bash
npm run db:init --prefix backend
```

Debe imprimir cuatro líneas con ✔ (`schema/001`, `schema/002`, `seeds/001`,
`seeds/002`). Es seguro repetirlo: las tablas se crean solo si no existen y los
datos de prueba solo se cargan si la base está vacía.

## 7. Iniciar los servidores

### Opción A · Un solo comando

Desde la raíz del proyecto:

```bash
npm run dev
```

Levanta API y app juntas en una sola terminal, con la salida de cada una
etiquetada `[back]` y `[front]`. Para detener ambas: `Ctrl + C`.

### Opción B · Manual, un servidor por terminal

Útil para ver los registros por separado o reiniciar solo una parte.

**Terminal 1 · Backend**

```bash
cd backend
npm run dev
```

Debe imprimir: `API ENINTI escuchando en http://localhost:3001/api`

Este modo reinicia solo al guardar cambios (`node --watch`). Si prefieres sin
reinicio automático:

```bash
npm start
```

**Terminal 2 · Frontend** (otra terminal, sin cerrar la primera)

```bash
cd frontend
npm run dev
```

Debe imprimir: `Local: http://localhost:5174/`

### Orden recomendado

1. PostgreSQL funcionando (en Windows corre como servicio y arranca con el equipo).
2. Backend.
3. Frontend.

Si el backend no tiene la base disponible, arranca igual pero cada petición que
toque datos responderá error 500.

## 8. Comprobar que todo funciona

| Prueba | Cómo | Resultado esperado |
|---|---|---|
| API viva | Abrir http://localhost:3001/api/health | `{"ok":true}` |
| App viva | Abrir http://localhost:5174 | Pantalla de inicio de sesión de ENINTI |
| Conexión app → API | Abrir http://localhost:5174/api/health | `{"ok":true}` |
| Documentación de la API | Abrir http://localhost:5174/api/docs | Swagger UI con los 46 endpoints |
| Base de datos | Iniciar sesión (sección 9) | Entra al panel sin error |

> Abrir `http://localhost:3001/api` a secas responde `{"error":"Ruta no
> encontrada"}`. Es normal: esa ruta base no existe, solo las que cuelgan de ella.

## 9. Credenciales de prueba

Todas son datos ficticios. Entra en http://localhost:5174:

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@eninti.test` | `Admin.2026` |
| Trabajador | `pedro.ramirez@eninti.test` | `Trabajador.2026` |
| Cliente | `maria.gonzalez@ejemplo.cl` | `Cliente.2026` |
| Cliente | `luis.perez@ejemplo.cl` | `Cliente.2026` |

Cada perfil aterriza en su propio panel. Tras 5 contraseñas incorrectas seguidas
con el mismo correo, el acceso se bloquea 15 minutos.

### Probar la API en Swagger

Con los servidores arriba, abre http://localhost:5174/api/docs:

1. En **Autenticación → `POST /auth/login`** pulsa **Try it out** y **Execute**
   (el cuerpo de ejemplo ya trae las credenciales del administrador).
2. Copia el valor de `token` de la respuesta.
3. Pulsa **Authorize** (candado, arriba a la derecha), pega el token y confirma.
4. Ejecuta cualquier endpoint del rol de ese usuario. Para probar otro rol, vuelve a
   iniciar sesión con sus credenciales y reemplaza el token en **Authorize**.

Un token de un rol recibe **403** en los endpoints de otro rol: es el comportamiento
esperado.

## 10. Detener los servidores

- **Con una terminal abierta:** `Ctrl + C` en cada una.
- **Si cerraste la terminal y el servidor sigue vivo**, busca qué proceso ocupa el
  puerto y ciérralo (PowerShell):

```powershell
# Ver qué proceso usa el puerto
Get-NetTCPConnection -LocalPort 3001,5174 -State Listen | Select-Object LocalPort,OwningProcess

# Cerrarlo (reemplaza 12345 por el número de OwningProcess)
Stop-Process -Id 12345
```

## 11. Reiniciar los datos de prueba

Para volver al estado inicial (descarta todo lo que hayas creado en la app):

```bash
psql -U postgres -h localhost -c "DROP DATABASE eninti;"
psql -U postgres -h localhost -c "CREATE DATABASE eninti;"
npm run db:init --prefix backend
```

> **Cuidado:** `DROP DATABASE` borra la base por completo. Revisa que el nombre sea
> exactamente `eninti` y no el de otro proyecto. Para borrarla no puede haber
> conexiones abiertas: detén el backend antes.

## 12. Probar la pasarela de pagos

Con `FLOW_MODE=simulado`, entra como cliente, ve a **Mi cuenta** y pulsa
**Inscribir medio de pago**. Se abre un formulario de pasarela simulada:

- Cualquier dato ficticio → inscripción **aprobada**.
- Últimos 4 dígitos `0000` o el botón "Simular rechazo" → inscripción **rechazada**.

Después, como administrador, en **Pagos del mes** usa **Generar cuotas del
período** y **Procesar cargos recurrentes** para ver el cobro automático.

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `'node' no se reconoce` | Terminal abierta antes de instalar Node | Cerrar y abrir una terminal nueva (en VS Code, cerrar **todas** las ventanas y volver a abrirlo); si persiste, agregar la carpeta de Node al PATH. En Git Bash, solución inmediata sin reiniciar: `export PATH="/c/Users/TU_USUARIO/tools/node:$PATH"` (ajusta a donde esté `node.exe`) |
| `cd C:\Users\...` falla con "No such file or directory" (Git Bash) | En Git Bash la barra invertida `\` es un carácter de escape y borra las barras | Usar barras normales `cd C:/Users/chunc/ENINTI-main`, o comillas `cd "C:\Users\chunc\ENINTI-main"`. En PowerShell o CMD la ruta con `\` sí funciona |
| `npm error ENOENT ... package.json` | El comando se ejecutó fuera de la carpeta del proyecto | Hacer `cd` a la carpeta que contiene `package.json` (la raíz del proyecto) y repetir |
| `npm run dev` "no hace nada" | No abre el navegador y tarda 10 a 15 segundos en arrancar | Esperar a ver `API ENINTI escuchando...` y `VITE ... ready`, y abrir a mano http://localhost:5174. La terminal queda ocupada mientras corre: es lo normal; no la cierres |
| `concurrently no se reconoce` | Falta instalar la raíz | `npm install` en la raíz o `npm run install:all` |
| `password authentication failed for user "postgres"` | Clave incorrecta en `DATABASE_URL` | Corregir la clave en `backend/.env`; revisar caracteres especiales (sección 5) |
| `database "eninti" does not exist` | No se creó la base | Repetir la sección 4 |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL apagado | Iniciar el servicio (Windows: `services.msc` → `postgresql-x64-NN` → Iniciar) |
| `EADDRINUSE: address already in use :::3001` (o `5174`) | Ya hay un servidor corriendo en ese puerto | Detenerlo (sección 10) o cambiar `PORT` en `backend/.env` |
| El frontend carga pero el login da error de red | El backend no está corriendo | Levantar el backend (terminal 1) |
| `Port 5174 is in use` en Vite | Otro Vite abierto; el puerto es estricto a propósito | Cerrar el otro proceso (sección 10) |
| Login responde "Credenciales incorrectas" con datos correctos | La base se cargó antes de existir las contraseñas reales | Reiniciar datos (sección 11) |
| Login responde 429 | 5 intentos fallidos: bloqueo de 15 minutos | Esperar, o reiniciar el backend (el contador vive en memoria) |
| Error 500 en todas las pantallas con datos | Backend sin conexión a la base | Revisar `DATABASE_URL` y mirar el error en la terminal del backend |
| Tras cambiar `.env` nada cambia | El backend lee el archivo solo al arrancar | Reiniciar el backend |

## Pruebas automáticas

```bash
npm test --prefix backend
```

Ejecuta las pruebas unitarias del backend (transiciones de estado de las órdenes y
hash de contraseñas). No necesitan la base de datos.
