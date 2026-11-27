// ============================================================================
// PANTALLA: Mi cuenta · URL /cliente/cuenta · Rol: cliente
// Casos de uso: CU-04 estado de cuenta · CU-08 cancelar · CU-09 inscribir tarjeta («include» condiciones) · CU-24 pedir suscripción
// Datos: clienteService.miCuenta() → GET /api/cliente/cuenta → cliente.service.js · cuenta()
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { miCuenta, cancelarSuscripcion, iniciarInscripcion, solicitarSuscripcion } from '../services/clienteService.js';
import EstadoSuscripcion from '../../administrador/components/EstadoSuscripcion.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import ArcoSolar, { saludo } from '../../../shared/components/ArcoSolar.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { formatoPesos, formatoFecha } from '../../../shared/utils/formato.js';
import AceptarCondiciones from '../components/AceptarCondiciones.jsx';

const MOTIVO_CANCELACION = {
  cliente: 'La cancelaste tú',
  morosidad: 'Se canceló porque la deuda superó un mes',
  administrador: 'La canceló la administración',
};

// [CU-24]
// Pedir una suscripción para una planta: solo el administrador la otorga
function PedirSuscripcion({ planta, onEnviada }) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await solicitarSuscripcion({ id_planta: planta.id_planta, mensaje: mensaje.trim() || undefined });
      await onEnviada();
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  if (!abierto) {
    return <button className="boton" onClick={() => setAbierto(true)}>Solicitar suscripción</button>;
  }
  return (
    <form className="formulario-simple" onSubmit={enviar}>
      <Mensaje error={error} />
      <label>
        Mensaje para la administración <span className="opcional">(opcional)</span>
        <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={2} maxLength={500}
          placeholder="Ej.: quiero retomar el plan y pagar la deuda en dos cuotas" />
      </label>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
        <button type="button" className="boton secundario" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </form>
  );
}

