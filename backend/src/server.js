import app from './app.js';
import { programarReglasDeuda } from './modules/pagos/reglasDeuda.js';

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`API ENINTI escuchando en http://localhost:${port}/api`);
  programarReglasDeuda();
});
