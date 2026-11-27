// Enlace a Google Maps con la dirección que se registró para la planta (HU-14).
// Se busca por la dirección escrita (más la comuna) para que el mapa muestre exactamente ese lugar.
export function enlaceMapa(planta) {
  const destino = [planta.direccion, planta.comuna, 'Región de Antofagasta', 'Chile'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
}
