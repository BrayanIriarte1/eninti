import { useCallback, useEffect, useState } from 'react';
import { descartarIntento, ejecutarCobroAutomatico, estadoCobroAutomatico } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { formatoPesos } from '../../../shared/utils/formato.js';

const ORIGEN = { programado: 'Automática', manual: 'Desde el panel', externo: 'Cron externo' };
const fechaHora = (iso) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

const contar = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function resumen(r) {
  if (!r) return '';
  const partes = [
    contar(r.cuotas_generadas, 'cuota nueva', 'cuotas nuevas'),
    contar(r.aprobados, 'cobro aprobado', 'cobros aprobados'),
  ];
  if (r.rechazados) partes.push(contar(r.rechazados, 'rechazado', 'rechazados'));
  if (r.pendientes) partes.push(`${r.pendientes} en espera`);
  if (r.errores) partes.push(contar(r.errores, 'error de conexión', 'errores de conexión'));
  if (r.intentos === 0 && r.cuotas_generadas === 0) return 'Sin cuotas nuevas ni cobros pendientes';
  return partes.join(' · ');
}

// Cobro mensual automático (HU-13): estado de la tarea diaria, su historial, los cobros
// que la pasarela dejó en espera y el botón para ejecutarla ahora.
export default function CobroAutomaticoPanel({ onEjecutado }) {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => estadoCobroAutomatico().then(setEstado).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  async function ejecutar() {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const r = await ejecutarCobroAutomatico();
      setAviso(`Período ${r.periodo}: ${resumen(r)}.`);
      await cargar();
      onEjecutado?.();
    } catch (err) { setError(err); } finally { setOcupado(false); }
  }

  async function descartar(intento) {
    if (!window.confirm(`¿Confirmas en el panel de la pasarela que el cobro de ${intento.cliente} (${intento.periodo}) NO se realizó? La cuota se volverá a cobrar.`)) return;
    setError(null);
    try {
      await descartarIntento(intento.id_intento);
      await cargar();
    } catch (err) { setError(err); }
  }

  if (!estado) return error ? <Mensaje error={error} /> : <p className="cargando">Cargando cobro automático…</p>;

  const ultima = estado.ultimas[0];
  const hora = `${String(estado.hora).padStart(2, '0')}:00`;

  return (
    <article className={`tarjeta cobro-auto ${estado.activo ? '' : 'inactivo'}`}>
      <div className="cobro-auto-cabeza">
        <span className={`cobro-auto-icono ${estado.activo ? '' : 'apagado'}`}><Icono nombre="suscripcion" tamano={22} /></span>
        <div>
          <h2>Cobro automático</h2>
          <p className="texto-suave">
            {estado.activo
              ? <>Todos los días desde las <strong>{hora}</strong> (hora de Chile) se generan las cuotas del mes y se cobran las que vencen a quienes tienen tarjeta inscrita.</>
              : <>Está desactivado (<code>COBRO_AUTOMATICO=false</code>). Usa las operaciones manuales.</>}
          </p>
        </div>
        <span className={`etiqueta ${!estado.activo ? 'neutro' : estado.hoy_listo ? 'ok' : 'aviso'}`}>
          {!estado.activo ? 'Desactivado' : estado.hoy_listo ? 'Hoy: listo' : 'Hoy: por ejecutar'}
        </span>
      </div>

      <Mensaje error={error} />
      {aviso && <p className="mensaje-ok" role="status">{aviso}</p>}

      {ultima ? (
        <div className={`cobro-auto-ultima ${ultima.estado}`}>
          <strong>Última ejecución:</strong> {fechaHora(ultima.inicio)} · {ORIGEN[ultima.origen]}
          <div>
            {ultima.estado === 'ok' ? resumen(ultima.resultado)
              : ultima.estado === 'error' ? `Falló: ${ultima.error}` : 'En curso…'}
          </div>
        </div>
      ) : (
        <p className="texto-suave">Aún no se ha ejecutado.</p>
      )}

      {estado.en_espera.length > 0 && (
        <div className="cobro-auto-espera">
          <h3><Icono nombre="impagos" tamano={18} /> Cobros en espera de la pasarela</h3>
          <p className="texto-suave">
            La pasarela no confirmó estos cobros. No se vuelven a intentar para no cobrar dos veces:
            revísalos en el panel de la pasarela. Si se cobraron, registra el pago en Impagos; si no, descártalos.
          </p>
          <ul className="pendientes">
            {estado.en_espera.map((i) => (
              <li key={i.id_intento}>
                <span className="pendiente">
                  <span className="pendiente-icono aviso"><Icono nombre="pagos" tamano={18} /></span>
                  <span>
                    <strong>{i.cliente} · {i.periodo}</strong>
                    <small>{formatoPesos(i.monto)} · {fechaHora(i.fecha)}{i.referencia ? ` · Ref. ${i.referencia}` : ''}</small>
                  </span>
                  <button type="button" className="boton secundario" onClick={() => descartar(i)}>No se cobró</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="acciones">
        <button type="button" className="boton" disabled={ocupado} onClick={ejecutar} aria-busy={ocupado}>
          {ocupado ? 'Ejecutando…' : 'Ejecutar ahora'}
        </button>
      </div>

      {estado.ultimas.length > 1 && (
        <details className="cobro-auto-historial">
          <summary>Ejecuciones anteriores</summary>
          <ul>
            {estado.ultimas.slice(1).map((e) => (
              <li key={e.id_ejecucion}>
                <span className={`etiqueta ${e.estado === 'ok' ? 'ok' : e.estado === 'error' ? 'alerta' : 'aviso'}`}>
                  {e.estado === 'ok' ? 'Bien' : e.estado === 'error' ? 'Error' : 'En curso'}
                </span>
                {fechaHora(e.inicio)} · {ORIGEN[e.origen]} — {e.estado === 'ok' ? resumen(e.resultado) : e.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
