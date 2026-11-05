import express from 'express';
import routes from './routes/index.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';

const app = express();

app.use(express.json());
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

export default app;
