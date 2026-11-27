import app from './app.js';
import { programarReglasDeuda } from './modules/pagos/reglasDeuda.js';

// Sin JWT_SECRET no se pueden firmar ni verificar sesiones: mejor no arrancar
if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env. Copia .env.example y completa los valores.');
  process.exit(1);
}
if (process.env.AUTH_BYPASS === 'true') {
  console.warn(process.env.NODE_ENV === 'production'
    ? 'AUTH_BYPASS se ignora en producción.'
    : 'ATENCIÓN: AUTH_BYPASS=true, la API acepta peticiones sin login (solo desarrollo).');
}

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`API ENINTI escuchando en http://localhost:${port}/api`);
  programarReglasDeuda();
});
