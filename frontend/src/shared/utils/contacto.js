// Canales de contacto oficiales de ENINTI (login, contacto, cotizador y solicitud de cuenta)
export const CONTACTO = {
  instagram: 'https://www.instagram.com/eninticl/',
  telefono: '+56 9 8720 3499',
  correo: 'contacto@eninti.cl',
};

const NUMERO_WHATSAPP = '56987203499';

// Enlace de WhatsApp con el mensaje ya escrito
export const enlaceWhatsapp = (texto = 'Hola ENINTI, necesito ayuda con mi cuenta.') =>
  `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;

export const enlaceTelefono = () => `tel:${CONTACTO.telefono.replace(/\s/g, '')}`;

export const enlaceCorreo = (asunto) =>
  `mailto:${CONTACTO.correo}${asunto ? `?subject=${encodeURIComponent(asunto)}` : ''}`;
