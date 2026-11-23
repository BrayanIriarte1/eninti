import { useCallback, useEffect, useState } from 'react';
import { misDatos, solicitarCambioDatos } from '../services/clienteService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import TelefonoInput from '../../../shared/components/TelefonoInput.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';
import CambiarContrasena from '../../../shared/components/CambiarContrasena.jsx';

const ESTADO = {
  pendiente: { texto: 'En revisión', clase: 'aviso' },
  aprobada: { texto: 'Aprobada', clase: 'ok' },
  rechazada: { texto: 'Rechazada', clase: 'alerta' },
};

// Mis datos: el cliente ve su información y pide cambiar correo o teléfono.
// El cambio se aplica cuando la administración lo aprueba.
export default function MisDatosPage() {
  const [datos, setDatos] = useState(null);
  const [form, setForm] = useState({ email: '', telefono: '', motivo: '' });
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => misDatos().then(setDatos).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await solicitarCambioDatos({
        email: form.email.trim() || undefined,
        telefono: form.telefono || undefined,
        motivo: form.motivo.trim(),
      });
      setForm({ email: '', telefono: '', motivo: '' });
      setAviso('Enviamos tu solicitud. Verás el cambio aquí cuando la administración lo apruebe.');
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  if (error && !datos) return <Mensaje error={error} />;
  if (!datos) return <p className="cargando">Cargando…</p>;

  const pendiente = datos.solicitudes.find((s) => s.estado === 'pendiente');

  return (
    <section>
      <h1>Mis datos</h1>
      <div className="columnas">
        <article className="tarjeta">
          <h2>Datos registrados</h2>
          <dl className="ficha">
            <div><dt>Nombre</dt><dd>{datos.nombre}</dd></div>
            <div><dt>RUT</dt><dd>{datos.rut}</dd></div>
            <div><dt>Correo</dt><dd>{datos.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{datos.telefono ?? '—'}</dd></div>
            {datos.direccion && <div><dt>Dirección</dt><dd>{datos.direccion}</dd></div>}
          </dl>
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            El nombre y el RUT solo los cambia la administración. Para otros cambios, escríbenos al solicitar.
          </p>
        </article>

        <article className="tarjeta">
          <h2>Solicitar un cambio</h2>
          {aviso && <p className="mensaje-ok" role="status">{aviso}</p>}
          {pendiente ? (
            <p className="aviso-seguridad">
              Tienes una solicitud en revisión desde el {formatoFecha(pendiente.fecha_solicitud.slice(0, 10))}.
              Podrás enviar otra cuando la administración la responda.
            </p>
          ) : (
            <form className="formulario-simple" onSubmit={enviar}>
              <Mensaje error={error} />
              <label>
                Nuevo correo <span className="opcional">(déjalo vacío si no cambia)</span>
                <input type="email" name="email" value={form.email} onChange={cambiar} placeholder={datos.email} autoComplete="email" />
              </label>
              <label>
                Nuevo teléfono <span className="opcional">(déjalo vacío si no cambia)</span>
                <TelefonoInput value={form.telefono} onChange={cambiar} />
              </label>
              <label>
                Motivo del cambio
                <textarea name="motivo" value={form.motivo} onChange={cambiar} rows={2} maxLength={300} required
                  placeholder="Ej.: cambié de número de celular" />
              </label>
              <button type="submit" className="boton" disabled={enviando || (!form.email.trim() && !form.telefono) || !form.motivo.trim()}>
                {enviando ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </form>
          )}
        </article>

        <CambiarContrasena />
      </div>

      {datos.solicitudes.length > 0 && (
        <>
          <h2>Mis solicitudes de cambio</h2>
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Cambio pedido</th><th>Motivo</th><th>Estado</th><th>Respuesta</th></tr>
            </thead>
            <tbody>
              {datos.solicitudes.map((s) => (
                <tr key={s.id_solicitud_cambio}>
                  <td data-label="Fecha">{formatoFecha(s.fecha_solicitud.slice(0, 10))}</td>
                  <td data-label="Cambio pedido">
                    {[s.email_nuevo && `Correo: ${s.email_nuevo}`, s.telefono_nuevo && `Teléfono: ${s.telefono_nuevo}`].filter(Boolean).join(' · ')}
                  </td>
                  <td data-label="Motivo">{s.motivo}</td>
                  <td data-label="Estado"><span className={`etiqueta ${ESTADO[s.estado].clase}`}>{ESTADO[s.estado].texto}</span></td>
                  <td data-label="Respuesta">{s.respuesta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
