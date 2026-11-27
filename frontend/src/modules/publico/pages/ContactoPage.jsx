// ============================================================================
// PANTALLA: Contacto · URL /contacto · Rol: público (sin sesión)
// Casos de uso: CU-35
// Datos: ninguno: solo enlaces a WhatsApp/correo (shared/utils/contacto.js) y a /solicitar-cuenta
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { Link } from 'react-router-dom';
import EscenaPublica, { PortadaPublica } from '../components/EscenaPublica.jsx';
import { CONTACTO, enlaceCorreo, enlaceTelefono, enlaceWhatsapp } from '../../../shared/utils/contacto.js';
import {
  IconoCandado, IconoCorreo, IconoFlecha, IconoInstagram, IconoPanel, IconoRayo, IconoTarjeta,
  IconoTelefono, IconoWhatsapp,
} from '../components/IconosPublicos.jsx';

// Cada motivo lleva al canal que lo resuelve más rápido, con el mensaje ya escrito
const MOTIVOS = [
  {
    icono: <IconoPanel />,
    titulo: 'Quiero contratar un plan',
    texto: 'Solicita tu cuenta con los datos de tu planta y te contactamos para activarla.',
    accion: 'Solicitar cuenta',
    ruta: '/solicitar-cuenta',
  },
  {
    icono: <IconoCandado />,
    titulo: 'Ya soy cliente y no puedo entrar',
    texto: 'Olvidaste tu contraseña o tu cuenta aparece desactivada. El administrador la restablece.',
    accion: 'Escribir por WhatsApp',
    href: enlaceWhatsapp('Hola ENINTI, soy cliente y no puedo iniciar sesión en la plataforma. Mi RUT es: '),
  },
  {
    icono: <IconoRayo />,
    titulo: 'Falla en mi planta',
    texto: 'Tu inversor marca error o la planta dejó de generar. Coordinamos una visita correctiva.',
    accion: 'Reportar por WhatsApp',
    href: enlaceWhatsapp('Hola ENINTI, mi planta solar presenta una falla. Dirección: \nQué ocurre: '),
    urgente: true,
  },
  {
    icono: <IconoTarjeta />,
    titulo: 'Pagos y cobros',
    texto: 'Dudas sobre una cuota, un cobro rechazado o tu medio de pago inscrito.',
    accion: 'Escribir un correo',
    href: enlaceCorreo('Consulta sobre pagos'),
  },
];

const CANALES = [
  { clase: 'whatsapp', icono: <IconoWhatsapp tamano={24} />, nombre: 'WhatsApp', dato: CONTACTO.telefono, href: enlaceWhatsapp(), externo: true },
  { clase: 'telefono', icono: <IconoTelefono tamano={24} />, nombre: 'Teléfono', dato: CONTACTO.telefono, href: enlaceTelefono() },
  { clase: 'correo', icono: <IconoCorreo tamano={24} />, nombre: 'Correo', dato: CONTACTO.correo, href: enlaceCorreo() },
  { clase: 'instagram', icono: <IconoInstagram tamano={24} />, nombre: 'Instagram', dato: '@eninticl', href: CONTACTO.instagram, externo: true },
];

// Contactar a un administrador: guía por motivo y canales directos, sin iniciar sesión
export default function ContactoPage() {
  return (
    <EscenaPublica titulo="Contacto">
      <PortadaPublica etiqueta="Atención directa del equipo ENINTI" titulo="Habla con un" destacado="administrador.">
        Cuéntanos qué necesitas y te llevamos al canal que lo resuelve más rápido.
      </PortadaPublica>

      <section aria-labelledby="con-motivos">
        <h2 id="con-motivos" className="pub-h2">¿En qué te ayudamos?</h2>
        <ul className="con-motivos">
          {MOTIVOS.map((m) => {
            const contenido = (
              <>
                <span className="login-perfil-icono">{m.icono}</span>
                <strong>{m.titulo}</strong>
                <span className="login-perfil-texto">{m.texto}</span>
                <span className="con-accion">{m.accion} <IconoFlecha tamano={18} /></span>
              </>
            );
            return (
              <li key={m.titulo}>
                {m.ruta ? (
                  <Link className={`login-perfil con-motivo ${m.urgente ? 'urgente' : ''}`} to={m.ruta}>{contenido}</Link>
                ) : (
                  <a
                    className={`login-perfil con-motivo ${m.urgente ? 'urgente' : ''}`}
                    href={m.href}
                    {...(m.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {contenido}
                    {m.href.startsWith('http') && <span className="login-oculto"> (abre en otra pestaña)</span>}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="pub-seccion" aria-labelledby="con-canales">
        <div className="cuadro-luz con-cuadro">
          <div className="con-canales-caja">
            <h2 id="con-canales" className="pub-h3">Canales directos</h2>
            <ul className="con-canales">
              {CANALES.map((c) => (
                <li key={c.nombre}>
                  <a
                    className={`con-canal ${c.clase}`}
                    href={c.href}
                    {...(c.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    <span className="con-canal-icono">{c.icono}</span>
                    <span>
                      <strong>{c.nombre}</strong>
                      <span>{c.dato}</span>
                    </span>
                    {c.externo && <span className="login-oculto"> (abre en otra pestaña)</span>}
                  </a>
                </li>
              ))}
            </ul>
            <p className="con-nota">
              Si ya tienes cuenta, también puedes pedir una mantención desde tu panel en{' '}
              <Link to="/login">Iniciar sesión</Link>.
            </p>
          </div>
        </div>
      </section>
    </EscenaPublica>
  );
}
