// CU-34 · COBRO AUTOMÁTICO DIARIO: genera cuotas del mes, cobra y aplica reglas de deuda una vez al día.
import { pool, query, ZONA_HORARIA } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { generarCuotas, procesarCargos } from '../administrador/finanzas.service.js';

// Cobro mensual automático (HU-13): una vez al día, desde la hora configurada (hora de Chile):
//   1. genera las cuotas del mes en curso (idempotente: no duplica las ya generadas),
//   2. cobra en la pasarela las cuotas que vencen hoy o antes a quien tiene tarjeta inscrita.
// Cada ejecución queda en ejecucion_tarea. Se dispara de tres formas, todas seguras de repetir:
//   · el reloj interno del servidor (revisa cada hora y al iniciar),
//   · un cron externo (POST /api/tareas/cobro-diario con CRON_SECRET), útil en hostings que
//     «duermen» el servidor sin tráfico, como el plan gratuito de Render,
//   · el botón «Ejecutar ahora» del panel de pagos.
// Configuración: COBRO_AUTOMATICO=false lo desactiva; COBRO_HORA (0-23, por defecto 9).
export const TAREA = 'cobro_diario';
const LLAVE_CANDADO_TAREA = 731002;
const CADA_MS = 60 * 60 * 1000;

export const activo = () => process.env.COBRO_AUTOMATICO !== 'false';
export function horaCobro() {
  const h = Number(process.env.COBRO_HORA ?? 9);
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : 9;
}

// Hora actual en Chile (0-23), sin depender de la zona del servidor
export function horaLocal(fecha = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, hour: 'numeric', hourCycle: 'h23' }).format(fecha));
}

// ¿Corresponde ejecutar ahora? Desde la hora de cobro y si hoy aún no terminó bien
export const tocaEjecutar = ({ hora, hoyListo, horaDeCobro }) => hora >= horaDeCobro && !hoyListo;

async function yaSeEjecutoHoy() {
  const { rows } = await query(
    `SELECT 1 FROM ejecucion_tarea WHERE tarea = $1 AND estado = 'ok' AND inicio::date = CURRENT_DATE LIMIT 1`,
    [TAREA],
  );
  return rows.length > 0;
}

// [CU-34]
// Ejecuta la tarea diaria. forzar = true la ejecuta aunque ya se haya hecho hoy (botón del panel).
export async function ejecutarCobroDiario({ origen = 'programado', forzar = false } = {}) {
  const guardia = await pool.connect();
  let idEjecucion = null;
  try {
    const { rows: [{ ok }] } = await guardia.query('SELECT pg_try_advisory_lock($1) AS ok', [LLAVE_CANDADO_TAREA]);
    if (!ok) throw new HttpError(409, 'El cobro automático ya se está ejecutando');
    try {
      if (!forzar && await yaSeEjecutoHoy()) return { omitida: true, motivo: 'Ya se ejecutó hoy' };

      // Una ejecución que quedó a medias (el servidor se reinició) se marca como interrumpida
      await query(
        `UPDATE ejecucion_tarea SET estado = 'error', fin = now(), error = 'Interrumpida: el servidor se reinició'
         WHERE tarea = $1 AND estado = 'en_curso'`,
        [TAREA],
      );
      const { rows: [inicio] } = await query(
        `INSERT INTO ejecucion_tarea (tarea, origen) VALUES ($1, $2)
         RETURNING id_ejecucion, to_char(CURRENT_DATE, 'YYYY-MM') AS periodo`,
        [TAREA, origen],
      );
      idEjecucion = inicio.id_ejecucion;

      const cuotas = await generarCuotas({ periodo: inicio.periodo });
      const cargos = await procesarCargos({ origen: 'automatico' });
      const resultado = {
        periodo: inicio.periodo,
        cuotas_generadas: cuotas.cuotas_generadas,
        intentos: cargos.intentos,
        aprobados: cargos.aprobados,
        rechazados: cargos.rechazados,
        pendientes: cargos.pendientes,
        errores: cargos.errores,
        en_espera: cargos.en_espera,
        canceladas_por_morosidad: cuotas.canceladas_por_morosidad ?? 0,
      };
      await query(
        `UPDATE ejecucion_tarea SET estado = 'ok', fin = now(), resultado = $2 WHERE id_ejecucion = $1`,
        [idEjecucion, resultado],
      );
      return { id_ejecucion: idEjecucion, ...resultado };
    } finally {
      await guardia.query('SELECT pg_advisory_unlock($1)', [LLAVE_CANDADO_TAREA]);
    }
  } catch (err) {
    if (idEjecucion) {
      await query(
        `UPDATE ejecucion_tarea SET estado = 'error', fin = now(), error = $2 WHERE id_ejecucion = $1`,
        [idEjecucion, String(err.message).slice(0, 500)],
      ).catch(() => {});
    }
    throw err;
  } finally {
    guardia.release();
  }
}

// [CU-34] Revisa periódicamente si ya toca ejecutar (COBRO_HORA, una vez al día).
// Reloj interno: revisa al iniciar y luego cada hora
export function programarCobroAutomatico() {
  if (!activo()) {
    console.log('Cobro automático desactivado (COBRO_AUTOMATICO=false)');
    return null;
  }
  const revisar = async () => {
    try {
      if (!tocaEjecutar({ hora: horaLocal(), hoyListo: await yaSeEjecutoHoy(), horaDeCobro: horaCobro() })) return;
      const r = await ejecutarCobroDiario();
      if (!r.omitida) {
        console.log(`Cobro automático ${r.periodo}: ${r.cuotas_generadas} cuotas generadas, ${r.aprobados} cobros aprobados, ${r.rechazados} rechazados`);
      }
    } catch (err) {
      if (err.status !== 409) console.error('Cobro automático:', err.message);
    }
  };
  setTimeout(revisar, 5000).unref(); // deja que la API termine de iniciar
  return setInterval(revisar, CADA_MS).unref();
}

// [CU-34] Lo que muestra CobroAutomaticoPanel.
// Estado para el panel de pagos
export async function estado() {
  const { rows } = await query(
    `SELECT id_ejecucion, origen, inicio, fin, estado, resultado, error
     FROM ejecucion_tarea WHERE tarea = $1 ORDER BY inicio DESC LIMIT 5`,
    [TAREA],
  );
  const hoyListo = rows.some((r) => r.estado === 'ok' && sameDay(r.inicio));
  return {
    activo: activo(),
    hora: horaCobro(),
    cron_externo: Boolean(process.env.CRON_SECRET),
    hoy_listo: hoyListo,
    ultimas: rows,
  };
}

function sameDay(fecha) {
  const f = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(d);
  return f(new Date(fecha)) === f(new Date());
}
