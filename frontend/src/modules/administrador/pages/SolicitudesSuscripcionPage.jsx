// ============================================================================
// PANTALLA: Suscripciones solicitadas · URL /admin/solicitudes-suscripcion · Rol: administrador
// Casos de uso: CU-28
// Datos: listar/aprobar/rechazarSolicitudSuscripcion() → solicitudesCliente.service.js
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarSolicitudesSuscripcion, aprobarSolicitudSuscripcion, rechazarSolicitudSuscripcion } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { formatoPesos, hoy, fechaDeMarca } from '../../../shared/utils/formato.js';

const MOTIVO = { cliente: 'la canceló el cliente', morosidad: 'cancelada por morosidad', administrador: 'la canceló la administración' };
const ESTADO = {
  pendiente: { texto: 'Pendiente', clase: 'aviso' },
  aprobada: { texto: 'Aprobada', clase: 'ok' },
  rechazada: { texto: 'Rechazada', clase: 'alerta' },
};

// [CU-28] Formulario para aprobar (cuota, día de cobro, inicio) o rechazar.
function Resolver({ solicitud, onListo }) {
  const [modo, setModo] = useState(null); // 'aprobar' | 'rechazar'
  const [monto, setMonto] = useState(String(solicitud.anterior?.monto_mensual ?? ''));
  const [dia, setDia] = useState(String(solicitud.anterior?.dia_cobro ?? 5));
  const [inicio, setInicio] = useState(hoy());
  const [respuesta, setRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      if (modo === 'aprobar') {
        await aprobarSolicitudSuscripcion(solicitud.id_solicitud_suscripcion, {
          monto_mensual: Number(monto), dia_cobro: Number(dia), fecha_inicio: inicio, respuesta: respuesta.trim() || undefined,
        });
      } else {
        await rechazarSolicitudSuscripcion(solicitud.id_solicitud_suscripcion, respuesta.trim());
      }
      await onListo();
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  if (!modo) {
    return (
      <div className="acciones">
        <button className="boton" onClick={() => setModo('aprobar')}>Aceptar y crear suscripción</button>
        <button className="boton secundario" onClick={() => setModo('rechazar')}>Rechazar</button>
      </div>
    );
  }
  return (
    <form className="formulario-simple" onSubmit={enviar} style={{ marginTop: '1rem' }}>
      <Mensaje error={error} />
      {modo === 'aprobar' && (
        <div className="fila" style={{ marginTop: 0 }}>
          <label>Cuota mensual<input type="number" min="1000" step="1" value={monto} onChange={(e) => setMonto(e.target.value)} required /></label>
          <label>Día de cobro<input type="number" min="1" max="28" value={dia} onChange={(e) => setDia(e.target.value)} required /></label>
          <label>Inicio<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></label>
        </div>
      )}
      <label>
        {modo === 'aprobar' ? <>Acuerdo o mensaje para el cliente <span className="opcional">(opcional)</span></> : 'Motivo o acuerdo pendiente (lo verá el cliente)'}
        <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={2} maxLength={500} required={modo === 'rechazar'}
          placeholder={modo === 'aprobar' ? 'Ej.: la deuda anterior se paga en 2 cuotas junto a la mensualidad' : 'Ej.: primero debe regularizar la deuda de $40.000'} />
      </label>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className={modo === 'aprobar' ? 'boton' : 'boton peligro'} disabled={enviando}>
          {enviando ? 'Guardando…' : modo === 'aprobar' ? 'Crear suscripción' : 'Rechazar solicitud'}
        </button>
        <button type="button" className="boton secundario" onClick={() => setModo(null)}>Volver</button>
      </div>
    </form>
  );
}

// Solicitudes de suscripción: solo la administración otorga suscripciones.
// Se ve la deuda del cliente y la suscripción anterior para decidir o acordar condiciones.
export default function SolicitudesSuscripcionPage() {
  const [estado, setEstado] = useState('pendiente');
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    return listarSolicitudesSuscripcion(estado).then(setSolicitudes).catch(setError).finally(() => setCargando(false));
  }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <section>
      <div className="encabezado">
        <h1>Solicitudes de suscripción</h1>
        <div className="segmentado" role="group" aria-label="Filtrar por estado">
          {[['pendiente', 'Pendientes'], ['', 'Todas']].map(([v, t]) => (
            <button key={t} type="button" className={estado === v ? 'activo' : ''} onClick={() => setEstado(v)}>{t}</button>
          ))}
        </div>
      </div>
      <p className="texto-suave">
        Un cliente que canceló o quedó cancelado por deuda debe pedir una nueva suscripción. Revisa su deuda y acepta o acuerda condiciones.
      </p>
      <Mensaje error={error} />
      {cargando && <p className="cargando">Cargando…</p>}
      {!cargando && solicitudes.length === 0 && (
        <div className="tarjeta vacio"><Icono nombre="ok" tamano={30} /><p>No hay solicitudes {estado ? 'pendientes' : ''}.</p></div>
      )}

      <div className="columnas">
        {solicitudes.map((s) => (
          <article key={s.id_solicitud_suscripcion} className="tarjeta">
            <div className="encabezado">
              <h2 style={{ margin: 0 }}>{s.cliente}</h2>
              <span className={`etiqueta ${ESTADO[s.estado].clase}`}>{ESTADO[s.estado].texto}</span>
            </div>
            <dl className="ficha">
              <div><dt>Planta</dt><dd><Link to={`/admin/plantas/${s.id_planta}`}>{s.direccion}</Link>, {s.comuna}</dd></div>
              <div><dt>RUT</dt><dd>{s.rut}</dd></div>
              {s.telefono && <div><dt>Teléfono</dt><dd><a href={`tel:${s.telefono}`}>{s.telefono}</a></dd></div>}
              <div><dt>Solicitada</dt><dd>{fechaDeMarca(s.fecha_solicitud)}</dd></div>
              <div>
                <dt>Deuda del cliente</dt>
                <dd className={s.deuda_cliente > 0 ? 'texto-alerta' : ''}>{s.deuda_cliente > 0 ? formatoPesos(s.deuda_cliente) : 'Sin deuda'}</dd>
              </div>
              {s.anterior && (
                <div>
                  <dt>Suscripción anterior</dt>
                  <dd>{formatoPesos(s.anterior.monto_mensual)}/mes{s.anterior.motivo_cancelacion ? `, ${MOTIVO[s.anterior.motivo_cancelacion]}` : ''}</dd>
                </div>
              )}
              {s.mensaje && <div><dt>Mensaje</dt><dd>{s.mensaje}</dd></div>}
              {s.respuesta && <div><dt>Respuesta</dt><dd>{s.respuesta}</dd></div>}
              {s.resuelta_por_nombre && <div><dt>Resuelta por</dt><dd>{s.resuelta_por_nombre}</dd></div>}
            </dl>
            {s.estado === 'pendiente' && <Resolver solicitud={s} onListo={cargar} />}
          </article>
        ))}
      </div>
    </section>
  );
}
