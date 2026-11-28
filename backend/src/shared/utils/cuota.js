// Regla única para la cuota mensual de una suscripción (CU-14, CU-28, CU-36).
// Un monto simbólico (p. ej. $1) se acepta técnicamente pero distorsiona la recaudación y el
// listado de impagos, por eso se fija un mínimo razonable en pesos chilenos (enteros, IVA incluido).
export const CUOTA_MINIMA = 1000;
export const CUOTA_MAXIMA = 10_000_000;

export const esCuotaMensual = (v) => Number.isInteger(v) && v >= CUOTA_MINIMA && v <= CUOTA_MAXIMA;

export const MENSAJE_CUOTA = `La cuota mensual debe ser un monto entero entre $${CUOTA_MINIMA.toLocaleString('es-CL')} y $${CUOTA_MAXIMA.toLocaleString('es-CL')}`;
