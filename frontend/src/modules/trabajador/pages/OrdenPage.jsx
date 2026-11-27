import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerOrden, cambiarEstado } from '../services/trabajadorService.js';
import { enlaceMapa, EtiquetaOrden } from '../components/ordenUtils.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import GaleriaFotos from '../../../shared/components/GaleriaFotos.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';
import { comprimirFoto } from '../../../shared/utils/fotos.js';

const MAX_FOTOS = 4;
const NOMBRE_ESTADO = {
  pendiente: 'pendiente', en_curso: 'en curso', por_confirmar: 'esperando al cliente',
  finalizada: 'finalizada', cancelada: 'cancelada',
};

// Detalle de la orden con ficha técnica, historial y cambio de estado (HU-05, HU-16).
// El técnico termina con actividades y fotos; el cliente confirma y recién ahí se cierra.
export default function OrdenPage() {
  const { id } = useParams();
  const [orden, setOrden] = useState(null);
  const [error, setError] = useState(null);
  const [actividades, setActividades] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => obtenerOrden(id).then((o) => {
    setOrden(o);
    setActividades(o.actividades ?? '');
    setObservaciones(o.observaciones ?? '');
  }).catch(setError), [id]);
  useEffect(() => { cargar(); }, [cargar]);

  async function agregarFotos(e) {
    const archivos = [...e.target.files].slice(0, MAX_FOTOS - fotos.length);
    e.target.value = '';
    if (!archivos.length) return;
    setProcesando(true);
    setError(null);
    try {
      const nuevas = await Promise.all(archivos.map(comprimirFoto));
      setFotos((actuales) => [...actuales, ...nuevas].slice(0, MAX_FOTOS));
    } catch (err) {
      setError({ message: `No se pudo leer la foto: ${err.message}` });
    } finally {
      setProcesando(false);
    }
  }

  async function transicionar(estado) {
    setEnviando(true);
    setError(null);
    try {
      await cambiarEstado(id, estado === 'por_confirmar'
        ? { estado, actividades: actividades.trim(), observaciones: observaciones.trim() || undefined, fotos }
        : { estado });
      setFotos([]);
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  if (error && !orden) return <Mensaje error={error} />;
  if (!orden) return <p className="cargando">Cargando…</p>;

  const { planta, cliente } = orden;
  const reabierta = orden.estado === 'en_curso' && orden.problema_resuelto === false;
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
            {cliente.telefono && <div><dt>Teléfono</dt><dd><a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a></dd></div>}
            {orden.motivo_solicitud && <div><dt>Motivo</dt><dd>{orden.motivo_solicitud}</dd></div>}
          </dl>
          <div className="acciones">
            <a className="boton secundario" href={enlaceMapa(planta)} target="_blank" rel="noreferrer">Abrir en Google Maps</a>
          </div>
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
            <form className="formulario-simple" onSubmit={(e) => { e.preventDefault(); transicionar('por_confirmar'); }}>
              {reabierta && (
                <p className="aviso-seguridad">
                  El cliente informó que el problema sigue{orden.comentario_cliente ? `: "${orden.comentario_cliente}"` : '.'}
                </p>
              )}
              <label>
                Actividades realizadas
                <textarea value={actividades} onChange={(e) => setActividades(e.target.value)} required rows={4}
                  placeholder="Ej.: limpieza de módulos, reapriete de conexiones, lectura del inversor" />
              </label>
              <label>
                Observaciones <span className="opcional">(opcional)</span>
                <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} maxLength={2000} />
              </label>

              <div className="campo-fotos">
                <span className="campo-titulo">Fotos del trabajo <span className="opcional">(1 a {MAX_FOTOS}, el cliente las verá)</span></span>
                <GaleriaFotos fotos={fotos} onQuitar={(i) => setFotos(fotos.filter((_, j) => j !== i))} />
                {fotos.length < MAX_FOTOS && (
                  <label className="boton secundario boton-archivo">
                    {procesando ? 'Preparando foto…' : fotos.length ? 'Agregar otra foto' : 'Tomar o subir foto'}
                    <input type="file" accept="image/*" capture="environment" multiple onChange={agregarFotos} disabled={procesando} />
                  </label>
                )}
              </div>

              <button type="submit" className="boton" disabled={enviando || procesando || !actividades.trim() || fotos.length === 0}>
                {enviando ? 'Enviando…' : 'Enviar al cliente para confirmar'}
              </button>
              {fotos.length === 0 && <p className="texto-suave">Agrega al menos una foto para enviar la orden.</p>}
            </form>
          )}

          {orden.estado === 'por_confirmar' && (
            <p className="mensaje-ok">Enviaste el trabajo al cliente. La orden se cerrará cuando confirme que quedó conforme.</p>
          )}

          {['por_confirmar', 'finalizada', 'cancelada'].includes(orden.estado) && (
            <>
              <dl className="ficha">
                {orden.fecha_ejecucion && <div><dt>Ejecutada</dt><dd>{formatoFecha(orden.fecha_ejecucion)}</dd></div>}
                {orden.actividades && <div><dt>Actividades</dt><dd>{orden.actividades}</dd></div>}
                {orden.observaciones && <div><dt>Observaciones</dt><dd>{orden.observaciones}</dd></div>}
                {orden.estado === 'finalizada' && orden.satisfecho !== null && (
                  <div><dt>Cliente</dt><dd>{orden.satisfecho ? 'Quedó satisfecho' : 'No quedó satisfecho'}{orden.comentario_cliente ? ` · "${orden.comentario_cliente}"` : ''}</dd></div>
                )}
              </dl>
              <GaleriaFotos fotos={orden.fotos.map((f) => f.url)} />
            </>
          )}

          <h3>Historial de estados</h3>
          <ul className="historial">
            {orden.historial.map((h, i) => (
              <li key={i}>
                {h.estado_anterior ? `${NOMBRE_ESTADO[h.estado_anterior] ?? h.estado_anterior} → ` : ''}
                <strong>{NOMBRE_ESTADO[h.estado_nuevo] ?? h.estado_nuevo}</strong>
                {' · '}{new Date(h.fecha_cambio).toLocaleString('es-CL')} · {h.responsable}
                {h.comentario && <><br /><span>{h.comentario}</span></>}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
