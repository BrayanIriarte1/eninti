import { useCallback, useEffect, useState } from 'react';
import { estadoCorreo, enviarCorreoPrueba } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import { useAuth } from '../../../shared/context/AuthContext.jsx';

const PROVEEDOR = { consola: 'Solo terminal (desarrollo)', brevo: 'Brevo', resend: 'Resend' };
const MOTIVO = {
  suscripcion_confirmada: 'Suscripción activa',
  mantencion_programada: 'Visita programada',
  mantencion_asignada: 'Visita asignada al técnico',
  cobro_rechazado: 'Cobro rechazado',
  recuperar_contrasena: 'Recuperar contraseña',
  contrasena_cambiada: 'Contraseña cambiada',
  prueba: 'Prueba',
};
const fechaHora = (iso) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

// Correos de la plataforma: si están configurados, la bitácora de avisos y un envío de prueba
export default function CorreosPage() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [para, setPara] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cargar = useCallback(() => estadoCorreo().then(setDatos).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  async function probar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(await enviarCorreoPrueba(para.trim() || undefined));
      await cargar();
    } catch (err) { setError(err); } finally { setEnviando(false); }
  }

  if (!datos) return error ? <Mensaje error={error} /> : <p className="cargando">Cargando…</p>;

  const real = datos.modo !== 'consola';
  const listo = real && datos.advertencias.length === 0;

  return (
    <section>
      <div className="encabezado"><h1>Correos</h1></div>

      <div className="resumen-tiras">
        <div className={`tira ${listo ? 'tira-ok' : 'tira-alerta'}`}>
          <span className="tira-icono"><Icono nombre={listo ? 'ok' : 'impagos'} /></span>
          <span className="tira-valor">{listo ? 'Activo' : real ? 'Revisar' : 'Sin envío'}</span>
          <span className="tira-texto">{PROVEEDOR[datos.modo] ?? datos.modo}</span>
        </div>
        <div className="tira tira-ok">
          <span className="tira-icono"><Icono nombre="ok" /></span>
          <span className="tira-valor">{datos.semana.enviados}</span>
          <span className="tira-texto">Enviados en 7 días</span>
        </div>
        <div className={`tira ${datos.semana.fallidos ? 'tira-alerta' : ''}`}>
          <span className="tira-icono"><Icono nombre="impagos" /></span>
          <span className="tira-valor">{datos.semana.fallidos}</span>
          <span className="tira-texto">Fallidos en 7 días</span>
        </div>
      </div>

      <div className="columnas">
        <article className="tarjeta">
          <div className="panel-titulo"><h2>Configuración</h2></div>
          {!real && (
            <p className="aviso-seguridad">
              Los correos solo se muestran en la terminal del servidor: a los usuarios no les llega nada.
              Configura Brevo siguiendo la guía de <code>docs/CORREO.md</code>.
            </p>
          )}
          {datos.advertencias.length > 0 && (
            <ul className="lista-advertencias">
              {datos.advertencias.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          <dl className="ficha">
            <div><dt>Proveedor</dt><dd>{PROVEEDOR[datos.modo] ?? datos.modo}</dd></div>
            <div><dt>Remitente</dt><dd>{datos.remitente}</dd></div>
            <div><dt>Clave API</dt><dd>{datos.clave_configurada ? 'Configurada' : 'No configurada'}</dd></div>
            <div><dt>Enlaces</dt><dd>{datos.app_url ?? 'Falta APP_URL'}</dd></div>
          </dl>
        </article>

        <article className="tarjeta">
          <div className="panel-titulo"><h2>Enviar un correo de prueba</h2></div>
          <p className="texto-suave">Confirma que el proveedor y el remitente funcionan antes de depender de los avisos.</p>
          <form className="formulario-simple" onSubmit={probar}>
            <Mensaje error={error} />
            <label>Enviar a <span className="opcional">(vacío: {usuario?.email})</span>
              <input type="email" value={para} onChange={(e) => setPara(e.target.value)} placeholder={usuario?.email} />
            </label>
            <button type="submit" className="boton" disabled={enviando} aria-busy={enviando}>
              {enviando ? 'Enviando…' : 'Enviar prueba'}
            </button>
          </form>
          {resultado && (
            resultado.estado === 'enviado' ? (
              <p className="mensaje-ok" role="status">
                {resultado.proveedor === 'consola'
                  ? 'Listo: el correo se mostró en la terminal del servidor (modo consola).'
                  : `Enviado a ${resultado.para}. Revisa la bandeja de entrada y la de spam.`}
              </p>
            ) : (
              <p className="mensaje-error" role="alert">No se pudo enviar: {resultado.detalle}</p>
            )
          )}
        </article>
      </div>

      <h2>Últimos avisos</h2>
      {datos.avisos.length === 0 ? (
        <div className="tarjeta vacio"><Icono nombre="ok" tamano={30} /><p>Aún no se ha enviado ningún aviso.</p></div>
      ) : (
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Para</th><th>Aviso</th><th>Proveedor</th><th>Estado</th></tr></thead>
          <tbody>
            {datos.avisos.map((a) => (
              <tr key={a.id_aviso}>
                <td data-label="Fecha">{fechaHora(a.fecha_envio)}</td>
                <td data-label="Para">{a.destinatario}</td>
                <td data-label="Aviso">{MOTIVO[a.motivo] ?? a.motivo}<small className="celda-sub">{a.asunto}</small></td>
                <td data-label="Proveedor">{PROVEEDOR[a.proveedor] ?? a.proveedor}</td>
                <td data-label="Estado">
                  <span className={`etiqueta ${a.estado === 'enviado' ? 'ok' : 'alerta'}`}>{a.estado === 'enviado' ? 'Enviado' : 'Fallido'}</span>
                  {a.detalle && <small className="celda-sub texto-alerta">{a.detalle}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
