import { useEffect, useRef } from 'react';
import { formatearRut, rutValido } from '../utils/rut.js';

// Campo de RUT con rutificador: el guion se pone solo y el dígito verificador se
// valida mientras se escribe. Un RUT inválido bloquea el envío del formulario.
// Entrega onChange({ target: { name, value } }) para usarse igual que un <input>.
export default function RutInput({ name = 'rut', value, onChange, required, autoFocus }) {
  const ref = useRef(null);
  const completo = value.length >= 9; // 1234567-8 como mínimo
  const valido = rutValido(value);

  useEffect(() => {
    ref.current?.setCustomValidity(value && !valido ? 'RUT inválido: revisa el número y el dígito verificador' : '');
  }, [value, valido]);

  return (
    <>
      <input
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => onChange({ target: { name, value: formatearRut(e.target.value) } })}
        required={required}
        autoFocus={autoFocus}
        inputMode="text"
        autoComplete="off"
        maxLength={10}
        placeholder="12345678-9"
        aria-invalid={completo && !valido}
      />
      {completo && (
        <span className={valido ? 'campo-ok' : 'campo-error'} role="status">
          {valido ? 'RUT válido' : 'Dígito verificador incorrecto'}
        </span>
      )}
    </>
  );
}
