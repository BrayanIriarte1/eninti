# Guía: trabajar en otro PC y subir cambios a GitHub · ENINTI

Cómo abrir el proyecto en un computador distinto y cómo enviar tus cambios a
GitHub con `git`. Repositorio: **https://github.com/BrayanIriarte1/eninti**

> Esta guía cubre el flujo de Git y lo que es distinto en un PC nuevo. La
> instalación detallada de Node, PostgreSQL y la base de datos está en
> [GUIA_INICIO.md](GUIA_INICIO.md); aquí solo se enlaza.

## Lo esencial en tres ideas

1. **El repositorio trae el código, no tus datos ni tus secretos.** Al clonar en otro
   PC no vienen `backend/.env` (la contraseña de Postgres y la clave JWT) ni
   `node_modules`, ni la base de datos. Hay que recrearlos en cada PC.
2. **Cada PC tiene su propia base de datos `eninti`.** Lo que crees en una (clientes,
   pagos, etc.) no viaja por Git. Los datos de prueba se recargan con
   `npm run db:init --prefix backend`.
3. **Para hacer `push` GitHub debe saber quién eres y darte permiso.** Clonar es
   libre porque el repositorio es público, pero subir cambios exige una cuenta con
   acceso de escritura.

---

## Parte 1 · Abrir el proyecto en otro PC

### 1.1 Instalar lo necesario (una vez por PC)

| Programa | Para qué | Descarga |
|---|---|---|
| Git for Windows | Control de versiones y login a GitHub | https://git-scm.com |
| Node.js 22 LTS | Ejecutar backend y frontend | https://nodejs.org |
| PostgreSQL 16 o superior | Base de datos | https://www.postgresql.org/download/ |
| VS Code (opcional) | Editor | https://code.visualstudio.com |

Comprueba en una terminal **nueva**:

```bash
git --version
node --version      # v20.6 o superior
npm --version
psql --version      # si no se reconoce, usa la ruta completa (ver GUIA_INICIO.md)
```

### 1.2 Clonar el repositorio

Elige una carpeta de trabajo (por ejemplo `C:\Proyectos`) y ejecuta:

```bash
git clone https://github.com/BrayanIriarte1/eninti.git
cd eninti
```

Para abrirlo en VS Code: `code .`

### 1.3 Recrear lo que no viene en el repositorio

**a) Dependencias**

```bash
npm run install:all
```

**b) Base de datos.** Crea la base `eninti` (solo ella; no toques otras bases que
tengas en ese PostgreSQL):

```bash
psql -U postgres -h localhost -c "CREATE DATABASE eninti;"
```

**c) Archivo de configuración.** Copia la plantilla y edítala con la clave de
PostgreSQL **de ese PC**:

```bash
cp backend/.env.example backend/.env
```

```ini
PORT=3001
DATABASE_URL=postgres://postgres:CLAVE_DE_ESTE_PC@localhost:5432/eninti
JWT_SECRET=una-frase-larga-y-aleatoria
AUTH_BYPASS=false
FLOW_MODE=simulado
```

> `backend/.env` nunca se sube a GitHub (está en `.gitignore`). Cada PC tiene el suyo
> y pueden ser distintos.

**d) Esquema y datos de prueba**

```bash
npm run db:init --prefix backend
```

### 1.4 Iniciar y comprobar

```bash
npm run dev
```

Abre http://localhost:5174 e inicia sesión con `admin@eninti.test` /
`Admin.2026`. La API queda documentada en http://localhost:5174/api/docs.

Si algo falla, revisa la tabla de problemas frecuentes de
[GUIA_INICIO.md](GUIA_INICIO.md).

### 1.5 ¿Necesitas llevar los datos de tu PC al otro?

Git no lo hace. Si de verdad quieres copiar la base completa (no solo los datos de
prueba), usa una copia de seguridad de PostgreSQL:

```bash
# En el PC de origen: exporta solo la base eninti a un archivo
pg_dump -U postgres -h localhost -d eninti -f eninti.sql

# En el PC de destino: con la base eninti ya creada y VACÍA
psql -U postgres -h localhost -d eninti -f eninti.sql
```

Lleva `eninti.sql` por un medio privado (USB, nube personal). **No lo subas al
repositorio**: contiene los datos y los hashes de contraseñas. El `.gitignore` ya
ignora los archivos `eninti*.sql`, `*.dump` y `*.backup` de la raíz; si usas otro
nombre, guárdalo fuera de la carpeta del proyecto.

---

## Parte 2 · Git y GitHub

### 2.1 Configurar tu identidad (una vez por PC)

Git firma cada commit con un nombre y un correo:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

Para no exponer tu correo personal puedes usar el correo privado de GitHub, que
aparece en https://github.com/settings/emails con el formato
`123456+usuario@users.noreply.github.com`.

Comprueba:

```bash
git config --global --list | grep user
```

### 2.2 Conectar con tu cuenta de GitHub

La primera vez que hagas `git push` desde un PC, GitHub pedirá autenticación. Hay
dos caminos; basta uno.

**Opción A · Git for Windows (la más simple).** Al hacer el primer `git push` se
abre una ventana del navegador: inicia sesión en GitHub y pulsa **Authorize**.
Windows guarda la credencial y no vuelve a pedirla.

**Opción B · GitHub CLI.** Instala `gh` desde https://cli.github.com y ejecuta:

```bash
gh auth login
```

Elige GitHub.com → HTTPS → "Login with a web browser". Te muestra un código de 8
caracteres que pegas en https://github.com/login/device.

