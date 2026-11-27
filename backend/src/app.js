import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import openapi from './docs/openapi.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { cabecerasSeguridad } from './shared/middlewares/seguridad.js';

const app = express();

// Detrás del proxy de Render: req.ip debe ser la IP real del cliente (se guarda al aceptar
// las condiciones, RF-19) y no la del balanceador.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cabecerasSeguridad);

// Solo la ruta que recibe las fotos de la orden necesita un límite amplio (llegan
// comprimidas en base64). El resto de la API acepta cuerpos pequeños.
app.use('/api/trabajador/ordenes', express.json({ limit: '12mb' }));
app.use(express.json({ limit: '100kb' }));

// Documentación interactiva de la API (Swagger UI) y su especificación OpenAPI
app.get('/api/docs.json', (_req, res) => res.json(openapi));
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapi, {
    customSiteTitle: 'API ENINTI · Documentación',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  }),
);

app.use('/api', routes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Ambiente de demostración: el mismo servicio entrega el frontend compilado (vite build),
// así navegador y API comparten dominio y no se necesita CORS.
const dist = join(import.meta.dirname, '..', '..', 'frontend', 'dist');
if (existsSync(join(dist, 'index.html'))) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  // Las rutas de React Router (/admin, /cliente/cuenta, …) devuelven index.html
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

export default app;
