// Íconos decorativos de las páginas públicas (el texto visible ya nombra cada elemento)
function Icono({ children, tamano = 20 }) {
  return (
    <svg className="pub-icono" viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconoCorreo = (p) => <Icono {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icono>;
export const IconoFlecha = (p) => <Icono {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icono>;
export const IconoVolver = (p) => <Icono {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Icono>;
export const IconoCheck = (p) => <Icono {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icono>;
export const IconoMas = (p) => <Icono {...p}><path d="M12 5v14M5 12h14" /></Icono>;
export const IconoTelefono = (p) => <Icono {...p}><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" /></Icono>;
export const IconoInstagram = (p) => <Icono {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></Icono>;
export const IconoWhatsapp = (p) => (
  <Icono {...p}>
    <path d="M3.5 20.5 4.8 16.3A8.5 8.5 0 1 1 8 19.4Z" />
    <path d="M9 8.2c-.5 0-.9.5-.9 1.2 0 2.6 3.4 6 6 6 .7 0 1.2-.4 1.2-.9v-1l-2-.9-.8.9a5 5 0 0 1-2.7-2.7l.9-.8-.9-2Z" fill="currentColor" stroke="none" />
  </Icono>
);
export const IconoPanel = (p) => <Icono {...p}><path d="M4 14h16l-2-8H6z" /><path d="M8 6l-1 8M12 6v8M16 6l1 8M5 10h14" /><path d="M12 14v5M8 21h8" /></Icono>;
export const IconoHerramienta = (p) => <Icono {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></Icono>;
export const IconoBateria = (p) => <Icono {...p}><rect x="2.5" y="7" width="17" height="10" rx="2" /><path d="M22 10.5v3" /><path d="m11 9-2 3h4l-2 3" /></Icono>;
export const IconoGrafico = (p) => <Icono {...p}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></Icono>;
export const IconoRayo = (p) => <Icono {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></Icono>;
export const IconoUsuario = (p) => <Icono {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" /></Icono>;
export const IconoCandado = (p) => <Icono {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icono>;
export const IconoTarjeta = (p) => <Icono {...p}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6.5 15h4" /></Icono>;
export const IconoCalendario = (p) => <Icono {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Icono>;
export const IconoCamara = (p) => <Icono {...p}><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></Icono>;
export const IconoPin = (p) => <Icono {...p}><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" /><circle cx="12" cy="9" r="2.5" /></Icono>;
export const IconoMensaje = (p) => <Icono {...p}><path d="M4 5h16v11H9l-5 4Z" /></Icono>;
