import { describe, expect, test, vi } from 'vitest';

// api.js usa localStorage: en Node se reemplaza por uno en memoria
const memoria = new Map();
vi.stubGlobal('localStorage', {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => memoria.set(k, v),
  removeItem: (k) => memoria.delete(k),
});
const { api } = await import('./api.js');

describe('cliente HTTP', () => {
  test('sin conexión muestra un mensaje en español, no "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(api('/x')).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/No se pudo conectar/) });
  });

  test('un 502 sin JSON (servidor caído tras el proxy) da un mensaje legible', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>Bad Gateway</html>', { status: 502 }));
    await expect(api('/x')).rejects.toMatchObject({ status: 502, message: expect.stringMatching(/no está disponible/) });
  });

  test('un error de la API conserva su mensaje y detalles', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'Datos inválidos', detalles: ['rut no es válido'] }, { status: 400 }));
    await expect(api('/x')).rejects.toMatchObject({ status: 400, message: 'Datos inválidos', detalles: ['rut no es válido'] });
  });

  test('una respuesta correcta devuelve el JSON', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ ok: true }));
    await expect(api('/x')).resolves.toEqual({ ok: true });
  });
});
