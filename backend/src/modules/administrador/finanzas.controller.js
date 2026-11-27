// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → finanzas.service.js / pagos/cobroAutomatico.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as cobroAutomatico from '../pagos/cobroAutomatico.js';
import * as finanzas from './finanzas.service.js';
import { ZONA_HORARIA } from '../../config/db.js';
import { parseId } from './plantas.controller.js';

// [CU-18] GET /api/admin/finanzas/impagos
export async function impagos(_req, res) {
  res.json(await finanzas.impagos());
}

// [CU-22] GET /api/admin/suscripciones/:id/cuotas
export async function cuotasDeSuscripcion(req, res) {
  res.json(await finanzas.cuotasDeSuscripcion(parseId(req.params.id)));
}

// [CU-22] POST /api/admin/cuotas/:id/pagos → 201 (req.usuario.id = quién registró)
export async function registrarPagoManual(req, res) {
  res.status(201).json(await finanzas.registrarPagoManual(parseId(req.params.id), req.body ?? {}, req.usuario.id));
}

// [CU-19] GET /api/admin/finanzas/pagos?periodo=YYYY-MM[&formato=csv]
// Listado mensual (HU-06). Con ?formato=csv descarga el archivo para el contador.
export async function pagosDelMes(req, res) {
  const pagos = await finanzas.pagosDelMes(req.query.periodo);
  if (req.query.formato !== 'csv') return res.json(pagos);

  const columnas = ['fecha_pago', 'cliente', 'rut', 'monto', 'origen', 'referencia', 'periodo', 'direccion'];
  // Comillas dobles escapadas y fórmulas neutralizadas (=, +, -, @) para que Excel no las ejecute
  const escapar = (v) => {
    let t = String(v ?? '');
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return `"${t.replaceAll('"', '""')}"`;
  };
  const fecha = (v) => new Date(v).toLocaleString('es-CL', { timeZone: ZONA_HORARIA });
  const lineas = [
    columnas.join(';'),
    ...pagos.map((p) => columnas.map((c) => escapar(c === 'fecha_pago' ? fecha(p[c]) : p[c])).join(';')),
  ];

  res
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="pagos-${req.query.periodo}.csv"`)
    // BOM para que Excel reconozca las tildes
    .send('﻿' + lineas.join('\r\n'));
}

// [CU-20] POST /api/admin/finanzas/generar-cuotas
export async function generarCuotas(req, res) {
  res.json(await finanzas.generarCuotas(req.body ?? {}));
}

// [CU-20] POST /api/admin/finanzas/procesar-cargos
export async function procesarCargos(_req, res) {
  res.json(await finanzas.procesarCargos({ origen: 'manual' }));
}

// [CU-34] GET /api/admin/finanzas/cobro-automatico
// Cobro automático: estado, ejecución desde el panel y cobros en espera de la pasarela
export async function estadoCobroAutomatico(_req, res) {
  res.json({ ...(await cobroAutomatico.estado()), en_espera: await finanzas.cobrosEnEspera() });
}

// [CU-34] POST /api/admin/finanzas/cobro-automatico/ejecutar
export async function ejecutarCobroAutomatico(_req, res) {
  res.json(await cobroAutomatico.ejecutarCobroDiario({ origen: 'manual', forzar: true }));
}

// [CU-34] POST /api/admin/finanzas/intentos/:id/descartar
export async function descartarIntento(req, res) {
  res.json(await finanzas.descartarIntento(parseId(req.params.id)));
}
