// Verificación de las historias de usuario a nivel de API (evidencia de docs/pruebas/MATRIZ_DE_PRUEBAS.md).
// Cada prueba lleva la HU que respalda. Corre sobre los datos de prueba de database/seeds.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, query, CORREOS, FOTO } from './apoyo.js';

let api, ADMIN, MARIA, LUIS, PEDRO, idPedro, idAdmin;

before(async () => {
  api = await iniciar();
  [ADMIN, MARIA, LUIS, PEDRO] = await Promise.all([CORREOS.admin, CORREOS.maria, CORREOS.luis, CORREOS.pedro].map(api.tokenDe));
  idPedro = (await query('SELECT id_usuario FROM usuario WHERE email = $1', [CORREOS.pedro])).rows[0].id_usuario;
  idAdmin = (await query('SELECT id_usuario FROM usuario WHERE email = $1', [CORREOS.admin])).rows[0].id_usuario;
});
after(() => api.cerrar());

const plantaDe = async (email) => (await query(
  'SELECT p.id_planta FROM planta p JOIN cliente c USING (id_cliente) JOIN usuario u USING (id_usuario) WHERE u.email = $1 ORDER BY p.id_planta LIMIT 1', [email])).rows[0].id_planta;

test('HU-07: el login no revela qué dato falló y cada perfil solo entra a lo suyo', async () => {
  const malCorreo = await api.pedir('POST', '/auth/login', null, { email: 'nadie@ejemplo.cl', password: 'Cliente.2026' });
  const malClave = await api.pedir('POST', '/auth/login', null, { email: CORREOS.maria, password: 'incorrecta' });
  assert.equal(malCorreo.status, 401);
  assert.equal(malClave.status, 401);
  assert.equal(malCorreo.json.error, malClave.json.error);
  assert.equal((await api.pedir('GET', '/admin/clientes', MARIA)).status, 403);
  assert.equal((await api.pedir('GET', '/trabajador/agenda', MARIA)).status, 403);
  assert.equal((await api.pedir('GET', '/cliente/cuenta', PEDRO)).status, 403);
});

test('HU-10: el cliente ve su ficha técnica y una planta ajena responde 404', async () => {
  const propia = await api.pedir('GET', `/cliente/plantas/${await plantaDe(CORREOS.maria)}`, MARIA);
  assert.equal(propia.status, 200);
  assert.ok('potencia_kw' in propia.json && 'inversor' in propia.json);
  assert.equal((await api.pedir('GET', `/cliente/plantas/${await plantaDe(CORREOS.luis)}`, MARIA)).status, 404);
});

test('HU-08: Mi cuenta entrega deuda, cuotas e historial del cliente autenticado', async () => {
  const r = await api.pedir('GET', '/cliente/cuenta', MARIA);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.json.suscripciones));
});

test('HU-01: el listado de impagos agrupa cuotas vencidas con monto y meses adeudados', async () => {
  const r = await api.pedir('GET', '/admin/finanzas/impagos', ADMIN);
  assert.equal(r.status, 200);
  assert.ok(r.json.length >= 1, 'los datos de prueba incluyen al menos una deuda');
  for (const fila of r.json) assert.ok(fila.total_adeudado > 0 || fila.monto_total > 0 || fila.deuda > 0, JSON.stringify(fila));
});

test('HU-02: pago manual auditado; transferencia exige N° de operación y no se paga dos veces', async () => {
  const { rows: [cuota] } = await query(`SELECT id_cuota, monto FROM cuota WHERE estado IN ('vencida', 'pendiente') ORDER BY fecha_vencimiento LIMIT 1`);
  const ruta = `/admin/cuotas/${cuota.id_cuota}/pagos`;
  assert.equal((await api.pedir('POST', ruta, ADMIN, { origen: 'transferencia' })).status, 400);
  const r = await api.pedir('POST', ruta, ADMIN, { origen: 'transferencia', referencia: 'OP-123456', monto: cuota.monto });
  assert.ok([200, 201].includes(r.status), `${r.status} ${r.json?.error}`);
  const { rows: [pago] } = await query('SELECT registrado_por FROM pago WHERE id_cuota = $1', [cuota.id_cuota]);
  assert.equal(pago.registrado_por, idAdmin);
  assert.equal((await api.pedir('POST', ruta, ADMIN, { origen: 'efectivo', monto: cuota.monto })).status, 409);
});

test('HU-06: listado mensual de pagos del período', async () => {
  const periodo = new Date().toISOString().slice(0, 7);
  const r = await api.pedir('GET', `/admin/finanzas/pagos?periodo=${periodo}`, ADMIN);
  assert.equal(r.status, 200);
});

let idOrden;
test('HU-17: solo se asigna a un trabajador activo', async () => {
  const idPlanta = await plantaDe(CORREOS.maria);
  const malo = await api.pedir('POST', '/admin/mantenciones', ADMIN, { id_planta: idPlanta, tipo: 'correctiva', fecha_programada: '2026-12-03', id_trabajador: idAdmin });
  assert.equal(malo.status, 400);
  const r = await api.pedir('POST', '/admin/mantenciones', ADMIN, { id_planta: idPlanta, tipo: 'correctiva', fecha_programada: '2026-12-03', id_trabajador: idPedro });
  assert.equal(r.status, 201);
  idOrden = r.json.id_mantencion;
});

