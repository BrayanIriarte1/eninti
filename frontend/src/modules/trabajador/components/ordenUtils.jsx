import { formatoFecha } from '../../../shared/utils/formato.js';

// Enlace a Google Maps con la dirección que se registró para la planta (HU-14).
// Se busca por la dirección escrita (más la comuna) para que el mapa muestre exactamente ese lugar.
export function enlaceMapa(planta) {
  const destino = [planta.direccion, planta.comuna, 'Región de Antofagasta', 'Chile'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
}

export const ESTADO_ORDEN = {
  pendiente: { texto: 'Pendiente', clase: 'neutro' },
  en_curso: { texto: 'En curso', clase: 'alerta' },
  por_confirmar: { texto: 'Esperando al cliente', clase: 'aviso' },
  finalizada: { texto: 'Finalizada', clase: 'ok' },
  cancelada: { texto: 'Cancelada', clase: 'neutro' },
};

export function EtiquetaOrden({ estado }) {
  const e = ESTADO_ORDEN[estado] ?? { texto: estado, clase: 'neutro' };
  return <span className={`etiqueta ${e.clase}`}>{e.texto}</span>;
}

export const infoFecha = formatoFecha;
