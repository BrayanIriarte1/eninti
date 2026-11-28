import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import Icono from './Icono.jsx';

// [CU-37] Campana de notificaciones de los tres paneles. Consulta la API al abrir el panel,
// cada 30 s mientras la pestaña está visible y al volver a ella; cada usuario ve solo las suyas.
const INTERVALO_MS = 30_000;

function haceCuanto(fecha) {
  const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60_000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return new Date(fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function Campana() {
  const navigate = useNavigate();
  const [abierta, setAbierta] = useState(false);
  const [datos, setDatos] = useState({ no_leidas: 0, notificaciones: [] });
  const [error, setError] = useState(false);
  const contenedor = useRef(null);
  const boton = useRef(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api('/notificaciones'));
      setError(false);
    } catch {
      setError(true); // sin conexión: se reintenta en el siguiente ciclo
    }
  }, []);

  // Sondeo periódico solo con la pestaña visible, y recarga al volver a ella
  useEffect(() => {
    cargar();
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, INTERVALO_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargar]);

  // Cierra con clic fuera o con Escape (devuelve el foco al botón)
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => { if (!contenedor.current?.contains(e.target)) setAbierta(false); };
    const tecla = (e) => {
      if (e.key === 'Escape') {
        setAbierta(false);
        boton.current?.focus();
      }
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierta]);

  const alternar = () => {
    if (!abierta) cargar();
    setAbierta(!abierta);
  };

  const abrir = async (n) => {
    setAbierta(false);
    if (!n.leida_en) {
      setDatos((d) => ({
        no_leidas: Math.max(0, d.no_leidas - 1),
        notificaciones: d.notificaciones.map((x) => (x.id_notificacion === n.id_notificacion ? { ...x, leida_en: new Date().toISOString() } : x)),
      }));
      api(`/notificaciones/${n.id_notificacion}/leer`, { method: 'POST' }).catch(() => cargar());
    }
    if (n.ruta) navigate(n.ruta);
  };

  const leerTodas = async () => {
    await api('/notificaciones/leer-todas', { method: 'POST' }).catch(() => null);
    cargar();
  };

  const { no_leidas: noLeidas, notificaciones } = datos;
  const etiqueta = noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones';

  return (
    <div className="campana" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="campana-boton"
        aria-label={etiqueta}
        title={etiqueta}
        aria-expanded={abierta}
        aria-haspopup="true"
        onClick={alternar}
      >
        <Icono nombre="campana" tamano={20} />
        {noLeidas > 0 && <span className="campana-contador" aria-hidden="true">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      {abierta && (
        <div className="campana-panel" role="region" aria-label="Notificaciones">
          <div className="campana-cabecera">
            <strong>Notificaciones</strong>
            {noLeidas > 0 && (
              <button type="button" className="enlace-boton" onClick={leerTodas}>Marcar todas como leídas</button>
            )}
          </div>
          {error && !notificaciones.length ? (
            <p className="campana-vacia">No se pudieron cargar las notificaciones. Inténtalo de nuevo en un momento</p>
          ) : notificaciones.length === 0 ? (
            <p className="campana-vacia">No tienes notificaciones por ahora</p>
          ) : (
            <ul className="campana-lista">
              {notificaciones.map((n) => (
                <li key={n.id_notificacion}>
                  <button
                    type="button"
                    className={`campana-item${n.leida_en ? '' : ' no-leida'}`}
                    onClick={() => abrir(n)}
                  >
                    <span className="campana-titulo">
                      {!n.leida_en && <span className="campana-oculto">Sin leer: </span>}
                      {n.titulo}
                    </span>
                    {n.detalle && <span className="campana-detalle">{n.detalle}</span>}
                    <span className="campana-fecha">{haceCuanto(n.fecha)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
