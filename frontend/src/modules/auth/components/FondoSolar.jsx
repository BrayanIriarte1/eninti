// Fondo del login: planta fotovoltaica de día en el desierto (public/fondo-paneles.svg).
// Se aplica como imagen de fondo en CSS: pesa ~8 KB comprimido, no bloquea la carga
// y queda en caché, pensado para redes móviles lentas (RNF-05).
// Es decorativo: aria-hidden para que los lectores de pantalla lo ignoren.
export default function FondoSolar() {
  return <div className="fondo-solar" aria-hidden="true" />;
}
