import { useId, useState } from 'react';
import { formatoPesos } from '../../../shared/utils/formato.js';

// ============================================================================
// CU-09 · «include» Aceptar condiciones (HU-13, RF-19, Ley 21.719)
// ----------------------------------------------------------------------------
// Antes de ir a la pasarela, el cliente LEE las condiciones del servicio y marca
// la casilla «Acepto». Recién entonces se habilita «Aceptar y continuar».
// La aceptación (fecha, versión e IP) la guarda el backend en la tabla
// aceptacion_condiciones: cliente.service.js → iniciarInscripcion().
//
// Si cambia el texto de las condiciones, sube VERSION_CONDICIONES: así queda
// registrado qué versión aceptó cada cliente.
// NOTA: texto de demostración del prototipo; la versión definitiva la valida ENINTI.
// ============================================================================
export const VERSION_CONDICIONES = '1.0';

// Cláusulas que se muestran al cliente. Recibe la suscripción para mostrar su cuota real.
const clausulas = (s) => [
  `Plan de mantención mensual para la planta de ${s.direccion}, con una cuota de ${formatoPesos(s.monto_mensual)} (IVA incluido).`,
  'Autorizas a ENINTI a cobrar la cuota cada mes, en el día de cobro pactado, en la tarjeta que inscribas.',
  'ENINTI no guarda el número de tu tarjeta: solo una referencia (token) entregada por la pasarela de pago y sus últimos 4 dígitos.',
  'Si un cobro no se puede realizar, la cuota queda pendiente. Con una cuota vencida la suscripción sigue activa «con deuda»; si la deuda supera un mes, la suscripción se cancela por morosidad.',
  'El plan incluye las mantenciones preventivas pactadas al contratar. Las visitas correctivas se coordinan con la administración.',
  'Puedes cancelar la suscripción cuando quieras desde «Mi cuenta». La cancelación es definitiva y no genera nuevas cuotas.',
  'Tus datos personales se usan solo para prestar el servicio y se tratan conforme a la Ley 21.719 de protección de datos personales.',
];

/**
 * Panel de condiciones dentro de la tarjeta de la suscripción.
 * @param {object}   suscripcion  Suscripción vigente (dirección y cuota)
 * @param {function} onAceptar    Se llama con la versión aceptada cuando el cliente confirma
 * @param {function} onCancelar   Cierra el panel sin aceptar
 * @param {boolean}  enviando     Deshabilita los botones mientras se contacta a la pasarela
 */
export default function AceptarCondiciones({ suscripcion, onAceptar, onCancelar, enviando }) {
  const [acepta, setAcepta] = useState(false); // la casilla empieza SIEMPRE sin marcar
  const idTitulo = useId();

  function enviar(e) {
    e.preventDefault();
    if (acepta) onAceptar(VERSION_CONDICIONES);
  }

  return (
    <form className="formulario-simple condiciones" onSubmit={enviar} aria-labelledby={idTitulo}>
      <h4 id={idTitulo} style={{ margin: 0 }}>Condiciones del servicio · versión {VERSION_CONDICIONES}</h4>
      <ol className="condiciones-texto" tabIndex={0}>
        {clausulas(suscripcion).map((texto) => <li key={texto}>{texto}</li>)}
      </ol>
      <label className="ver-contrasena">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
        He leído y acepto las condiciones del servicio
      </label>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton" disabled={!acepta || enviando} aria-busy={enviando}>
          {enviando ? 'Conectando con la pasarela…' : 'Aceptar y continuar'}
        </button>
        <button type="button" className="boton secundario" onClick={onCancelar} disabled={enviando}>Volver</button>
      </div>
    </form>
  );
}