> **No uses tu contraseña de GitHub en la terminal:** GitHub la rechaza hace años.
> Si pide una "contraseña", lo que espera es un *Personal Access Token* (Settings →
> Developer settings → Personal access tokens, permiso `repo`), pero las opciones A
> y B evitan tener que manejarlo.

### 2.3 Dar acceso de escritura a otras personas

El repositorio pertenece a la cuenta **BrayanIriarte1**. Una persona distinta solo
puede subir cambios si el dueño la invita:

1. En GitHub: repositorio → **Settings** → **Collaborators** → **Add people**.
2. Escribe el usuario o correo de la persona. Ella acepta la invitación (llega por
   correo y en https://github.com/notifications).

Si usas **la misma cuenta** en otro PC, no hace falta invitar a nadie: solo iniciar
sesión con esa cuenta (sección 2.2).

### 2.4 El ciclo diario de trabajo

Este es el flujo completo, de principio a fin:

```bash
# 1. Antes de empezar: trae lo último que hayan subido los demás
git checkout main
git pull

# 2. Crea una rama para tu cambio (nombre corto y descriptivo)
git checkout -b feature/filtro-comuna-calendario

# 3. Trabaja, prueba, y revisa qué cambió
git status
git diff

# 4. Prepara los archivos y crea el commit
git add backend/src/modules/administrador/mantenciones.service.js
git add frontend/src/modules/administrador/pages/CalendarioPage.jsx
git commit -m "feat(admin): filtro por comuna en el calendario"

# 5. Sube la rama a GitHub (la primera vez con -u)
git push -u origin feature/filtro-comuna-calendario
```

Después, en GitHub aparece un aviso amarillo con el botón **Compare & pull
request**. Crea el *Pull Request*, pide que otro integrante lo revise (la
Definición de Hecho del proyecto lo exige) y, aprobado, pulsa **Merge**. Luego en
tu PC:

```bash
git checkout main
git pull
git branch -d feature/filtro-comuna-calendario    # borra la rama local ya integrada
```

**Subir directo a `main`** (sin rama ni Pull Request) también funciona si tienes
permiso, y sirve para cambios pequeños propios:

```bash
git add .
git commit -m "docs: corrige la guía de inicio"
git push
```

### 2.5 Mensajes de commit

El proyecto usa el prefijo de tipo seguido de lo que cambió, en español:

| Prefijo | Cuándo |
|---|---|
| `feat(módulo):` | Funcionalidad nueva (`feat(cliente): ...`) |
| `fix(módulo):` | Corrección de un error |
| `docs:` | Solo documentación |
| `test:` | Pruebas |
| `chore:` | Configuración, dependencias |

Un commit = un cambio con sentido propio. Es mejor varios commits pequeños que uno
gigante.

### 2.6 Qué NO subir

`.gitignore` ya excluye lo principal, pero antes de cada commit revisa
`git status`. **Nunca** deben aparecer:

- `backend/.env` (contraseñas y clave JWT)
- `node_modules/`
- Copias de seguridad de la base (`eninti*.sql`, `*.dump`, `*.backup` ya se ignoran; otros nombres no)
- Credenciales de Flow (`FLOW_API_KEY`, `FLOW_SECRET_KEY`)

Si por error subiste un secreto, **cambia esa credencial de inmediato**: borrar el
archivo en un commit nuevo no basta, porque queda en el historial y el repositorio
es público.

---

## Parte 3 · Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `Permission denied` o `403` al hacer `push` | Tu cuenta no es colaboradora, o Windows guardó otra cuenta | Pide la invitación (2.3). Si es otra cuenta: Panel de control → **Administrador de credenciales** → Credenciales de Windows → borra las de `git:https://github.com` y repite el `push` |
| `rejected ... non-fast-forward` o `fetch first` | Alguien subió cambios antes que tú | `git pull --rebase` y luego `git push` |
| `CONFLICT (content)` al hacer `pull` | Tú y otra persona editaron las mismas líneas | Abre los archivos marcados, deja la versión correcta entre `<<<<<<<` y `>>>>>>>`, luego `git add <archivo>` y `git rebase --continue` (o `git commit` si fue un merge) |
| `Author identity unknown` | No configuraste nombre y correo | Sección 2.1 |
| Avisos `LF will be replaced by CRLF` | Windows y Git normalizando saltos de línea | Son solo avisos. El repositorio fuerza `LF` con `.gitattributes`; se pueden ignorar |
| `fatal: not a git repository` | Estás fuera de la carpeta del proyecto | `cd` a la carpeta `eninti` |
| `remote: Repository not found` | Falta permiso, o la URL está mal | Revisa `git remote -v`; debe ser `https://github.com/BrayanIriarte1/eninti.git` |
| Subí un archivo por error (aún sin `push`) | — | `git reset HEAD~1` deshace el último commit y deja los archivos intactos |
| Quiero descartar mis cambios locales de un archivo | — | `git restore ruta/del/archivo` (**irreversible**: pierde lo no guardado en un commit) |
| El otro PC no ve mis datos de prueba nuevos | Los datos viven en la base, no en Git | Sección 1.5 |

## Chuleta de comandos

```bash
git status                  # qué cambió
git diff                    # detalle de los cambios sin preparar
git log --oneline -10       # últimos 10 commits
git pull                    # traer cambios de GitHub
git push                    # subir mis commits
git checkout -b nombre      # crear y entrar a una rama
git checkout main           # volver a main
git branch                  # ver ramas locales
git remote -v               # ver a qué repositorio apunta
```
