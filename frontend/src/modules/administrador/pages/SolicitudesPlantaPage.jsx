// ============================================================================
// PANTALLA: Nuevas plantas solicitadas · URL /admin/solicitudes-planta · Rol: administrador
// Casos de uso: CU-36 (aprobar = completar la ficha técnica y crear la planta, «include» CU-14)
// Datos: listar/aprobar/rechazarSolicitudPlanta() → solicitudesCliente.service.js
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aprobarSolicitudPlanta, listarCatalogo, listarComunas, listarSolicitudesPlanta, rechazarSolicitudPlanta } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { hoy, fechaDeMarca } from '../../../shared/utils/formato.js';

const ESTADO = {
  pendiente: { texto: 'Pendiente', clase: 'aviso' },
  aprobada: { texto: 'Aprobada', clase: 'ok' },
  rechazada: { texto: 'Rechazada', clase: 'alerta' },
};
const BATERIAS = { true: 'Sí', false: 'No', null: 'No lo sabe' };

// [CU-36] Aprobar (completa la ficha técnica y crea la planta) o rechazar con motivo
function Resolver({ solicitud, comunas, precioPlan, onListo }) {
  const [modo, setModo] = useState(null); // 'aprobar' | 'rechazar'
  // Plan contratado: opcional, solo si el cliente ya aceptó el plan (no es automático)
  const [conPlan, setConPlan] = useState(false);
  const [plan, setPlan] = useState({ monto_mensual: '', dia_cobro: '5' });
  const [ficha, setFicha] = useState({
    id_comuna: String(solicitud.id_comuna),
    direccion: solicitud.direccion,
    potencia_kw: solicitud.potencia_kw ?? '',
    inversor: '',
    paneles: '',
    baterias: '',
    fecha_instalacion: '',
  });
  const [respuesta, setRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const cambiar = (campo) => (e) => setFicha((f) => ({ ...f, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      if (modo === 'aprobar') {
        await aprobarSolicitudPlanta(solicitud.id_solicitud_planta, {
          id_comuna: Number(ficha.id_comuna),
          direccion: ficha.direccion.trim(),
          potencia_kw: Number(ficha.potencia_kw),
          inversor: ficha.inversor.trim(),
          paneles: ficha.paneles.trim(),
          baterias: ficha.baterias.trim() || null,
          fecha_instalacion: ficha.fecha_instalacion,
          respuesta: respuesta.trim() || undefined,
          suscripcion: conPlan
            ? { monto_mensual: Number(plan.monto_mensual || precioPlan), dia_cobro: Number(plan.dia_cobro) }
            : undefined,
        });
      } else {
        await rechazarSolicitudPlanta(solicitud.id_solicitud_planta, respuesta.trim());
      }
      await onListo();
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  if (!modo) {
    return (
      <div className="acciones">
        <button className="boton" onClick={() => setModo('aprobar')}>Completar ficha y crear planta</button>
        <button className="boton secundario" onClick={() => setModo('rechazar')}>Rechazar</button>
      </div>
    );
  }
  return (
    <form className="formulario-simple" onSubmit={enviar} style={{ marginTop: '1rem' }}>
      <Mensaje error={error} />
      {modo === 'aprobar' && (
        <>
          <div className="fila" style={{ marginTop: 0 }}>
            <label>Comuna
              <select value={ficha.id_comuna} onChange={cambiar('id_comuna')} required>
                {comunas.map((c) => <option key={c.id_comuna} value={c.id_comuna}>{c.nombre}</option>)}
              </select>
            </label>
            <label>Potencia (kW)
              <input type="number" min="0.1" max="9999.99" step="0.01" value={ficha.potencia_kw} onChange={cambiar('potencia_kw')} required />
            </label>
          </div>
          <label>Dirección<input value={ficha.direccion} onChange={cambiar('direccion')} required maxLength={200} /></label>
          <div className="fila" style={{ marginTop: 0 }}>
            <label>Inversor<input value={ficha.inversor} onChange={cambiar('inversor')} required maxLength={100} placeholder="Marca y modelo" /></label>
            <label>Paneles<input value={ficha.paneles} onChange={cambiar('paneles')} required maxLength={100} placeholder="Ej.: 10 × 450 W" /></label>
          </div>
          <div className="fila" style={{ marginTop: 0 }}>
            <label>Baterías <span className="opcional">{solicitud.tiene_baterias === false ? '(el cliente indicó que no tiene)' : '(vacío si no tiene)'}</span>
              <input value={ficha.baterias} onChange={cambiar('baterias')} maxLength={100} required={solicitud.tiene_baterias === true}
                placeholder={solicitud.tiene_baterias === true ? 'El cliente indicó que tiene baterías' : 'Marca y capacidad'} />
            </label>
            <label>Fecha de instalación<input type="date" value={ficha.fecha_instalacion} onChange={cambiar('fecha_instalacion')} max={hoy()} required /></label>
          </div>
          <label className="ver-contrasena">
            <input type="checkbox" checked={conPlan} onChange={(e) => setConPlan(e.target.checked)} />
            El cliente ya contrató el plan de mantención: crear también su suscripción
          </label>
          {conPlan && (
            <div className="fila" style={{ marginTop: 0 }}>
              <label>Cuota mensual
                <input type="number" min="1" step="1" value={plan.monto_mensual} placeholder={precioPlan ? String(precioPlan) : ''}
                  onChange={(e) => setPlan((p) => ({ ...p, monto_mensual: e.target.value }))} required={!precioPlan} />
              </label>
              <label>Día de cobro
                <input type="number" min="1" max="28" value={plan.dia_cobro} onChange={(e) => setPlan((p) => ({ ...p, dia_cobro: e.target.value }))} required />
              </label>
            </div>
          )}
          {conPlan && <p className="texto-suave" style={{ margin: 0 }}>El cliente igual deberá aceptar las condiciones al inscribir su tarjeta en «Mi cuenta».</p>}
        </>
      )}
      <label>
        {modo === 'aprobar' ? <>Mensaje para el cliente <span className="opcional">(opcional)</span></> : 'Motivo del rechazo (lo verá el cliente)'}
        <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={2} maxLength={500} required={modo === 'rechazar'}
          placeholder={modo === 'aprobar' ? 'Ej.: registramos tu planta; puedes solicitar su suscripción desde Mi cuenta' : 'Ej.: la dirección corresponde a una planta de otro cliente'} />
      </label>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className={modo === 'aprobar' ? 'boton' : 'boton peligro'} disabled={enviando}>
          {enviando ? 'Guardando…' : modo === 'aprobar' ? 'Crear planta' : 'Rechazar solicitud'}
        </button>
        <button type="button" className="boton secundario" onClick={() => setModo(null)} disabled={enviando}>Volver</button>
      </div>
    </form>
  );
}

// Solicitudes de nueva planta de clientes que ya tienen cuenta (CU-36)
export default function SolicitudesPlantaPage() {
  const [estado, setEstado] = useState('pendiente');
  const [solicitudes, setSolicitudes] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [precioPlan, setPrecioPlan] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    return listarSolicitudesPlanta(estado).then(setSolicitudes).catch(setError).finally(() => setCargando(false));
  }, [estado]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { listarComunas().then(setComunas).catch(setError); }, []);
  // Precio sugerido para la suscripción: el plan activo más económico del catálogo
  useEffect(() => {
    listarCatalogo()
      .then((c) => setPrecioPlan(c.filter((i) => i.tipo === 'plan' && i.activo).map((i) => i.precio).sort((a, b) => a - b)[0] ?? null))
      .catch(() => {});
  }, []);

  return (
    <section>
      <div className="encabezado">
        <h1>Solicitudes de nueva planta</h1>
        <div className="segmentado" role="group" aria-label="Filtrar por estado">
          {[['pendiente', 'Pendientes'], ['', 'Todas']].map(([v, t]) => (
            <button key={t} type="button" className={estado === v ? 'activo' : ''} onClick={() => setEstado(v)}>{t}</button>
          ))}
        </div>
      </div>
      <p className="texto-suave">
        Clientes con cuenta que instalaron otra planta. Al aprobar completas la ficha técnica y la planta se crea a su nombre;
        después puedes ofrecerle una suscripción.
      </p>
      <Mensaje error={error} />
      {cargando && <p className="cargando">Cargando…</p>}
      {!cargando && solicitudes.length === 0 && (
        <div className="tarjeta vacio"><Icono nombre="ok" tamano={30} /><p>No hay solicitudes {estado ? 'pendientes' : ''}.</p></div>
      )}

      <div className="columnas">
        {solicitudes.map((s) => (
          <article key={s.id_solicitud_planta} className="tarjeta">
            <div className="encabezado">
              <h2 style={{ margin: 0 }}>{s.cliente}</h2>
              <span className={`etiqueta ${ESTADO[s.estado].clase}`}>{ESTADO[s.estado].texto}</span>
            </div>
            <dl className="ficha">
              <div><dt>Dirección</dt><dd>{s.direccion}, {s.comuna}</dd></div>
              <div><dt>RUT</dt><dd>{s.rut}</dd></div>
              {s.telefono && <div><dt>Teléfono</dt><dd><a href={`tel:${s.telefono}`}>{s.telefono}</a></dd></div>}
              <div><dt>Plantas actuales</dt><dd>{s.plantas_del_cliente}</dd></div>
              <div><dt>Potencia indicada</dt><dd>{s.potencia_kw ? `${s.potencia_kw} kW` : 'No la indicó'}</dd></div>
              <div><dt>Baterías</dt><dd>{BATERIAS[s.tiene_baterias]}</dd></div>
              <div><dt>Solicitada</dt><dd>{fechaDeMarca(s.fecha_solicitud)}</dd></div>
              {s.mensaje && <div><dt>Mensaje</dt><dd>{s.mensaje}</dd></div>}
              {s.respuesta && <div><dt>Respuesta</dt><dd>{s.respuesta}</dd></div>}
              {s.id_planta && <div><dt>Planta creada</dt><dd><Link to={`/admin/plantas/${s.id_planta}`}>Ver ficha</Link></dd></div>}
              {s.resuelta_por_nombre && <div><dt>Resuelta por</dt><dd>{s.resuelta_por_nombre}</dd></div>}
            </dl>
            {s.estado === 'pendiente' && <Resolver solicitud={s} comunas={comunas} precioPlan={precioPlan} onListo={cargar} />}
          </article>
        ))}
      </div>
    </section>
  );
}
