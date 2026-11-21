import { useCallback, useEffect, useState } from 'react';
import { listarCambiosDatos, aprobarCambioDatos, rechazarCambioDatos } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

const ESTADO = {
  pendiente: { texto: 'Pendiente', clase: 'aviso' },
  aprobada: { texto: 'Aprobada', clase: 'ok' },
  rechazada: { texto: 'Rechazada', clase: 'alerta' },
};

function Cambio({ antes, despues }) {
  return <dd><span className="tachado">{antes ?? '—'}</span> → <strong>{despues}</strong></dd>;
}

// Cambios de correo o teléfono pedidos por los clientes; se aplican al aprobar
export default function CambiosDatosPage() {
  const [estado, setEstado] = useState('pendiente');
  const [solicitudes, setSolicitudes] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    return listarCambiosDatos(estado).then(setSolicitudes).catch(setError).finally(() => setCargando(false));
  }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);

  async function resolver(s, aprobar) {
    const respuesta = (respuestas[s.id_solicitud_cambio] ?? '').trim();
    if (!aprobar && !respuesta) {
      setError({ message: 'Escribe el motivo del rechazo para el cliente' });
      return;
    }
    setEnviando(s.id_solicitud_cambio);
    setError(null);
    try {
      if (aprobar) await aprobarCambioDatos(s.id_solicitud_cambio, respuesta || undefined);
      else await rechazarCambioDatos(s.id_solicitud_cambio, respuesta);
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Cambios de datos</h1>
        <div className="segmentado" role="group" aria-label="Filtrar por estado">
          {[['pendiente', 'Pendientes'], ['', 'Todas']].map(([v, t]) => (
            <button key={t} type="button" className={estado === v ? 'activo' : ''} onClick={() => setEstado(v)}>{t}</button>
          ))}
        </div>
      </div>
      <p className="texto-suave">Los clientes piden cambiar su correo o su teléfono. Al aprobar, el cambio se aplica de inmediato.</p>
      <Mensaje error={error} />
      {cargando && <p className="cargando">Cargando…</p>}
      {!cargando && solicitudes.length === 0 && (
        <div className="tarjeta vacio"><Icono nombre="ok" tamano={30} /><p>No hay solicitudes {estado ? 'pendientes' : ''}.</p></div>
      )}

      <div className="columnas">
        {solicitudes.map((s) => (
          <article key={s.id_solicitud_cambio} className="tarjeta">
            <div className="encabezado">
              <h2 style={{ margin: 0 }}>{s.cliente}</h2>
              <span className={`etiqueta ${ESTADO[s.estado].clase}`}>{ESTADO[s.estado].texto}</span>
            </div>
            <dl className="ficha">
              <div><dt>RUT</dt><dd>{s.rut}</dd></div>
              {s.email_nuevo && <div><dt>Correo</dt><Cambio antes={s.estado === 'pendiente' ? s.email_actual : null} despues={s.email_nuevo} /></div>}
              {s.telefono_nuevo && <div><dt>Teléfono</dt><Cambio antes={s.estado === 'pendiente' ? s.telefono_actual : null} despues={s.telefono_nuevo} /></div>}
              <div><dt>Motivo</dt><dd>{s.motivo}</dd></div>
              <div><dt>Solicitada</dt><dd>{formatoFecha(s.fecha_solicitud.slice(0, 10))}</dd></div>
              {s.respuesta && <div><dt>Respuesta</dt><dd>{s.respuesta}</dd></div>}
              {s.resuelta_por_nombre && <div><dt>Resuelta por</dt><dd>{s.resuelta_por_nombre}</dd></div>}
            </dl>
            {s.estado === 'pendiente' && (
              <>
                <label style={{ marginTop: '1rem' }}>
                  Mensaje para el cliente <span className="opcional">(obligatorio si rechazas)</span>
                  <textarea rows={2} maxLength={300} value={respuestas[s.id_solicitud_cambio] ?? ''}
                    onChange={(e) => setRespuestas({ ...respuestas, [s.id_solicitud_cambio]: e.target.value })} />
                </label>
                <div className="acciones">
                  <button className="boton" disabled={enviando === s.id_solicitud_cambio} onClick={() => resolver(s, true)}>Aprobar y aplicar</button>
                  <button className="boton peligro" disabled={enviando === s.id_solicitud_cambio} onClick={() => resolver(s, false)}>Rechazar</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
