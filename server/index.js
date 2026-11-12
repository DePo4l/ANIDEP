import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3001;
const requests = new Map();
app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  const now = Date.now();
  const record = requests.get(req.ip) || { count: 0, until: now + 60_000 };
  if (record.until < now) { record.count = 0; record.until = now + 60_000; }
  record.count++;
  requests.set(req.ip, record);
  if (record.count > 120) return res.status(429).json({ error: 'Terlalu banyak permintaan.' });
  next();
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/providers', (_req, res) => res.json({ providers: [
  { id: 'user-media', name: 'Media pribadi', enabled: true },
  { id: 'anihub', name: 'AniHub', enabled: false, reason: 'Endpoint dan izin sumber streaming belum terverifikasi.' }
] }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.listen(port, '127.0.0.1', () => console.log(`ANIDEP API: http://127.0.0.1:${port}`));
