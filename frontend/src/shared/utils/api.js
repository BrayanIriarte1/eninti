// Cliente HTTP común. Adjunta el token JWT guardado tras el login (HU-07).
const TOKEN_KEY = 'eninti_token';

export const guardarToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const leerToken = () => localStorage.getItem(TOKEN_KEY);
export const borrarToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(ruta, { method = 'GET', body } = {}) {
  const token = leerToken();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${ruta}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 401 con sesión activa: el token venció o la cuenta se desactivó (HU-15)
  if (res.status === 401 && token) {
    borrarToken();
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  }

  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(datos?.error ?? `Error ${res.status}`);
    error.detalles = datos?.detalles;
    error.status = res.status;
    throw error;
  }
  return datos;
}
