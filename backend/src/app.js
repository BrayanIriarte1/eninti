import express from 'express';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import openapi from './docs/openapi.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';

const app = express();

// Detrás de un proxy (Render, Nginx) indica cuántos saltos confiar para conocer la IP
// real del cliente (aceptación de condiciones RF-19 y límite de solicitudes). Ej.: TRUST_PROXY=1
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Límite amplio solo donde llegan las fotos de la orden (comprimidas en base64 desde el
// navegador). El resto de la API acepta cuerpos pequeños.
app.use('/api/trabajador', express.json({ limit: '12mb' }));
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
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

export default app;