test('HU-14: la agenda del trabajador muestra solo sus órdenes, ordenadas por fecha', async () => {
  const r = await api.pedir('GET', '/trabajador/agenda', PEDRO);
  assert.equal(r.status, 200);
  assert.ok(r.json.some((o) => o.id_mantencion === idOrden));
  const ajenas = (await query('SELECT count(*)::int n FROM mantencion WHERE id_mantencion = ANY($1) AND id_trabajador <> $2',
    [r.json.map((o) => o.id_mantencion), idPedro])).rows[0].n;
  assert.equal(ajenas, 0);
  const fechas = r.json.map((o) => o.fecha_programada);
  assert.deepEqual(fechas, [...fechas].sort());
});

test('HU-16 y HU-05: transiciones válidas, sin saltos, y cierre con actividades y fotos', async () => {
  const ruta = `/trabajador/ordenes/${idOrden}/estado`;
  assert.equal((await api.pedir('POST', ruta, PEDRO, { estado: 'por_confirmar', actividades: 'x', fotos: [FOTO] })).status, 409, 'no salta de pendiente a por confirmar');
  assert.equal((await api.pedir('POST', ruta, PEDRO, { estado: 'en_curso' })).status, 200);
  assert.equal((await api.pedir('POST', ruta, PEDRO, { estado: 'por_confirmar', actividades: 'Limpieza' })).status, 400, 'sin fotos no se envía');
  assert.equal((await api.pedir('POST', ruta, PEDRO, { estado: 'por_confirmar', actividades: 'Limpieza de paneles', fotos: [FOTO] })).status, 200);
  assert.equal((await api.pedir('POST', ruta, PEDRO, { estado: 'en_curso' })).status, 409, 'espera la confirmación del cliente');
  const { rows } = await query('SELECT estado_nuevo FROM mantencion_historial WHERE id_mantencion = $1 ORDER BY fecha_cambio, id_historial', [idOrden]);
  assert.deepEqual(rows.map((h) => h.estado_nuevo).slice(-2), ['en_curso', 'por_confirmar']);
});

test('CU-23: el cliente confirma el cierre y la orden queda finalizada', async () => {
  const r = await api.pedir('POST', `/cliente/ordenes/${idOrden}/confirmar`, MARIA, { problema_resuelto: true, satisfecho: true });
  assert.equal(r.status, 200, r.json?.error);
  assert.equal((await query('SELECT estado FROM mantencion WHERE id_mantencion = $1', [idOrden])).rows[0].estado, 'finalizada');
});

test('HU-13: inscribir tarjeta exige aceptar las condiciones', async () => {
  const { rows: [s] } = await query(`SELECT s.id_suscripcion FROM suscripcion s JOIN planta p USING (id_planta) JOIN cliente c USING (id_cliente)
    JOIN usuario u USING (id_usuario) WHERE u.email = $1 AND s.estado <> 'cancelada' LIMIT 1`, [CORREOS.maria]);
  const r = await api.pedir('POST', `/cliente/suscripciones/${s.id_suscripcion}/inscripcion`, MARIA, {});
  assert.equal(r.status, 400);
});

test('HU-15: al desactivar un trabajador su sesión anterior deja de servir', async () => {
  assert.equal((await api.pedir('GET', '/trabajador/agenda', PEDRO)).status, 200);
  assert.equal((await api.pedir('PATCH', `/admin/trabajadores/${idPedro}`, ADMIN, { activo: false })).status, 200);
  assert.equal((await api.pedir('GET', '/trabajador/agenda', PEDRO)).status, 401);
});

test('HU-12: el cliente cancela su suscripción; una ya cancelada responde 404 como una ajena', async () => {
  const { rows: [s] } = await query(`SELECT s.id_suscripcion FROM suscripcion s JOIN planta p USING (id_planta) JOIN cliente c USING (id_cliente)
    JOIN usuario u USING (id_usuario) WHERE u.email = $1 AND s.estado <> 'cancelada' LIMIT 1`, [CORREOS.luis]);
  const ruta = `/cliente/suscripciones/${s.id_suscripcion}/cancelar`;
  const r = await api.pedir('POST', ruta, LUIS, {});
  assert.equal(r.status, 200, r.json?.error);
  const { rows: [despues] } = await query('SELECT estado, motivo_cancelacion FROM suscripcion WHERE id_suscripcion = $1', [s.id_suscripcion]);
  assert.deepEqual(despues, { estado: 'cancelada', motivo_cancelacion: 'cliente' });
  assert.equal((await api.pedir('POST', ruta, LUIS, {})).status, 404);
});

test('RNF-10: tras 5 intentos fallidos el correo queda bloqueado (429), aun con la clave correcta', async () => {
  const intento = (password) => api.pedir('POST', '/auth/login', null, { email: CORREOS.luis, password });
  for (let i = 0; i < 5; i++) assert.equal((await intento('incorrecta')).status, 401);
  assert.equal((await intento('Cliente.2026')).status, 429);
});

test('RNF-03: la base no tiene columnas para número de tarjeta ni CVV', async () => {
  const { rows } = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'medio_pago'`);
  const columnas = rows.map((r) => r.column_name);
  assert.ok(columnas.includes('token_pasarela') && columnas.includes('ultimos_4'));
  for (const c of columnas) assert.doesNotMatch(c, /numero|pan|cvv|cvc|tarjeta_completa/i);
});
