import { useEffect, useRef, useState } from 'react';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos, formatoFecha } from '../../../shared/utils/formato.js';

const ORIGEN = { transferencia: 'Transferencia', efectivo: 'Efectivo' };

// Confirmación del registro manual de un pago (HU-02). El pago solo se registra al presionar
// «Registrar pago»: Cancelar, la tecla Escape o hacer clic fuera cierran sin registrar nada.
// La referencia es obligatoria en transferencias (N° de operación) y opcional en efectivo.
export default function ConfirmarPagoDialogo({ pago, onConfirmar, onCerrar }) {
  const dialogo = useRef(null);
  const [referencia, setReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  const exigeReferencia = pago.origen === 'transferencia';

  async function confirmar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar(referencia.trim() || undefined);
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  function cerrar() {
    if (!enviando) onCerrar();
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby="pago-titulo"
      onCancel={(e) => { e.preventDefault(); cerrar(); }}
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <form className="dialogo-caja" onSubmit={confirmar}>
        <h2 id="pago-titulo">Registrar pago por {ORIGEN[pago.origen].toLowerCase()}</h2>
        <p className="texto-suave">Revisa los datos: al confirmar, la cuota queda pagada y el pago aparece en el listado del mes.</p>

        <dl className="ficha">
          <div><dt>Cliente</dt><dd>{pago.cliente}</dd></div>
          <div><dt>Planta</dt><dd>{pago.direccion}</dd></div>
          <div><dt>Período</dt><dd>{pago.cuota.periodo} · vence {formatoFecha(pago.cuota.fecha_vencimiento)}</dd></div>
          <div><dt>Monto</dt><dd className="dialogo-monto">{formatoPesos(pago.cuota.monto)}</dd></div>
          <div><dt>Forma de pago</dt><dd>{ORIGEN[pago.origen]}</dd></div>
        </dl>

        <Mensaje error={error} />

        <label>
          {exigeReferencia ? 'N° de operación de la transferencia' : <>Referencia <span className="opcional">(opcional: folio o recibo)</span></>}
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            required={exigeReferencia}
            maxLength={80}
            autoFocus
            placeholder={exigeReferencia ? 'Ej.: 0012345678' : 'Ej.: recibo 152'}
          />
        </label>

        <div className="dialogo-acciones">
          <button type="button" className="boton secundario" onClick={cerrar} disabled={enviando}>Cancelar</button>
          <button type="submit" className="boton" disabled={enviando} aria-busy={enviando}>
            {enviando ? 'Registrando…' : `Registrar pago de ${formatoPesos(pago.cuota.monto)}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
