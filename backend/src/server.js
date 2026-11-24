import app from './app.js';
import { programarReglasDeuda } from './modules/pagos/reglasDeuda.js';
import { programarCobroAutomatico } from './modules/pagos/cobroAutomatico.js';
import { modo as modoCorreo, revisarConfiguracion } from './modules/notificaciones/correo.service.js';
import { cuentasConClaveDemo } from './shared/utils/cuentasDemo.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'cambiar-esto') {
  if (process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET no está configurado. Defínelo en las variables de entorno.');
    process.exit(1);
  }
  console.warn('⚠ JWT_SECRET de ejemplo: cámbialo antes de publicar la plataforma.');
}

const port = process.env.PORT ?? 3001;

app.listen(port, () => {
  console.log(`API ENINTI escuchando en http://localhost:${port}/api`);
  programarReglasDeuda();
  programarCobroAutomatico();
  // Correo: advierte al iniciar si la configuración impide que los avisos lleguen
  const avisosCorreo = revisarConfiguracion();
  if (avisosCorreo.length) avisosCorreo.forEach((a) => console.warn(`⚠ Correo: ${a}`));
  else console.log(`Correo: modo ${modoCorreo()}`);
  // En producción, advierte si quedan cuentas de prueba con la contraseña publicada
  if (process.env.NODE_ENV === 'production') {
    cuentasConClaveDemo()
      .then((cuentas) => cuentas.forEach((c) => console.warn(`⚠ La cuenta ${c} sigue con la contraseña de demostración del README: cámbiala.`)))
      .catch((err) => console.error('No se pudieron revisar las cuentas de demostración:', err.message));
  }
});