// Mi Cuenta: pagos, deuda e historial en pocas acciones (HU-08, RNF-01).
// Incluye inscribir medio de pago (HU-13), cancelar suscripción (HU-12) y pedir una nueva.
export default function CuentaPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [accion, setAccion] = useState(null); // id de suscripción en proceso
  const [condicionesPara, setCondicionesPara] = useState(null); // id de suscripción con las condiciones abiertas
  const resultadoInscripcion = params.get('inscripcion');

  // Pide todos los datos de «Mi cuenta» (se llama al entrar y después de cada acción).
  const cargar = useCallback(() => miCuenta().then(setDatos).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  // CU-09 Inscribir medio de pago. Solo se llama DESPUÉS de que el cliente marcó
  // «Acepto» en <AceptarCondiciones> («include» Aceptar condiciones, RF-19).
  // El backend registra la aceptación y responde con la URL de la pasarela.
  async function inscribir(idSuscripcion, versionAceptada) {
    setAccion(idSuscripcion);
    setError(null);
    try {
      const { url_pasarela } = await iniciarInscripcion(idSuscripcion, {
        acepta_condiciones: true,
        version_condiciones: versionAceptada,
      });
      // En modo simulado la URL es una ruta interna; en sandbox sería del proveedor
      if (url_pasarela.startsWith('/')) navigate(url_pasarela);
      else window.location.assign(url_pasarela);
    } catch (err) {
      setError(err);
      setAccion(null);
    }
  }

  // CU-08 Cancelar suscripción: pide confirmación y el backend la cancela de forma definitiva
  async function cancelar(idSuscripcion) {
    if (!window.confirm('¿Cancelar esta suscripción? Para volver a tenerla deberás enviar una nueva solicitud a la administración.')) return;
    setAccion(idSuscripcion);
    setError(null);
    try {
      await cancelarSuscripcion(idSuscripcion);
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setAccion(null);
    }
  }

  if (error && !datos) return <Mensaje error={error} />;
  if (!datos) return <p className="cargando">Cargando…</p>;

  const { suscripciones, deuda_total, cuotas_pendientes, pagos, medio_pago, medios_pago,
    plantas_sin_suscripcion: sinSuscripcion, solicitudes_suscripcion: solicitudes } = datos;
  const vigentes = suscripciones.filter((s) => s.estado !== 'cancelada');
  const conDeuda = vigentes.some((s) => s.estado === 'con_deuda');
  const ultimoIntento = medios_pago[0];
  const tarjetaRechazada = !medio_pago && ultimoIntento?.estado === 'rechazado';

  // Para cada planta sin suscripción: su última suscripción cancelada y su solicitud más reciente
  const ultimaCancelada = (idPlanta) => suscripciones.find((s) => s.id_planta === idPlanta && s.estado === 'cancelada');
  const solicitudDe = (idPlanta) => solicitudes.find((s) => s.id_planta === idPlanta);

  let resumen = 'Estás al día. Gracias por mantener tu planta con ENINTI.';
  if (conDeuda) resumen = `Tu suscripción sigue activa, pero tienes ${formatoPesos(deuda_total)} pendiente. Si la deuda supera un mes, la suscripción se cancela.`;
  else if (deuda_total > 0) resumen = `Tienes ${formatoPesos(deuda_total)} de deuda pendiente.`;

  return (
    <section>
      <ArcoSolar titulo={`${saludo()}, ${usuario?.nombre?.split(' ')[0] ?? ''}`}>
        <p>{resumen}</p>
      </ArcoSolar>

      {resultadoInscripcion && (
        <div className={resultadoInscripcion === 'aprobada' ? 'mensaje-ok' : 'mensaje-error'} role="status">
          {resultadoInscripcion === 'aprobada'
            ? <>Tarjeta inscrita. Las próximas cuotas se cobrarán automáticamente.</>
            : resultadoInscripcion === 'error'
              ? <><strong>No pudimos confirmar la inscripción con la pasarela.</strong> Intenta de nuevo en unos minutos.</>
              : <><strong>La pasarela rechazó tu tarjeta.</strong> No se guardó ningún medio de pago; intenta con otra tarjeta.</>}
          {' '}<button type="button" className="enlace-boton" onClick={() => setParams({}, { replace: true })}>Cerrar</button>
        </div>
      )}

      <div className="resumen-tiras">
        <div className={`tira ${deuda_total > 0 ? 'tira-alerta' : 'tira-ok'}`}>
          <span className="tira-icono"><Icono nombre={deuda_total > 0 ? 'impagos' : 'ok'} /></span>
          <span className="tira-valor">{deuda_total > 0 ? formatoPesos(deuda_total) : 'Al día'}</span>
          <span className="tira-texto">{deuda_total > 0 ? 'Deuda pendiente' : 'Sin deuda'}</span>
        </div>
        <div className="tira">
          <span className="tira-icono"><Icono nombre="planta" /></span>
          <span className="tira-valor">{vigentes.length}</span>
          <span className="tira-texto">Suscripciones activas</span>
        </div>
        <div className={`tira ${medio_pago ? 'tira-ok' : tarjetaRechazada ? 'tira-alerta' : ''}`}>
          <span className="tira-icono"><Icono nombre="pagos" /></span>
          <span className="tira-valor">
            {medio_pago ? `•••• ${medio_pago.ultimos_4}` : tarjetaRechazada ? 'Rechazada' : 'Sin inscribir'}
          </span>
          <span className="tira-texto">Medio de pago</span>
        </div>
      </div>

      <Mensaje error={error} />

      <h2>Mis suscripciones</h2>
      <div className="columnas">
        {vigentes.map((s) => (
          <article key={s.id_suscripcion} className="tarjeta">
            <div className="encabezado">
              <h3 style={{ margin: 0 }}>{s.direccion}</h3>
              <EstadoSuscripcion estado={s.estado} />
            </div>
            {s.estado === 'con_deuda' && (
              <p className="aviso-seguridad">Sigue activa con {formatoPesos(s.deuda)} pendiente. Al pagar vuelves a estar al día.</p>
            )}
            <dl className="ficha">
              <div><dt>Comuna</dt><dd>{s.comuna}</dd></div>
              <div><dt>Cuota mensual</dt><dd>{formatoPesos(s.monto_mensual)}</dd></div>
              <div><dt>Meses pagados</dt><dd>{s.meses_pagados}</dd></div>
              <div><dt>Cuotas vencidas</dt><dd>{s.cuotas_vencidas}</dd></div>
            </dl>
            {condicionesPara === s.id_suscripcion ? (
              // Paso 1 de CU-09: leer y aceptar las condiciones antes de ir a la pasarela
              <AceptarCondiciones
                suscripcion={s}
                enviando={accion === s.id_suscripcion}
                onAceptar={(version) => inscribir(s.id_suscripcion, version)}
                onCancelar={() => setCondicionesPara(null)}
              />
            ) : (
              <div className="acciones">
                {!medio_pago && (
                  <button className="boton" disabled={accion === s.id_suscripcion} onClick={() => setCondicionesPara(s.id_suscripcion)}>
                    {tarjetaRechazada ? 'Inscribir otra tarjeta' : 'Inscribir medio de pago'}
                  </button>
                )}
                <button className="boton peligro" disabled={accion === s.id_suscripcion} onClick={() => cancelar(s.id_suscripcion)}>
                  Cancelar suscripción
                </button>
              </div>
            )}
          </article>
        ))}

        {sinSuscripcion.map((p) => {
          const anterior = ultimaCancelada(p.id_planta);
          const solicitud = solicitudDe(p.id_planta);
          const pendiente = solicitud?.estado === 'pendiente';
          return (
            <article key={`p${p.id_planta}`} className="tarjeta">
              <div className="encabezado">
                <h3 style={{ margin: 0 }}>{p.direccion}</h3>
                <EstadoSuscripcion estado={anterior ? 'cancelada' : null} />
              </div>
              {anterior ? (
                <p className="texto-suave">
                  {MOTIVO_CANCELACION[anterior.motivo_cancelacion] ?? 'Cancelada'} el {formatoFecha(anterior.fecha_cancelacion)}.
                  {anterior.deuda > 0 && <> Queda una deuda de <strong>{formatoPesos(anterior.deuda)}</strong>.</>}
                </p>
              ) : (
                <p className="texto-suave">Esta planta aún no tiene un plan de mantención.</p>
              )}

              {pendiente && (
                <p className="mensaje-ok" style={{ margin: 0 }}>
                  Enviaste una solicitud el {formatoFecha(solicitud.fecha_solicitud.slice(0, 10))}. La administración te responderá.
                </p>
              )}
              {solicitud?.estado === 'rechazada' && (
                <p className="aviso-seguridad">Tu última solicitud no fue aceptada: {solicitud.respuesta}</p>
              )}
              {!pendiente && (
                <>
                  <p>Para volver a tener mantención, envía una solicitud. La administración revisará tu caso y te contactará.</p>
                  <PedirSuscripcion planta={p} onEnviada={cargar} />
                </>
              )}
            </article>
          );
        })}
      </div>

      {cuotas_pendientes.length > 0 && (
        <>
          <h2>Cuotas por pagar</h2>
          <table className="tabla">
            <thead>
              <tr><th>Período</th><th>Planta</th><th>Monto</th><th>Vence</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {cuotas_pendientes.map((c, i) => (
                <tr key={i}>
                  <td data-label="Período">{c.periodo}</td>
                  <td data-label="Planta">{c.direccion}</td>
                  <td data-label="Monto">{formatoPesos(c.monto)}</td>
                  <td data-label="Vence">{formatoFecha(c.fecha_vencimiento)}</td>
                  <td data-label="Estado">
                    <span className={`etiqueta ${c.estado === 'vencida' ? 'alerta' : 'neutro'}`}>{c.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Historial de pagos</h2>
      {pagos.length === 0 ? (
        <div className="tarjeta vacio"><Icono nombre="pagos" tamano={30} /><p>Aún no hay pagos registrados. Aparecerán aquí cuando pagues tu primera cuota.</p></div>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Fecha</th><th>Período</th><th>Planta</th><th>Monto</th><th>Origen</th></tr>
          </thead>
          <tbody>
            {pagos.map((p, i) => (
              <tr key={i}>
                <td data-label="Fecha">{new Date(p.fecha_pago).toLocaleDateString('es-CL')}</td>
                <td data-label="Período">{p.periodo}</td>
                <td data-label="Planta">{p.direccion}</td>
                <td data-label="Monto">{formatoPesos(p.monto)}</td>
                <td data-label="Origen">{p.origen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
