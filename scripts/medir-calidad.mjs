// Mediciones de calidad del frontend (docs/pruebas/MATRIZ_DE_PRUEBAS.md):
//   RNF-05 carga inicial con red 3G simulada · RNF-02 sin desborde horizontal a 360 px ·
//   RNF-01 revisión automática de accesibilidad (nombres accesibles, etiquetas, alt, contraste, títulos).
// Usa Microsoft Edge o Google Chrome sin ventana, controlado por el protocolo DevTools (sin dependencias).
//
// Uso (con la API en marcha y el frontend compilado: npm run build --prefix frontend):
//   node scripts/medir-calidad.mjs [salida.json]
// Variables: URL_BASE (por defecto http://localhost:3001, debe ser local: usa las cuentas de prueba)
//            URL_PUBLICA (opcional, p. ej. https://eninti.onrender.com: mide solo /login, sin sesión)
//            NAVEGADOR (ruta a msedge.exe o chrome.exe si no está en la ubicación estándar)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = [process.env.NAVEGADOR, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((r) => r && existsSync(r));
if (!EDGE) { console.error('No se encontró Edge ni Chrome: define NAVEGADOR con la ruta del ejecutable'); process.exit(1); }
const PERFIL = join(tmpdir(), 'eninti-medir-calidad');
const LOCAL = process.env.URL_BASE ?? 'http://localhost:3001';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(LOCAL)) { console.error('URL_BASE debe ser local: el script inicia sesión con las cuentas de prueba'); process.exit(1); }
const SALIDA = process.argv[2] ?? 'medicion-calidad.json';
mkdirSync(PERFIL, { recursive: true });

const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9333', `--user-data-dir=${PERFIL}`, 'about:blank'], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let destino;
for (let i = 0; i < 40 && !destino; i++) {
  await espera(250);
  destino = await fetch('http://127.0.0.1:9333/json').then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null);
}
const ws = new WebSocket(destino.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pendientes = new Map(); const oyentes = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); } else oyentes.forEach((f) => f(m));
});
const cdp = (method, params = {}) => new Promise((ok, mal) => { const n = ++id; pendientes.set(n, (m) => (m.error ? mal(new Error(method + ': ' + m.error.message)) : ok(m.result))); ws.send(JSON.stringify({ id: n, method, params })); });
const evento = (nombre, ms = 60000) => new Promise((ok) => { const t = setTimeout(() => ok(null), ms); const f = (m) => { if (m.method === nombre) { clearTimeout(t); oyentes.splice(oyentes.indexOf(f), 1); ok(m.params); } }; oyentes.push(f); });
const evaluar = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

await cdp('Page.enable'); await cdp('Network.enable'); await cdp('Runtime.enable');

// Perfiles de red de Chrome DevTools (con su factor de ajuste)
const REDES = {
  '3G rápido (DevTools «Fast 3G»: 562,5 ms, 1,6 Mbit/s)': { latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 / 8) * 0.9, uploadThroughput: (750 * 1024 / 8) * 0.9 },
  '3G lento (DevTools «Slow 3G»: 2.000 ms, 500 kbit/s)': { latency: 2000, downloadThroughput: (500 * 1024 / 8) * 0.8, uploadThroughput: (500 * 1024 / 8) * 0.8 },
};

async function movil(ancho = 360) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: ancho, height: 780, deviceScaleFactor: 2, mobile: true });
}

async function ir(url, ms = 1500) {
  const carga = evento('Page.loadEventFired');
  await cdp('Page.navigate', { url });
  await carga; await espera(ms);
}

