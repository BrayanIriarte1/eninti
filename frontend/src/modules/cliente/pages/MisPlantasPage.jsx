// ============================================================================
// PANTALLA: Mis plantas · URL /cliente/plantas · Rol: cliente
// Casos de uso: CU-06 (ver plantas) y CU-36 (solicitar una nueva planta)
// Datos: clienteService.misPlantas() → GET /api/cliente/plantas → cliente.service.js · misPlantas()
//        clienteService.solicitarPlanta() / misSolicitudesPlanta() → /api/cliente/solicitudes-planta
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { misPlantas, misSolicitudesPlanta, solicitarPlanta } from '../services/clienteService.js';
import { listarComunasPublicas } from '../../publico/services/publicoService.js';
import EstadoSuscripcion from '../../administrador/components/EstadoSuscripcion.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha, formatoPesos } from '../../../shared/utils/formato.js';

const ESTADO = {
  pendiente: { texto: 'En revisión', clase: 'aviso' },
  aprobada: { texto: 'Aprobada', clase: 'ok' },
  rechazada: { texto: 'Rechazada', clase: 'alerta' },
};
const VACIO = { id_comuna: '', direccion: '', potencia_kw: '', baterias: '', mensaje: '' };
const MOTIVO_CANCELACION = {
  cliente: 'La cancelaste tú',
  morosidad: 'Se canceló porque la deuda superó un mes',
  administrador: 'La canceló la administración',
};

// Situación del plan de la planta, para que el cliente sepa qué puede hacer (CU-06, CU-24)
function EstadoPlan({ planta: p }) {
  if (p.suscripcion?.estado === 'con_deuda') {
    return <p className="aviso-seguridad">Tu plan sigue activo, pero tiene cuotas vencidas. Revisa el detalle en Mi cuenta.</p>;
  }
  if (p.suscripcion) return null;
  if (p.suscripcion_solicitada) {
    return <p className="mensaje-ok" style={{ margin: 0 }}>Solicitaste una suscripción para esta planta; la administración te responderá.</p>;
  }
  return (
    <p className="texto-suave">
      {p.ultima_cancelada
        ? <>{MOTIVO_CANCELACION[p.ultima_cancelada.motivo_cancelacion] ?? 'Se canceló'} el {formatoFecha(p.ultima_cancelada.fecha_cancelacion)}. Para volver a tener mantención, solicita una nueva suscripción.</>
        : 'Esta planta aún no tiene un plan de mantención.'}
    </p>
  );
}

// [CU-36] Formulario para pedir que se registre otra planta
function FormularioNuevaPlanta({ onEnviada, onCerrar }) {
  const [comunas, setComunas] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  useEffect(() => { listarComunasPublicas().then(setComunas).catch(setError); }, []);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await solicitarPlanta({
        id_comuna: Number(form.id_comuna),
        direccion: form.direccion.trim(),
        potencia_kw: form.potencia_kw === '' ? undefined : Number(form.potencia_kw),
        tiene_baterias: form.baterias === '' ? undefined : form.baterias === 'si',
        mensaje: form.mensaje.trim() || undefined,
      });
      await onEnviada();
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  return (
    <article className="tarjeta" style={{ maxWidth: 640, marginBottom: '1.5rem' }}>
      <h2>Solicitar una nueva planta</h2>
      <p className="texto-suave">
        Cuéntanos dónde está tu nueva instalación. El administrador revisará la solicitud, completará la ficha técnica
        y la verás en esta lista cuando la apruebe.
      </p>
      <form className="formulario-simple" onSubmit={enviar}>
        <Mensaje error={error} />
        <label>
          Comuna
          <select value={form.id_comuna} onChange={cambiar('id_comuna')} required>
            <option value="">Selecciona la comuna</option>
            {comunas.map((c) => <option key={c.id_comuna} value={c.id_comuna}>{c.nombre}</option>)}
          </select>
        </label>
        <label>
          Dirección de la planta
          <input value={form.direccion} onChange={cambiar('direccion')} required minLength={5} maxLength={200}
            placeholder="Ej.: Parcela 7, camino a Chiu Chiu" autoComplete="street-address" />
        </label>
        <div className="fila" style={{ marginTop: 0 }}>
          <label>
            Potencia en kW <span className="opcional">(si la conoces)</span>
            <input type="number" min="0.1" max="9999.99" step="0.01" inputMode="decimal"
              value={form.potencia_kw} onChange={cambiar('potencia_kw')} placeholder="Ej.: 5" />
          </label>
          <label>
            ¿Tiene baterías?
            <select value={form.baterias} onChange={cambiar('baterias')}>
              <option value="">No lo sé</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
        <label>
          Mensaje para el administrador <span className="opcional">(opcional)</span>
          <textarea value={form.mensaje} onChange={cambiar('mensaje')} rows={3} maxLength={500}
            placeholder="Ej.: la instalaron en octubre; el inversor es Huawei" />
        </label>
        <div className="acciones" style={{ marginTop: 0 }}>
          <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
          <button type="button" className="boton secundario" onClick={onCerrar} disabled={enviando}>Cancelar</button>
        </div>
      </form>
    </article>
  );
}

