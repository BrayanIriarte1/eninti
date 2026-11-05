import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { miAgenda } from '../services/trabajadorService.js';
import { enlaceMapa, EtiquetaOrden } from '../components/ordenUtils.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

// Agenda de visitas del trabajador con enlace al mapa (HU-14)
export default function AgendaPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [historicas, setHistoricas] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    miAgenda(historicas).then(setOrdenes).catch(setError).finally(() => setCargando(false));
  }, [historicas]);

  return (
    <section>
      <div className="encabezado">
        <h1>Mi agenda</h1>
        <div className="segmentado" role="group" aria-label="Filtrar órdenes">
          <button type="button" className={!historicas ? 'activo' : ''} onClick={() => setHistoricas(false)}>Pendientes</button>
          <button type="button" className={historicas ? 'activo' : ''} onClick={() => setHistoricas(true)}>Historial</button>
        </div>
      </div>

      <Mensaje error={error} />
      {cargando && <p>Cargando…</p>}
      {!cargando && ordenes.length === 0 && <p>No tienes órdenes {historicas ? 'en el historial' : 'pendientes'}.</p>}

      <div className="columnas">
        {ordenes.map((o) => (
          <article key={o.id_mantencion} className="tarjeta">
            <div className="encabezado">
              <h2 style={{ margin: 0 }}>{formatoFecha(o.fecha_programada)}</h2>
              <EtiquetaOrden estado={o.estado} />
            </div>
            <dl className="ficha">
              <div><dt>Planta</dt><dd>{o.planta.direccion}</dd></div>
              <div><dt>Comuna</dt><dd>{o.planta.comuna}</dd></div>
              <div><dt>Cliente</dt><dd>{o.cliente.nombre}</dd></div>
              <div><dt>Tipo</dt><dd>{o.tipo}</dd></div>
              {o.planta.baterias && <div><dt>⚠ Baterías</dt><dd>{o.planta.baterias}</dd></div>}
            </dl>
            <div className="acciones">
              <Link className="boton" to={`/trabajador/ordenes/${o.id_mantencion}`}>Ver detalle</Link>
              <a className="boton secundario" href={enlaceMapa(o.planta)} target="_blank" rel="noreferrer">Abrir mapa</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
