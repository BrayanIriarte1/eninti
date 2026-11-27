// VALIDACIONES DE RUT Y TELÉFONO (CU-02, CU-14, CU-25).
// Rutificador: valida el RUT chileno con su dígito verificador (módulo 11).
// Formato guardado en la base de datos: cuerpo sin puntos, guion y DV en mayúscula (12345678-9).

// Algoritmo módulo 11 del RUT chileno.
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

// Acepta '12.345.678-5', '123456785' o '12345678-5' y devuelve '12345678-5'
export function normalizarRut(valor) {
  const limpio = String(valor ?? '').replace(/[^\dkK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

export function rutValido(valor) {
  const rut = normalizarRut(valor);
  const m = /^(\d{7,8})-([\dK])$/.exec(rut);
  return Boolean(m) && digitoVerificador(m[1]) === m[2];
}

// Teléfono en formato internacional: + código de país y número (8 a 15 dígitos en total)
export const telefonoValido = (valor) => /^\+\d{8,15}$/.test(String(valor ?? '').replace(/\s/g, ''));
