// Reduce una foto en el navegador antes de enviarla: lado mayor de 1600 px, JPEG al 80 %.
// Así una foto de celular de 4–8 MB queda en unos 200–400 KB.
const LADO_MAXIMO = 1600;

export async function comprimirFoto(archivo) {
  if (!archivo.type.startsWith('image/')) throw new Error(`${archivo.name} no es una imagen`);
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close?.();
  return lienzo.toDataURL('image/jpeg', 0.8);
}
