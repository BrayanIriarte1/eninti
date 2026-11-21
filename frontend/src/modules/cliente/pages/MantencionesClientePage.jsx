import { useCallback, useEffect, useState } from 'react';
import { misMantenciones, ordenesPorConfirmar, confirmarOrden } from '../services/clienteService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import GaleriaFotos from '../../../shared/components/GaleriaFotos.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

function Pregunta({ nombre, texto, valor, onCambio }) {
  return (
    <fieldset className="pregunta">
      <legend>{texto}</legend>
      <div className="segmentado" role="radiogroup">
        {[['si', 'Sí'], ['no', 'No']].map(([v, etiqueta]) => (
          <label key={v} className={valor === v ? 'activo' : ''}>
            <input type="radio" name={nombre} value={v} checked={valor === v} onChange={() => onCambio(v)} required />
            {etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Trabajo terminado por el técnico: el cliente revisa las fotos y confirma para cerrar la orden
function ConfirmarTrabajo({ orden, onListo }) {
  const [satisfecho, setSatisfecho] = useState('');
  const [resuelto, setResuelto] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const r = await confirmarOrden(orden.id_mantencion, {
        satisfecho: satisfecho === 'si',
        problema_resuelto: resuelto === 'si',
        comentario: comentario.trim() || undefined,
      });
      onListo(r.estado === 'finalizada'
        ? 'Gracias. Cerramos la orden con tu confirmación.'
        : 'Gracias por avisar. El técnico volverá a revisar la planta.');
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  const sigueFallando = resuelto === 'no';
  return (
    <article className="tarjeta tarjeta-destacada">
      <div className="encabezado">
        <h3 style={{ margin: 0 }}>{orden.direccion}</h3>
        <span className="etiqueta aviso">Por confirmar</span>
      </div>
      <p className="texto-suave">
        {orden.tipo === 'correctiva' ? 'Mantención correctiva' : 'Mantención preventiva'} del {formatoFecha(orden.fecha_ejecucion)}
        {orden.trabajador ? ` · ${orden.trabajador}` : ''}
      </p>
      {orden.motivo_solicitud && <p><strong>Tu solicitud:</strong> {orden.motivo_solicitud}</p>}
      <p><strong>Trabajo realizado:</strong> {orden.actividades}</p>
      {orden.observaciones && <p><strong>Observaciones:</strong> {orden.observaciones}</p>}
      <GaleriaFotos fotos={orden.fotos.map((f) => f.url)} />

      <form className="formulario-simple" onSubmit={enviar} style={{ marginTop: '1rem' }}>
        <Mensaje error={error} />
        <Pregunta nombre={`resuelto-${orden.id_mantencion}`} texto="¿Se solucionó el problema?" valor={resuelto} onCambio={setResuelto} />
        <Pregunta nombre={`satisfecho-${orden.id_mantencion}`} texto="¿Quedaste satisfecho con el trabajo?" valor={satisfecho} onCambio={setSatisfecho} />
        <label>
          {sigueFallando ? 'Cuéntanos qué sigue fallando' : <>Comentario <span className="opcional">(opcional)</span></>}
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} maxLength={500} required={sigueFallando} />
        </label>
        <button type="submit" className="boton" disabled={enviando || !satisfecho || !resuelto}>
          {enviando ? 'Enviando…' : sigueFallando ? 'Avisar que sigue fallando' : 'Confirmar y cerrar la orden'}
        </button>
      </form>
    </article>
  );
}

// Última mantención finalizada y próxima programada por planta (HU-09),
// más los trabajos que esperan la confirmación del cliente.
export default function MantencionesClientePage() {
  const [plantas, setPlantas] = useState([]);
  const [porConfirmar, setPorConfirmar] = useState([]);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => Promise.all([
    misMantenciones().then(setPlantas),
    ordenesPorConfirmar().then(setPorConfirmar),
  ]).catch(setError).finally(() => setCargando(false)), []);
  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <p className="cargando">Cargando…</p>;
  if (error && !plantas.length) return <Mensaje error={error} />;

  return (
    <section>
      <h1>Mantenciones</h1>
      {aviso && <p className="mensaje-ok" role="status">{aviso}</p>}

      {porConfirmar.length > 0 && (
        <>
          <h2>Trabajos por confirmar</h2>
          <p className="texto-suave">El técnico terminó estas visitas. Revisa las fotos y confirma para cerrar la orden.</p>
          <div className="columnas">
            {porConfirmar.map((o) => (
              <ConfirmarTrabajo key={o.id_mantencion} orden={o} onListo={(m) => { setAviso(m); cargar(); }} />
            ))}
          </div>
        </>
      )}

      <h2>Por planta</h2>
      <div className="columnas">
        {plantas.map((p) => (
          <article key={p.id_planta} className="tarjeta">
            <h3 style={{ marginTop: 0 }}>{p.direccion}</h3>
            <p className="campo-titulo">Última mantención</p>
            {p.ultima ? (
              <p>
                <strong>{formatoFecha(p.ultima.fecha)}</strong> · {p.ultima.tipo}
                {p.ultima.actividades && <><br /><span className="texto-suave">{p.ultima.actividades}</span></>}
              </p>
            ) : (
              <p className="texto-suave">Sin mantenciones finalizadas aún.</p>
            )}
            <p className="campo-titulo">Próxima mantención</p>
            {p.proxima ? (
              <p><strong>{formatoFecha(p.proxima.fecha)}</strong> · {p.proxima.tipo} ({p.proxima.estado === 'en_curso' ? 'en curso' : p.proxima.estado})</p>
            ) : (
              <p className="texto-suave">No hay una visita programada.</p>
            )}
          </article>
        ))}
        {plantas.length === 0 && (
          <div className="tarjeta vacio"><Icono nombre="planta" tamano={30} /><p>Aún no tienes plantas registradas.</p></div>
        )}
      </div>
    </section>
  );
}