// Listado de mis plantas con acceso a su ficha técnica (HU-10) y solicitudes de nueva planta (CU-36)
export default function MisPlantasPage() {
  const [plantas, setPlantas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [formulario, setFormulario] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(
    () => Promise.all([misPlantas(), misSolicitudesPlanta()])
      .then(([p, s]) => { setPlantas(p); setSolicitudes(s); })
      .catch(setError)
      .finally(() => setCargando(false)),
    [],
  );
  useEffect(() => { cargar(); }, [cargar]);

  async function enviada() {
    setFormulario(false);
    setAviso('Solicitud enviada. El administrador la revisará y te responderá aquí.');
    await cargar();
  }

  if (cargando) return <p className="cargando">Cargando…</p>;

  return (
    <section>
      <div className="encabezado">
        <h1>Mis plantas</h1>
        {!formulario && (
          <button type="button" className="boton" onClick={() => { setAviso(null); setFormulario(true); }}>
            Solicitar nueva planta
          </button>
        )}
      </div>
      <Mensaje error={error} />
      {aviso && <p className="mensaje-ok" role="status">{aviso}</p>}
      {formulario && <FormularioNuevaPlanta onEnviada={enviada} onCerrar={() => setFormulario(false)} />}

      {plantas.length === 0 && <p>No tienes plantas registradas.</p>}
      <div className="columnas">
        {plantas.map((p) => (
          <article key={p.id_planta} className="tarjeta">
            <div className="encabezado">
              <h2 style={{ margin: 0 }}>{p.direccion}</h2>
              <EstadoSuscripcion estado={p.suscripcion?.estado ?? (p.ultima_cancelada ? 'cancelada' : null)} />
            </div>
            <dl className="ficha">
              <div><dt>Comuna</dt><dd>{p.comuna}</dd></div>
              <div><dt>Potencia</dt><dd>{p.potencia_kw} kW</dd></div>
              {p.suscripcion && <div><dt>Cuota</dt><dd>{formatoPesos(p.suscripcion.monto_mensual)}/mes</dd></div>}
            </dl>
            <EstadoPlan planta={p} />
            <div className="acciones" style={{ marginTop: 0 }}>
              <Link className="boton secundario" to={`/cliente/plantas/${p.id_planta}`}>Ver ficha técnica</Link>
              {!p.suscripcion && !p.suscripcion_solicitada && (
                <Link className="boton" to="/cliente/cuenta">Solicitar suscripción</Link>
              )}
            </div>
          </article>
        ))}
      </div>

      {solicitudes.length > 0 && (
        <>
          <h2 style={{ marginTop: '2rem' }}>Mis solicitudes de nueva planta</h2>
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Dirección</th><th>Estado</th><th>Respuesta del administrador</th></tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id_solicitud_planta}>
                  <td data-label="Fecha">{new Date(s.fecha_solicitud).toLocaleDateString('es-CL')}</td>
                  <td data-label="Dirección">{s.direccion}, {s.comuna}</td>
                  <td data-label="Estado"><span className={`etiqueta ${ESTADO[s.estado]?.clase ?? 'neutro'}`}>{ESTADO[s.estado]?.texto ?? s.estado}</span></td>
                  <td data-label="Respuesta">{s.respuesta ?? (s.estado === 'pendiente' ? 'Aún sin respuesta' : '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
