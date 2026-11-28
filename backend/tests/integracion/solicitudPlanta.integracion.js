// CU-36 · Solicitud de nueva planta, de punta a punta (cliente → administrador → cliente)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, query, CORREOS } from './apoyo.js';

let api, ADMIN, MARIA, LUIS, PEDRO, idComuna, idCliente, plantasAntes, direccionExistente;
const ficha = { inversor: 'Huawei SUN2000', paneles: '10 x 450 W', fecha_instalacion: '2026-10-15' };

before(async () => {
  api = await iniciar();
  [ADMIN, MARIA, LUIS, PEDRO] = await Promise.all([CORREOS.admin, CORREOS.maria, CORREOS.luis, CORREOS.pedro].map(api.tokenDe));
  idComuna = (await query(`SELECT id_comuna FROM comuna WHERE nombre = 'Calama'`)).rows[0].id_comuna;
  idCliente = (await query('SELECT c.id_cliente FROM cliente c JOIN usuario u USING (id_usuario) WHERE u.email = $1', [CORREOS.maria])).rows[0].id_cliente;
  plantasAntes = (await query('SELECT count(*)::int n FROM planta WHERE id_cliente = $1', [idCliente])).rows[0].n;
  direccionExistente = (await query('SELECT direccion FROM planta WHERE id_cliente = $1 LIMIT 1', [idCliente])).rows[0].direccion;
});
after(() => api.cerrar());

const solicitar = (token, cuerpo) => api.pedir('POST', '/cliente/solicitudes-planta', token, cuerpo);
let idA, idB;

test('el cliente envía una solicitud válida y queda pendiente', async () => {
  const r = await solicitar(MARIA, { id_comuna: idComuna, direccion: 'Parcela 7, Chiu Chiu', potencia_kw: 4.5, tiene_baterias: true });
  assert.equal(r.status, 201);
  assert.equal(r.json.estado, 'pendiente');
  idA = r.json.id_solicitud_planta;
});

test('rechaza duplicados, direcciones propias, comunas inexistentes y datos inválidos', async () => {
  assert.equal((await solicitar(MARIA, { id_comuna: idComuna, direccion: '  parcela 7,  CHIU chiu ' })).status, 409);
  assert.equal((await solicitar(MARIA, { id_comuna: idComuna, direccion: direccionExistente.toUpperCase() })).status, 409);
  assert.equal((await solicitar(MARIA, { id_comuna: 999999, direccion: 'Calle Inexistente 1' })).status, 400);
  const r = await solicitar(MARIA, { direccion: 'x' });
  assert.equal(r.status, 400);
  assert.equal(r.json.detalles.length, 2);
});

test('limita a 3 solicitudes pendientes por cliente', async () => {
  idB = (await solicitar(MARIA, { id_comuna: idComuna, direccion: 'Sitio 2, Lasana' })).json.id_solicitud_planta;
  await solicitar(MARIA, { id_comuna: idComuna, direccion: 'Sitio 3, Lasana' });
  assert.equal((await solicitar(MARIA, { id_comuna: idComuna, direccion: 'Sitio 4, Lasana' })).status, 409);
});

test('aísla clientes y roles', async () => {
  assert.deepEqual((await api.pedir('GET', '/cliente/solicitudes-planta', LUIS)).json, []);
  assert.equal((await api.pedir('GET', '/admin/solicitudes-planta', PEDRO)).status, 403);
  assert.equal((await solicitar(ADMIN, { id_comuna: idComuna, direccion: 'Calle Admin 1' })).status, 403);
});

test('el administrador ve la bandeja y aprueba con ficha técnica completa', async () => {
  const bandeja = await api.pedir('GET', '/admin/solicitudes-planta?estado=pendiente', ADMIN);
  assert.equal(bandeja.json.length, 3);
  const sinFicha = await api.pedir('POST', `/admin/solicitudes-planta/${idA}/aprobar`, ADMIN, { inversor: 'X', paneles: 'Y' });
  assert.equal(sinFicha.status, 400);
  const r = await api.pedir('POST', `/admin/solicitudes-planta/${idA}/aprobar`, ADMIN, ficha);
  assert.equal(r.status, 200);
  assert.equal(r.json.estado, 'aprobada');
  const { rows: [planta] } = await query('SELECT * FROM planta WHERE id_planta = $1', [r.json.id_planta]);
  assert.equal(planta.id_cliente, idCliente);
  assert.equal(planta.direccion, 'Parcela 7, Chiu Chiu');
  assert.equal((await api.pedir('POST', `/admin/solicitudes-planta/${idA}/aprobar`, ADMIN, ficha)).status, 409);
});

test('rechazar exige motivo y el cliente lo ve', async () => {
  assert.equal((await api.pedir('POST', `/admin/solicitudes-planta/${idB}/rechazar`, ADMIN, {})).status, 400);
  const r = await api.pedir('POST', `/admin/solicitudes-planta/${idB}/rechazar`, ADMIN, { respuesta: 'La dirección corresponde a otra instalación' });
  assert.equal(r.json.estado, 'rechazada');
  const mias = (await api.pedir('GET', '/cliente/solicitudes-planta', MARIA)).json;
  assert.match(mias.find((s) => s.id_solicitud_planta === idB).respuesta, /^La dirección/);
  assert.equal((await api.pedir('GET', '/cliente/plantas', MARIA)).json.length, plantasAntes + 1);
  assert.equal((await solicitar(MARIA, { id_comuna: idComuna, direccion: 'Sitio 2, Lasana' })).status, 201);
});

test('la aprobación puede crear la suscripción si el cliente ya contrató el plan', async () => {
  const id = (await solicitar(LUIS, { id_comuna: idComuna, direccion: 'Sitio A, Toconce', potencia_kw: 4 })).json.id_solicitud_planta;
  const invalido = await api.pedir('POST', `/admin/solicitudes-planta/${id}/aprobar`, ADMIN, { ...ficha, suscripcion: { monto_mensual: 1, dia_cobro: 40 } });
  assert.equal(invalido.status, 400);
  assert.equal(invalido.json.detalles.length, 2);
  const r = await api.pedir('POST', `/admin/solicitudes-planta/${id}/aprobar`, ADMIN, { ...ficha, suscripcion: { monto_mensual: 15000, dia_cobro: 5 } });
  assert.equal(r.status, 200);
  assert.equal(r.json.suscripcion.estado, 'al_dia');
  assert.equal(r.json.suscripcion.monto_mensual, 15000);
});
