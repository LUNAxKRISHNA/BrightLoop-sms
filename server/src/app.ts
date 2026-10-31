import cors from 'cors';
import express from 'express';
import { prisma } from './db.js';
import { auth, requireAuth } from './auth.js';
import { dashboard, me, portal, staff } from './insights.js';
import { api } from './routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/auth', auth);
app.use('/api/me', requireAuth('ADMIN', 'STAFF'), me);
app.use('/api/portal', requireAuth('CUSTOMER'), portal);
app.use('/api/dashboard', requireAuth('ADMIN', 'STAFF'), dashboard);
app.use('/api/staff', requireAuth('ADMIN', 'STAFF'), staff);
app.use('/api', requireAuth('ADMIN', 'STAFF'), api);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Try again.' });
});