async function fijarToken(token) {
  await cdp('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await ir(LOCAL + '/login', 300);
  await evaluar(token ? `localStorage.setItem('eninti_token', ${JSON.stringify(token)})` : `localStorage.removeItem('eninti_token')`);
}

const login = async (email, password) => (await fetch(LOCAL + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then((r) => r.json())).token;
const TOKENS = {
  administrador: await login('admin@eninti.test', 'Admin.2026'),
  cliente: await login('maria.gonzalez@ejemplo.cl', 'Cliente.2026'),
  trabajador: await login('pedro.ramirez@eninti.test', 'Trabajador.2026'),
};

// ---------- 1. Carga en 3G (caché desactivada) ----------
const METRICAS = `new Promise((ok) => {
  const nav = performance.getEntriesByType('navigation')[0];
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
  let lcp = null;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(() => {
    const bytes = performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), nav.transferSize || 0);
    ok({ fcp, lcp, carga: nav.loadEventEnd, bytes, recursos: performance.getEntriesByType('resource').length });
  }, 100);
})`;

const carga = [];
const paginasCarga = [
  ['Inicio público (/)', LOCAL + '/', null],
  ['Inicio de sesión (/login)', LOCAL + '/login', null],
  ['Agenda del técnico (/trabajador/agenda)', LOCAL + '/trabajador/agenda', 'trabajador'],
  ['Mi cuenta del cliente (/cliente/cuenta)', LOCAL + '/cliente/cuenta', 'cliente'],
  ...(process.env.URL_PUBLICA ? [['Publicado · inicio de sesión', process.env.URL_PUBLICA + '/login', null]] : []),
];
if (process.env.URL_PUBLICA) await fetch(process.env.URL_PUBLICA + '/api/health').catch(() => null); // despierta el servicio gratuito
await movil(360);
for (const [nombre, url, rol] of paginasCarga) {
  if (url.startsWith(LOCAL)) await fijarToken(rol ? TOKENS[rol] : null);
  for (const [red, cond] of Object.entries(REDES)) {
    await cdp('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp('Network.emulateNetworkConditions', { offline: false, ...cond });
    await ir(url, 2500);
    const m = await evaluar(METRICAS);
    carga.push({ pagina: nombre, red, ...m });
    console.log(`${nombre} · ${red}: FCP ${(m.fcp / 1000).toFixed(2)} s · LCP ${(m.lcp / 1000).toFixed(2)} s · load ${(m.carga / 1000).toFixed(2)} s · ${Math.round(m.bytes / 1024)} KB`);
  }
}
await cdp('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await cdp('Network.setCacheDisabled', { cacheDisabled: false });

// ---------- 2 y 3. Desborde a 360 px y accesibilidad automática ----------
const idPlanta = (await fetch(LOCAL + '/api/admin/plantas', { headers: { Authorization: 'Bearer ' + TOKENS.administrador } }).then((r) => r.json()))[0]?.id_planta;
const idOrden = (await fetch(LOCAL + '/api/trabajador/agenda', { headers: { Authorization: 'Bearer ' + TOKENS.trabajador } }).then((r) => r.json()))[0]?.id_mantencion;
const RUTAS = {
  publico: ['/', '/login', '/recuperar', '/solicitar-cuenta', '/cotizador', '/contacto'],
  administrador: ['/admin', '/admin/plantas', '/admin/plantas/nueva', `/admin/plantas/${idPlanta}`, `/admin/plantas/${idPlanta}/editar`, '/admin/clientes', '/admin/trabajadores',
    '/admin/calendario', '/admin/solicitudes', '/admin/solicitudes-cuenta', '/admin/solicitudes-suscripcion', '/admin/solicitudes-planta', '/admin/cambios-datos',
    '/admin/impagos', '/admin/pagos', '/admin/catalogo', '/admin/correos', '/admin/seguridad'],
  trabajador: ['/trabajador/agenda', ...(idOrden ? [`/trabajador/ordenes/${idOrden}`] : []), '/trabajador/seguridad'],
  cliente: ['/cliente/cuenta', '/cliente/plantas', '/cliente/mantenciones', '/cliente/solicitudes', '/cliente/datos'],
};

const REVISION = `(() => {
  const ancho = document.documentElement.clientWidth;
  const desborde = document.documentElement.scrollWidth - ancho;
  const culpables = desborde > 1 ? [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > ancho + 1 && getComputedStyle(e).position !== 'fixed'; })
    .slice(0, 4).map((e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : '')) : [];
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const nombre = (e) => (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || '').trim() || [...e.querySelectorAll('img[alt],svg[aria-label]')].map((i) => i.getAttribute('alt') || i.getAttribute('aria-label')).join('').trim()
    || (e.getAttribute('aria-labelledby') ? (document.getElementById(e.getAttribute('aria-labelledby'))?.textContent || '').trim() : '');
  const sinNombre = [...document.querySelectorAll('button, a[href], [role=button]')].filter(visible).filter((e) => !nombre(e)).map((e) => e.outerHTML.slice(0, 80));
  const controles = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')].filter(visible);
  const sinEtiqueta = controles.filter((c) => !(c.labels && c.labels.length) && !c.getAttribute('aria-label') && !c.getAttribute('aria-labelledby') && !c.getAttribute('title')).map((c) => c.outerHTML.slice(0, 80));
  const imgSinAlt = [...document.querySelectorAll('img:not([alt])')].map((i) => i.src.slice(-40));
  // Contraste WCAG 2.1 (1.4.3) del texto sobre fondo liso; si hay imagen o degradado detrás, no se puede calcular
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fondo = (e) => { for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none') return null; const c = rgb(s.backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] >= 0.99)) return c.slice(0, 3); if (c.length === 4 && c[3] > 0) return null; } return [255, 255, 255]; };
  const fallasContraste = []; let revisados = 0, noVerificables = 0;
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(e); const fg = rgb(s.color); if (fg.length === 4 && fg[3] < 1) { noVerificables++; continue; }
    const bg = fondo(e); if (!bg) { noVerificables++; continue; }
    revisados++;
    const [a, b] = [lum(fg.slice(0, 3)), lum(bg)]; const razon = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const px = parseFloat(s.fontSize); const grande = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    if (razon < (grande ? 3 : 4.5)) fallasContraste.push(razon.toFixed(2) + ' «' + e.textContent.trim().slice(0, 30) + '»');
  }
  const niveles = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => +h.tagName[1]);
  const saltos = niveles.filter((n, i) => i > 0 && n > niveles[i - 1] + 1).length;
  return { desborde, culpables, lang: document.documentElement.lang, titulo: document.title, sinNombre, sinEtiqueta, imgSinAlt,
    contraste: { revisados, noVerificables, fallas: fallasContraste.slice(0, 6), total: fallasContraste.length }, h1: niveles.filter((n) => n === 1).length, saltos,
    textoBase: parseFloat(getComputedStyle(document.body).fontSize) };
})()`;

const revision = [];
for (const [rol, rutas] of Object.entries(RUTAS)) {
  await fijarToken(rol === 'publico' ? null : TOKENS[rol]);
  for (const ancho of [360, 1280]) {
    await (ancho === 360 ? movil(360) : cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }));
    for (const ruta of rutas) {
      await ir(LOCAL + ruta, 1200);
      const r = await evaluar(REVISION);
      revision.push({ rol, ruta, ancho, ...r });
    }
  }
}
for (const r of revision.filter((x) => x.ancho === 360)) {
  const marcas = [r.desborde > 1 ? `DESBORDE ${r.desborde}px ${r.culpables.join(',')}` : '360 OK', `contraste ${r.contraste.total}/${r.contraste.revisados}`,
    r.sinNombre.length ? `sin nombre ${r.sinNombre.length}` : '', r.sinEtiqueta.length ? `sin etiqueta ${r.sinEtiqueta.length}` : '', r.imgSinAlt.length ? `img sin alt ${r.imgSinAlt.length}` : '', r.h1 !== 1 ? `h1=${r.h1}` : '', r.saltos ? `saltos ${r.saltos}` : ''].filter(Boolean);
  console.log(`[${r.rol}] ${r.ruta}: ${marcas.join(' · ')}`);
}
const de1280 = revision.filter((x) => x.ancho === 1280 && (x.contraste.total || x.sinNombre.length || x.sinEtiqueta.length));
for (const r of de1280) console.log(`[1280 ${r.rol}] ${r.ruta}: contraste ${r.contraste.total} ${r.contraste.fallas.join(' | ')} · sin nombre ${r.sinNombre.length} · sin etiqueta ${r.sinEtiqueta.length}`);

writeFileSync(SALIDA, JSON.stringify({ fecha: new Date().toISOString(), carga, revision }, null, 2));
ws.close(); edge.kill();
process.exit(0);
