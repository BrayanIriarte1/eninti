// Rutificador del lado del navegador: da formato al RUT mientras se escribe
// (el guion se pone solo antes del dígito verificador) y lo valida con módulo 11.
// El backend repite la validación en backend/src/shared/utils/rut.js.

export function digitoVerificador(cuerpo) {
  let suma = 0;
  let factor = 2;
  for (const d of String(cuerpo).split('').reverse()) {
    suma += Number(d) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

// '123456785' → '12345678-5'. Solo admite dígitos y una K final; máximo 9 caracteres.
export function formatearRut(valor) {
  let limpio = String(valor ?? '').replace(/[^\dkK]/g, '').toUpperCase();
  limpio = limpio.replace(/K(?=.)/g, '').slice(0, 9); // la K solo puede ir al final
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

export function rutValido(valor) {
  const m = /^(\d{7,8})-([\dK])$/.exec(formatearRut(valor));
  return Boolean(m) && digitoVerificador(m[1]) === m[2];
}
