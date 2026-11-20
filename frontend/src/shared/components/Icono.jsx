// Íconos de trazo (24×24) usados en el menú, los indicadores y los estados vacíos.
const TRAZOS = {
  inicio: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>,
  planta: <><path d="M4 14h16l-2-8H6z" /><path d="M8 6l-1 8M12 6v8M16 6l1 8M5 10h14" /><path d="M12 14v5M8 21h8" /></>,
  clientes: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" /></>,
  nuevaCuenta: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.4 0 2.6.3 3.6 1" /><path d="M18 14v6M15 17h6" /></>,
  trabajadores: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></>,
  calendario: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  solicitudes: <><path d="M4 13.5 6.5 5h11l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></>,
  impagos: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>,
  pagos: <><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M2.5 10.5h19M6.5 15h4" /></>,
  catalogo: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  cuenta: <><rect x="2.5" y="6" width="19" height="13" rx="2" /><circle cx="15.5" cy="12.5" r="2" /><path d="M2.5 9.5h6" /></>,
  mantenciones: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></>,
  agenda: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3v3H8z" /></>,
  salir: <><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  cerrar: <><path d="M6 6l12 12M18 6 6 18" /></>,
  flecha: <><path d="M9 6l6 6-6 6" /></>,
  ok: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" /></>,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
};

export default function Icono({ nombre, tamano = 20, className }) {
  return (
    <svg
      className={className}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre] ?? TRAZOS.sol}
    </svg>
  );
}
