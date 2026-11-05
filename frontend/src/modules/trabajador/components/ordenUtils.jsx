import { formatoFecha } from '../../../shared/utils/formato.js';

// Enlace al mapa con las coordenadas de la planta o, si no las hay, su dirección (HU-14)
export function enlaceMapa(planta) {
  const destino = planta.latitud != null && planta.longitud != null
    ? `${planta.latitud},${planta.longitud}`
    : `${planta.direccion}, ${planta.comuna}, Chile`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
}

export const ESTADO_ORDEN = {
  pendiente: { texto: 'Pendiente', clase: 'neutro' },
  en_curso: { texto: 'En curso', clase: 'alerta' },
  finalizada: { texto: 'Finalizada', clase: 'ok' },
  cancelada: { texto: 'Cancelada', clase: 'neutro' },
};

export function EtiquetaOrden({ estado }) {
  const e = ESTADO_ORDEN[estado] ?? { texto: estado, clase: 'neutro' };
  return <span className={`etiqueta ${e.clase}`}>{e.texto}</span>;
}

export const infoFecha = formatoFecha;
