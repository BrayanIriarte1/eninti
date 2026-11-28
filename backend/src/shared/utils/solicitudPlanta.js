// CU-36 · Validación de la solicitud de nueva planta que envía el cliente.
// Función pura (sin base de datos) para poder probarla con pruebas unitarias.
import { HttpError } from './httpError.js';

export const LARGO_DIRECCION = { min: 5, max: 200 };
export const LARGO_MENSAJE = 500;
export const POTENCIA_MAXIMA = 9999.99; // NUMERIC(6,2)

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Devuelve los datos limpios o lanza 400 con la lista de errores
export function validarSolicitudPlanta(datos = {}) {
  const { id_comuna, potencia_kw, tiene_baterias } = datos;
  const direccion = texto(datos.direccion).replace(/\s+/g, ' ');
  const mensaje = texto(datos.mensaje);
  const errores = [];

  if (!Number.isInteger(id_comuna) || id_comuna <= 0) errores.push('Elige la comuna de la planta');
  if (direccion.length < LARGO_DIRECCION.min) errores.push('Escribe la dirección de la planta');
  else if (direccion.length > LARGO_DIRECCION.max) errores.push(`La dirección admite hasta ${LARGO_DIRECCION.max} caracteres`);
  if (potencia_kw !== undefined && potencia_kw !== null
      && !(typeof potencia_kw === 'number' && Number.isFinite(potencia_kw) && potencia_kw > 0 && potencia_kw <= POTENCIA_MAXIMA)) {
    errores.push('La potencia debe ser un número mayor a 0 (en kW)');
  }
  if (tiene_baterias !== undefined && tiene_baterias !== null && typeof tiene_baterias !== 'boolean') {
    errores.push('Indica si la planta tiene baterías: sí, no o no sé');
  }
  if (datos.mensaje !== undefined && datos.mensaje !== null && typeof datos.mensaje !== 'string') {
    errores.push('El mensaje debe ser texto');
  } else if (mensaje.length > LARGO_MENSAJE) {
    errores.push(`El mensaje admite hasta ${LARGO_MENSAJE} caracteres`);
  }
  if (errores.length) throw new HttpError(400, 'Datos de la solicitud inválidos', errores);

  return {
    id_comuna,
    direccion,
    potencia_kw: potencia_kw ?? null,
    tiene_baterias: tiene_baterias ?? null,
    mensaje: mensaje || null,
  };
}

// Compara direcciones sin distinguir mayúsculas ni espacios repetidos
export const mismaDireccion = (a, b) => texto(a).replace(/\s+/g, ' ').toLowerCase() === texto(b).replace(/\s+/g, ' ').toLowerCase();
