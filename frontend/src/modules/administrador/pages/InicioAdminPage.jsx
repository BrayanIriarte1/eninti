import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarImpagos, listarSolicitudes, listarMantenciones, listarSolicitudesCuenta } from '../services/adminService.js';
import { formatoPesos } from '../../../shared/utils/formato.js';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import ArcoSolar, { saludo } from '../../../shared/components/ArcoSolar.jsx';
import Icono from '../../../shared/components/Icono.jsx';

const hace = (fecha) => {
  const dias = Math.floor((Date.now() - new Date(fecha)) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
};

// Panel de inicio del administrador con indicadores y alertas (HU-01, HU-11)
export default function InicioAdminPage() {
  const { usuario } = useAuth();
  const [impagos, setImpagos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [sinAsignar, setSinAsignar] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      listarImpagos().then(setImpagos),
      listarSolicitudes('pendiente').then(setSolicitudes),
      listarSolicitudesCuenta('pendiente').then(setCuentas),
      listarMantenciones().then((m) => setSinAsignar(m.filter((x) => !x.id_trabajador && ['pendiente', 'en_curso'].includes(x.estado)).length)),
    ]).finally(() => setCargando(false));
  }, []);

  const deudaTotal = impagos.reduce((t, i) => t + i.monto_total, 0);
  const porAtender = cuentas.length + solicitudes.length + sinAsignar;

  const tarjetas = [
    { valor: impagos.length, texto: 'Suscripciones morosas', sub: deudaTotal > 0 ? `${formatoPesos(deudaTotal)} por cobrar` : null, ruta: '/admin/impagos', alerta: impagos.length > 0, icono: 'impagos' },
    { valor: cuentas.length, texto: 'Cuentas por crear', ruta: '/admin/solicitudes-cuenta', alerta: cuentas.length > 0, icono: 'nuevaCuenta' },
    { valor: solicitudes.length, texto: 'Solicitudes de mantención', ruta: '/admin/solicitudes', alerta: solicitudes.length > 0, icono: 'solicitudes' },
    { valor: sinAsignar, texto: 'Mantenciones sin técnico', ruta: '/admin/calendario', alerta: sinAsignar > 0, icono: 'calendario' },
  ];

  const pendientes = [
    ...cuentas.map((c) => ({
      clave: `c${c.id_solicitud_cuenta}`, ruta: '/admin/solicitudes-cuenta', icono: 'nuevaCuenta', tono: 'aviso',
      titulo: `${c.nombre} pide una cuenta`, detalle: `${c.comuna} · ${hace(c.fecha_solicitud)}`,
    })),
    ...solicitudes.map((s) => ({
      clave: `s${s.id_solicitud}`, ruta: '/admin/solicitudes', icono: 'solicitudes', tono: '',
      titulo: `${s.cliente} pide una mantención`, detalle: `${s.direccion}, ${s.comuna} · ${hace(s.fecha_solicitud)}`,
    })),
  ];

  return (
    <section>
      <ArcoSolar titulo={`${saludo()}, ${usuario?.nombre?.split(' ')[0] ?? ''}`}>
        <p>
          {cargando ? 'Revisando la operación…'
            : porAtender === 0 ? 'No hay nada pendiente por atender. Buen momento para revisar el calendario.'
              : `Tienes ${porAtender} ${porAtender === 1 ? 'tarea pendiente' : 'tareas pendientes'} entre cuentas nuevas, solicitudes y mantenciones sin técnico.`}
        </p>
      </ArcoSolar>

      <div className="resumen-tiras">
        {tarjetas.map((t) => (
          <Link key={t.texto} to={t.ruta} className={`tira enlace ${t.alerta ? 'tira-alerta' : 'tira-ok'}`}>
            <span className="tira-icono"><Icono nombre={t.icono} /></span>
            <span className="tira-valor">{cargando ? '–' : t.valor}</span>
            <span className="tira-texto">{t.texto}</span>
            {t.sub && <span className="tira-sub">{t.sub}</span>}
          </Link>
        ))}
      </div>

      <div className="columnas">
        <article className="tarjeta">
          <div className="panel-titulo">
            <h2>Por atender</h2>
          </div>
          {cargando ? <p className="cargando">Cargando…</p> : pendientes.length === 0 ? (
            <div className="vacio"><Icono nombre="ok" tamano={32} /><p>Todo al día: no hay cuentas ni mantenciones esperando.</p></div>
          ) : (
            <ul className="pendientes">
              {pendientes.slice(0, 6).map((p) => (
                <li key={p.clave}>
                  <Link to={p.ruta}>
                    <span className={`pendiente-icono ${p.tono}`}><Icono nombre={p.icono} tamano={18} /></span>
                    <span><strong>{p.titulo}</strong><small>{p.detalle}</small></span>
                    <Icono nombre="flecha" tamano={18} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="tarjeta">
          <div className="panel-titulo">
            <h2>Clientes con deuda</h2>
            {impagos.length > 0 && <Link to="/admin/impagos">Ver todos</Link>}
          </div>
          {cargando ? <p className="cargando">Cargando…</p> : impagos.length === 0 ? (
            <div className="vacio"><Icono nombre="ok" tamano={32} /><p>Todas las suscripciones están al día.</p></div>
          ) : (
            <ul className="pendientes">
              {[...impagos].sort((a, b) => b.monto_total - a.monto_total).slice(0, 5).map((i) => (
                <li key={i.id_suscripcion}>
                  <Link to="/admin/impagos">
                    <span className="pendiente-icono alerta"><Icono nombre="impagos" tamano={18} /></span>
                    <span>
                      <strong>{i.cliente}</strong>
                      <small>{i.meses_adeudados} {i.meses_adeudados === 1 ? 'mes' : 'meses'} · {i.comuna}</small>
                    </span>
                    <span className="monto">{formatoPesos(i.monto_total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
