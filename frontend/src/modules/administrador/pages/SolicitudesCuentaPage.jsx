// ============================================================================
// PANTALLA: Nuevas cuentas · URL /admin/solicitudes-cuenta · Rol: administrador
// Casos de uso: CU-13 gestionar solicitudes de cuenta («include» crear cliente y cuenta web)
// Datos: listar/aprobar/rechazarSolicitudCuenta() → solicitudesCuenta.service.js
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarSolicitudesCuenta, aprobarSolicitudCuenta, rechazarSolicitudCuenta } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';

const fechaCorta = (v) => (v ? new Date(v).toLocaleDateString('es-CL') : '—');
const baterias = (v) => (v === null || v === undefined ? 'No lo sabe' : v ? 'Sí' : 'No');

// URL del formulario de nueva planta con los datos de la solicitud ya cargados
const urlNuevaPlanta = (s) =>
  `/admin/plantas/nueva?${new URLSearchParams({
    cliente: s.id_cliente, comuna: s.id_comuna, direccion: s.direccion_planta,
    ...(s.potencia_kw ? { potencia: s.potencia_kw } : {}),
  })}`;

// Solicitudes de cuenta enviadas desde el login (HU-07). Al aprobar, el administrador
// crea el cliente y su cuenta web, y luego registra la planta solicitada.
export default function SolicitudesCuentaPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [verTodas, setVerTodas] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [cuenta, setCuenta] = useState({ email: '', password: '' });
  const [creada, setCreada] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(
    () => listarSolicitudesCuenta(verTodas ? undefined : 'pendiente').then(setSolicitudes).catch(setError),
    [verTodas],
  );
  useEffect(() => { cargar(); }, [cargar]);

  // [CU-13] Abre el formulario de aprobación (correo y contraseña inicial).
  function abrir(s) {
    setAbierta(s.id_solicitud_cuenta);
    setCuenta({ email: s.email, password: '' });
    setError(null);
    setCreada(null);
  }

  // [CU-13]
  async function aprobar(e, s) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const r = await aprobarSolicitudCuenta(s.id_solicitud_cuenta, cuenta);
      setCreada({ ...s, id_cliente: r.cliente.id_cliente, email: r.usuario.email });
      setAbierta(null);
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  // [CU-13]
  async function rechazar(s) {
    if (!window.confirm(`¿Rechazar la solicitud de ${s.nombre}?`)) return;
    setError(null);
    try {
      await rechazarSolicitudCuenta(s.id_solicitud_cuenta);
      await cargar();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h1>Solicitudes de cuenta</h1>
        <div className="segmentado" role="group" aria-label="Filtrar solicitudes">
          <button type="button" className={!verTodas ? 'activo' : ''} onClick={() => setVerTodas(false)}>Pendientes</button>
          <button type="button" className={verTodas ? 'activo' : ''} onClick={() => setVerTodas(true)}>Todas</button>
        </div>
      </div>
      <p className="acceso-sub">
        Clientes que pidieron su cuenta desde el inicio de sesión. Al crear la cuenta, comunica al cliente
        su correo y contraseña inicial; luego registra la planta con su ficha técnica.
      </p>

      <Mensaje error={error} />
      {creada && (
        <div className="mensaje-ok" role="status">
          Cuenta creada para <strong>{creada.nombre}</strong> ({creada.email}).{' '}
          <Link to={urlNuevaPlanta(creada)}>Registrar ahora su planta →</Link>
        </div>
      )}

      {solicitudes.length === 0 && <p>No hay solicitudes {verTodas ? '' : 'pendientes'}.</p>}

      <div className="columnas">
        {solicitudes.map((s) => (
          <article key={s.id_solicitud_cuenta} className="tarjeta">
            <div className="encabezado">
              <h2>{s.nombre}</h2>
              <span className={`etiqueta ${s.estado === 'aprobada' ? 'ok' : s.estado === 'rechazada' ? 'alerta' : 'neutro'}`}>{s.estado}</span>
            </div>
            <dl className="ficha">
              <dt>RUT</dt><dd>{s.rut}</dd>
              <dt>Correo</dt><dd>{s.email}</dd>
              <dt>Teléfono</dt><dd>{s.telefono}</dd>
              <dt>Planta</dt><dd>{s.direccion_planta}, {s.comuna}</dd>
              <dt>Potencia</dt><dd>{s.potencia_kw ? `${s.potencia_kw} kW` : 'No indicada'}</dd>
              <dt>Baterías</dt><dd>{baterias(s.tiene_baterias)}</dd>
              <dt>Recibida</dt><dd>{fechaCorta(s.fecha_solicitud)}</dd>
              {s.mensaje && (<><dt>Mensaje</dt><dd>{s.mensaje}</dd></>)}
              {s.estado !== 'pendiente' && (<><dt>Resuelta</dt><dd>{fechaCorta(s.fecha_resolucion)} · {s.resuelta_por_nombre}</dd></>)}
            </dl>

            {s.estado === 'pendiente' && s.rut_con_cuenta && (
              <p className="aviso-seguridad">Este RUT ya tiene una cuenta web; recházala o revisa la ficha del cliente.</p>
            )}

            {s.estado === 'pendiente' && abierta !== s.id_solicitud_cuenta && (
              <div className="acciones">
                <button className="boton peligro" onClick={() => rechazar(s)}>Rechazar</button>
                <button className="boton" onClick={() => abrir(s)} disabled={s.rut_con_cuenta}>Crear cuenta</button>
              </div>
            )}

            {abierta === s.id_solicitud_cuenta && (
              <form className="formulario-simple" onSubmit={(e) => aprobar(e, s)}>
                <label>Correo de acceso
                  <input type="email" value={cuenta.email} onChange={(e) => setCuenta({ ...cuenta, email: e.target.value })} required />
                </label>
                <label>Contraseña inicial <span className="opcional">(mín. 8; se la comunicas al cliente)</span>
                  <input type="text" value={cuenta.password} onChange={(e) => setCuenta({ ...cuenta, password: e.target.value })} required minLength={8} maxLength={128} pattern="(?=.*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?=.*[0-9]).{8,128}" title="Al menos 8 caracteres, con letras y números" autoComplete="off" />
                </label>
                <div className="acciones">
                  <button type="button" className="boton secundario" onClick={() => setAbierta(null)}>Cancelar</button>
                  <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cliente y cuenta'}</button>
                </div>
              </form>
            )}

            {s.estado === 'aprobada' && (
              <p><Link to={urlNuevaPlanta(s)}>Registrar planta de este cliente →</Link></p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
