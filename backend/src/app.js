import express from 'express';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import openapi from './docs/openapi.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';

const app = express();

app.use(express.json());

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
