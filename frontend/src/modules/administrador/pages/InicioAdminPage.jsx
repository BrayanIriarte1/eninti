import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarImpagos, listarSolicitudes, listarMantenciones } from '../services/adminService.js';
import { formatoPesos } from '../../../shared/utils/formato.js';

// Panel de inicio del administrador con indicadores y alertas (HU-01, HU-11)
export default function InicioAdminPage() {
  const [impagos, setImpagos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [sinAsignar, setSinAsignar] = useState(0);

  useEffect(() => {
    listarImpagos().then(setImpagos).catch(() => {});
    listarSolicitudes('pendiente').then(setSolicitudes).catch(() => {});
    listarMantenciones().then((m) => setSinAsignar(m.filter((x) => !x.id_trabajador && ['pendiente', 'en_curso'].includes(x.estado)).length)).catch(() => {});
  }, []);

  const deudaTotal = impagos.reduce((t, i) => t + i.monto_total, 0);

  const tarjetas = [
    { valor: impagos.length, texto: 'Suscripciones morosas', sub: formatoPesos(deudaTotal), ruta: '/admin/impagos', alerta: impagos.length > 0 },
    { valor: solicitudes.length, texto: 'Solicitudes pendientes', ruta: '/admin/solicitudes', alerta: solicitudes.length > 0 },
    { valor: sinAsignar, texto: 'Mantenciones sin asignar', ruta: '/admin/calendario', alerta: sinAsignar > 0 },
  ];

  return (
    <section>
      <h1>Panel de administración</h1>
      <div className="resumen-tiras">
        {tarjetas.map((t) => (
          <Link key={t.texto} to={t.ruta} className={`tira enlace ${t.alerta ? 'tira-alerta' : 'tira-ok'}`}>
            <span className="tira-valor">{t.valor}</span>
            <span className="tira-texto">{t.texto}</span>
            {t.sub && <span className="tira-sub">{t.sub}</span>}
          </Link>
        ))}
      </div>

      <h2>Accesos rápidos</h2>
      <div className="columnas">
        {[
          ['Plantas y fichas técnicas', '/admin/plantas'],
          ['Clientes', '/admin/clientes'],
          ['Trabajadores', '/admin/trabajadores'],
          ['Calendario de mantenciones', '/admin/calendario'],
          ['Pagos del mes', '/admin/pagos'],
          ['Catálogo de servicios', '/admin/catalogo'],
        ].map(([texto, ruta]) => (
          <Link key={ruta} to={ruta} className="tarjeta enlace-tarjeta">{texto} →</Link>
        ))}
      </div>
    </section>
  );
}
