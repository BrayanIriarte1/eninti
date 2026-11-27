// Cliente HTTP común. Adjunta el token JWT guardado tras el login (HU-07).
const TOKEN_KEY = 'eninti_token';

export const guardarToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const leerToken = () => localStorage.getItem(TOKEN_KEY);
export const borrarToken = () => localStorage.removeItem(TOKEN_KEY);

const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo';

function crearError(mensaje, status, detalles) {
  const error = new Error(mensaje);
  error.status = status;
  error.detalles = detalles;
  return error;
}

// Petición cruda a la API (también la usan las descargas de archivos): adjunta el token,
// traduce la falta de conexión a un mensaje claro y cierra la sesión ante un 401.
export async function solicitar(ruta, { method = 'GET', body } = {}) {
  const token = leerToken();
  const headers = {};
  if (body != null) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${ruta}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch solo falla así cuando no hay red o el servidor no responde
    throw crearError(SIN_CONEXION, 0);
  }

  // 401 con sesión activa: el token venció o la cuenta se desactivó (HU-15)
  if (res.status === 401 && token) {
    borrarToken();
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  }
  return res;
}

// Convierte una respuesta de error en un Error con el mensaje de la API (o uno legible)
export async function errorDeRespuesta(res) {
  const datos = await res.json().catch(() => null);
  if (datos?.error) return crearError(datos.error, res.status, datos.detalles);
  // Sin cuerpo JSON: el servidor está caído o reiniciándose (502/503/504 del proxy)
  const mensaje = res.status >= 500
    ? 'El servidor no está disponible en este momento. Inténtalo de nuevo en unos segundos'
    : `Error ${res.status}`;
  return crearError(mensaje, res.status);
}

export async function api(ruta, opciones) {
  const res = await solicitar(ruta, opciones);
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.json().catch(() => null);
}
