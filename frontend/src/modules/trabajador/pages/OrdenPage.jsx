import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerOrden, cambiarEstado } from '../services/trabajadorService.js';
import { enlaceMapa, EtiquetaOrden } from '../components/ordenUtils.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

// Detalle de la orden con ficha técnica, historial y cambio de estado (HU-05, HU-16)
export default function OrdenPage() {
  const { id } = useParams();
  const [orden, setOrden] = useState(null);
  const [error, setError] = useState(null);
  const [actividades, setActividades] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => obtenerOrden(id).then((o) => {
    setOrden(o);
    setActividades(o.actividades ?? '');
    setObservaciones(o.observaciones ?? '');
  }).catch(setError), [id]);
  useEffect(() => { cargar(); }, [cargar]);

  async function transicionar(estado) {
    setEnviando(true);
    setError(null);
    try {
      await cambiarEstado(id, estado === 'finalizada'
        ? { estado, actividades: actividades.trim(), observaciones: observaciones.trim() || undefined }
        : { estado });
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  if (error && !orden) return <Mensaje error={error} />;
  if (!orden) return <p>Cargando…</p>;

  const { planta, cliente } = orden;
  const ficha = [
    ['Dirección', planta.direccion],
    ['Comuna', planta.comuna],
    ['Potencia', `${planta.potencia_kw} kW`],
    ['Inversor', planta.inversor],
    ['Paneles', planta.paneles],
    ['Baterías', planta.baterias ?? 'Sin baterías'],
    ['Instalación', formatoFecha(planta.fecha_instalacion)],
  ];

  return (
    <section>
      <p><Link to="/trabajador/agenda">← Volver a la agenda</Link></p>
      <div className="encabezado">
        <h1>Orden del {formatoFecha(orden.fecha_programada)}</h1>
        <EtiquetaOrden estado={orden.estado} />
      </div>

      <div className="columnas">
        <article className="tarjeta">
          <h2>Ficha técnica</h2>
          {planta.baterias && (
            <p className="aviso-seguridad">⚠ Esta planta tiene banco de baterías. Aplica los procedimientos de seguridad eléctrica.</p>
          )}
          <dl className="ficha">
            {ficha.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            <div><dt>Cliente</dt><dd>{cliente.nombre}</dd></div>
            {cliente.telefono && <div><dt>Teléfono</dt><dd>{cliente.telefono}</dd></div>}
            {orden.motivo_solicitud && <div><dt>Motivo</dt><dd>{orden.motivo_solicitud}</dd></div>}
          </dl>
          <a className="boton secundario" href={enlaceMapa(planta)} target="_blank" rel="noreferrer">Abrir en el mapa</a>
        </article>

        <article className="tarjeta">
          <h2>Registro de la visita</h2>
          <Mensaje error={error} />

          {orden.estado === 'pendiente' && (
            <>
              <p>Al llegar a terreno, inicia la atención.</p>
              <button className="boton" disabled={enviando} onClick={() => transicionar('en_curso')}>Iniciar atención</button>
            </>
          )}

          {orden.estado === 'en_curso' && (
            <form className="formulario-simple" onSubmit={(e) => { e.preventDefault(); transicionar('finalizada'); }}>
              <label>
                Actividades realizadas
                <textarea value={actividades} onChange={(e) => setActividades(e.target.value)} required rows={4}
                  placeholder="Ej.: limpieza de módulos, reapriete de conexiones, lectura del inversor" />
              </label>
              <label>
                Observaciones <span className="opcional">(opcional)</span>
                <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
              </label>
              <button type="submit" className="boton" disabled={enviando || !actividades.trim()}>Finalizar orden</button>
            </form>
          )}

          {['finalizada', 'cancelada'].includes(orden.estado) && (
            <dl className="ficha">
              {orden.fecha_ejecucion && <div><dt>Ejecutada</dt><dd>{formatoFecha(orden.fecha_ejecucion)}</dd></div>}
              {orden.actividades && <div><dt>Actividades</dt><dd>{orden.actividades}</dd></div>}
              {orden.observaciones && <div><dt>Observaciones</dt><dd>{orden.observaciones}</dd></div>}
            </dl>
          )}

          <h3>Historial de estados</h3>
          <ul className="historial">
            {orden.historial.map((h, i) => (
              <li key={i}>
                {h.estado_anterior ? `${h.estado_anterior} → ` : ''}<strong>{h.estado_nuevo}</strong>
                {' · '}{new Date(h.fecha_cambio).toLocaleString('es-CL')} · {h.responsable}
                {h.comentario && ` — ${h.comentario}`}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
