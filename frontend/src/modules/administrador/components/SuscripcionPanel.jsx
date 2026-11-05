import { useState } from 'react';
import { actualizarSuscripcion, crearSuscripcion } from '../services/plantasService.js';
import EstadoSuscripcion from './EstadoSuscripcion.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha, formatoPesos, hoy } from '../../../shared/utils/formato.js';

export default function SuscripcionPanel({ plantaId, suscripciones, onCambio }) {
  const vigente = suscripciones.find((s) => s.estado !== 'cancelada');
  const historial = suscripciones.filter((s) => s.estado === 'cancelada');

  const [monto, setMonto] = useState('');
  const [fechaInicio, setFechaInicio] = useState(hoy());
  const [diaCobro, setDiaCobro] = useState('1');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function ejecutar(accion) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      setMonto('');
      await onCambio();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  const crear = (e) => {
    e.preventDefault();
    ejecutar(() => crearSuscripcion(plantaId, {
      monto_mensual: Number(monto),
      fecha_inicio: fechaInicio,
      dia_cobro: Number(diaCobro),
    }));
  };

  const cambiarMonto = (e) => {
    e.preventDefault();
    ejecutar(() => actualizarSuscripcion(vigente.id_suscripcion, { monto_mensual: Number(monto) }));
  };

  const cambiarEstado = (estado) => ejecutar(() => actualizarSuscripcion(vigente.id_suscripcion, { estado }));

  const cancelar = () => {
    if (window.confirm('¿Cancelar la suscripción? Esta acción no se puede deshacer.')) {
      cambiarEstado('cancelada');
    }
  };

  const campoMonto = (
    <input
      type="number"
      min="1"
      step="1"
      placeholder="Monto en pesos"
      value={monto}
      onChange={(e) => setMonto(e.target.value)}
      required
    />
  );

  return (
    <article className="tarjeta">
      <h2>Suscripción mensual</h2>
      <Mensaje error={error} />

      {vigente ? (
        <>
          <dl className="ficha">
            <div><dt>Cuota mensual</dt><dd>{formatoPesos(vigente.monto_mensual)}</dd></div>
            <div><dt>Día de cobro</dt><dd>{vigente.dia_cobro} de cada mes</dd></div>
            <div><dt>Mantenciones</dt><dd>{vigente.mantenciones_anuales} al año</dd></div>
            <div><dt>Estado</dt><dd><EstadoSuscripcion estado={vigente.estado} /></dd></div>
            <div><dt>Desde</dt><dd>{formatoFecha(vigente.fecha_inicio)}</dd></div>
          </dl>

          <form className="fila" onSubmit={cambiarMonto}>
            <label>
              Cambiar cuota mensual
              {campoMonto}
            </label>
            <button type="submit" className="boton secundario" disabled={enviando || !monto}>Cambiar</button>
          </form>

          <div className="acciones">
            {vigente.estado === 'al_dia' ? (
              <button className="boton secundario" disabled={enviando} onClick={() => cambiarEstado('morosa')}>
                Marcar morosa
              </button>
            ) : (
              <button className="boton secundario" disabled={enviando} onClick={() => cambiarEstado('al_dia')}>
                Marcar al día
              </button>
            )}
            <button className="boton peligro" disabled={enviando} onClick={cancelar}>Cancelar suscripción</button>
          </div>
        </>
      ) : (
        <form className="formulario-simple" onSubmit={crear}>
          <p>Esta planta no tiene una suscripción vigente.</p>
          <label>
            Cuota mensual
            {campoMonto}
          </label>
          <label>
            Fecha de inicio
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
          </label>
          <label>
            Día de cobro
            <input type="number" min="1" max="28" step="1" value={diaCobro} onChange={(e) => setDiaCobro(e.target.value)} required />
          </label>
          <button type="submit" className="boton" disabled={enviando || !monto}>Crear suscripción</button>
        </form>
      )}

      {historial.length > 0 && (
        <>
          <h3>Suscripciones anteriores</h3>
          <ul className="historial">
            {historial.map((s) => (
              <li key={s.id_suscripcion}>
                {formatoPesos(s.monto_mensual)}/mes · {formatoFecha(s.fecha_inicio)} al {formatoFecha(s.fecha_cancelacion)}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
