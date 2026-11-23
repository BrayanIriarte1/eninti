import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { miAgenda } from '../services/trabajadorService.js';
import { enlaceMapa, EtiquetaOrden } from '../components/ordenUtils.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import ArcoSolar, { saludo } from '../../../shared/components/ArcoSolar.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

// Mosaico de calendario: día grande, mes y día de la semana ('YYYY-MM-DD' en hora local)
function FechaMosaico({ fecha }) {
  const d = new Date(`${fecha}T12:00:00`);
  return (
    <span className="fecha-mosaico" aria-hidden="true">
      <span>{d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')}</span>
      <strong>{d.getDate()}</strong>
    </span>
  );
}

// Agenda de visitas del trabajador con enlace al mapa (HU-14)
export default function AgendaPage() {
  const { usuario } = useAuth();
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
      <ArcoSolar titulo={`${saludo()}, ${usuario?.nombre?.split(' ')[0] ?? ''}`}>
        <p>
          {cargando || historicas ? 'Tu agenda de visitas a plantas solares.'
            : ordenes.length === 0 ? 'No tienes visitas pendientes.'
              : `Tienes ${ordenes.length} ${ordenes.length === 1 ? 'visita pendiente' : 'visitas pendientes'}. Revisa la planta y abre el mapa antes de salir.`}
        </p>
      </ArcoSolar>
      <div className="encabezado">
        <h2 style={{ margin: 0 }}>Mi agenda</h2>
        <div className="segmentado" role="group" aria-label="Filtrar órdenes">
          <button type="button" className={!historicas ? 'activo' : ''} onClick={() => setHistoricas(false)}>Pendientes</button>
          <button type="button" className={historicas ? 'activo' : ''} onClick={() => setHistoricas(true)}>Historial</button>
        </div>
      </div>

      <Mensaje error={error} />
      {cargando && <p className="cargando">Cargando…</p>}
      {!cargando && ordenes.length === 0 && (
        <div className="tarjeta vacio"><Icono nombre={historicas ? 'agenda' : 'ok'} tamano={30} /><p>No tienes órdenes {historicas ? 'en el historial' : 'pendientes'}.</p></div>
      )}

      <div className="columnas">
        {ordenes.map((o) => (
          <article key={o.id_mantencion} className="tarjeta">
            <div className="encabezado orden-cabeza">
              <FechaMosaico fecha={o.fecha_programada} />
              <div className="orden-cabeza-texto">
                <h2>{formatoFecha(o.fecha_programada)}</h2>
                <span className={`chip-tipo ${o.tipo}`}>{o.tipo === 'correctiva' ? 'Correctiva' : 'Preventiva'}</span>
              </div>
              <EtiquetaOrden estado={o.estado} />
            </div>
            {o.planta.baterias && (
              <p className="aviso-bateria"><Icono nombre="impagos" tamano={18} /> Planta con baterías: {o.planta.baterias}</p>
            )}
            <dl className="ficha">
              <div><dt>Planta</dt><dd>{o.planta.direccion}</dd></div>
              <div><dt>Comuna</dt><dd>{o.planta.comuna}</dd></div>
              <div><dt>Cliente</dt><dd>{o.cliente.nombre}</dd></div>
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
