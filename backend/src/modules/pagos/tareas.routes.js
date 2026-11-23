import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { HttpError } from '../../shared/utils/httpError.js';
import { ejecutarCobroDiario } from './cobroAutomatico.js';

// Disparador externo de tareas programadas (cron de Render, cron-job.org, GitHub Actions...).
// Solo existe si se define CRON_SECRET; se llama con «Authorization: Bearer <CRON_SECRET>».
// La tarea es segura de repetir: si hoy ya se ejecutó, responde { omitida: true }.
const router = Router();

function secretoValido(cabecera) {
  const secreto = process.env.CRON_SECRET;
  const [tipo, valor] = String(cabecera ?? '').split(' ');
  if (!secreto || tipo !== 'Bearer' || !valor) return false;
  const a = Buffer.from(valor);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

router.post('/cobro-diario', async (req, res) => {
  if (!process.env.CRON_SECRET) throw new HttpError(404, 'Ruta no encontrada');
  if (!secretoValido(req.headers.authorization)) throw new HttpError(401, 'Credencial de tarea inválida');
  res.json(await ejecutarCobroDiario({ origen: 'externo' }));
});

export default router;
