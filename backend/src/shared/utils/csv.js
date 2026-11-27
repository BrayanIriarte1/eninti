// Ayudantes para el CSV de pagos del mes (HU-06).

export const ZONA_HORARIA = 'America/Santiago';

// Una celda que empieza con = + - @ (o tabulación/retorno) la interpreta Excel como
// fórmula: un nombre como "=HYPERLINK(...)" se ejecutaría al abrir el archivo.
// Se antepone un apóstrofo para que quede como texto, y se escapan las comillas.
export function celdaCsv(valor) {
  let texto = String(valor ?? '');
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}

// Fecha y hora de Chile, sin importar la zona horaria del servidor (Render usa UTC)
export function fechaHoraChile(fecha) {
  return new Date(fecha).toLocaleString('es-CL', { timeZone: ZONA_HORARIA });
}
