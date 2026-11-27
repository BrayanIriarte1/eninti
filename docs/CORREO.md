# Correo real con Brevo

La plataforma envía avisos por correo: suscripción activa, visita programada, visita asignada
al técnico, cobro rechazado, recuperar contraseña y contraseña cambiada. Con
`MAIL_MODE=consola` solo se muestran en la terminal del backend. Para que lleguen de verdad,
conecta un proveedor. **Recomendamos Brevo**: su plan gratuito permite unos 300 correos al día
y deja usar como remitente un correo propio verificado, sin tener un dominio.

> Las pantallas de Brevo cambian con el tiempo; si un menú no coincide, busca la opción con
> el mismo nombre en su configuración.

## 1. Crear la cuenta y verificar el remitente

1. Crea una cuenta gratuita en [brevo.com](https://www.brevo.com) y confirma tu correo.
2. En **Senders, Domains & Dedicated IPs → Senders**, agrega el remitente, por ejemplo
   `avisos.eninti@gmail.com` o el correo de la empresa, y confírmalo con el código que te llega.
3. Si ENINTI tiene dominio propio (por ejemplo `eninti.cl`), autentícalo en **Domains**
   agregando los registros DNS que indica Brevo. Es opcional, pero mejora mucho la entrega:
   los correos de remitentes Gmail o Hotmail enviados por terceros caen más fácil en spam.

## 2. Crear la clave API

En **SMTP & API → API Keys**, genera una clave nueva con un nombre como `eninti`. Cópiala:
Brevo la muestra una sola vez. **No la compartas ni la subas a GitHub.**

## 3. Configurar el backend

En `backend/.env` (está en `.gitignore`, no se sube al repositorio):

```env
MAIL_MODE=brevo
MAIL_API_KEY=xkeysib-...tu-clave...
MAIL_FROM=ENINTI <avisos.eninti@gmail.com>
APP_URL=http://localhost:5174
```

- `MAIL_FROM` debe usar **exactamente** el remitente verificado en el paso 1.
- `APP_URL` es la dirección pública del frontend: con ella se arman los enlaces de los
  correos. En Render es la URL del servicio, por ejemplo `https://eninti.onrender.com`.

Reinicia el backend. Si falta algo, la terminal lo advierte al iniciar con `⚠ Correo: ...`.

**En Render**, define las mismas variables en *Environment*: `MAIL_MODE=brevo`,
`MAIL_API_KEY`, `MAIL_FROM` y `APP_URL`.

## 4. Probar

Entra como administrador a **Sistema → Correos** y usa **Enviar prueba**. Si falla, el panel
muestra el motivo que entregó Brevo. Los más comunes:

| Mensaje | Qué hacer |
|---|---|
| `401` / `Key not found` | La clave API está mal copiada o fue eliminada. |
| `sender ... not valid` / `not verified` | `MAIL_FROM` no coincide con un remitente verificado. |
| `account ... not activated` / `permission` | Brevo aún revisa la cuenta: activa el envío transaccional o espera su aprobación. |
| Llega a spam | Autentica el dominio (paso 1.3) o usa un remitente del dominio de la empresa. |

La tabla **Últimos avisos** muestra cada correo enviado o fallido, con su motivo.

## Alternativa: Resend

`MAIL_MODE=resend` también funciona, con `MAIL_API_KEY` de [resend.com](https://resend.com).
Resend exige **un dominio propio verificado** para enviar a cualquier destinatario. Sin
dominio solo permite enviarte correos a ti mismo, así que sirve para pruebas pero no para
los clientes.
