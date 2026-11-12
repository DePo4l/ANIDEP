import 'dotenv/config';
import express from 'express';
import { checkVidNestPage, validId } from './vidnest.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const vidNestConfigured = process.env.VITE_VIDNEST_ENABLED !== 'false';
const requests = new Map();
const vidNestChecks = new Map();
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
  { id: 'vidnest', name: 'VidNest embed', configured: vidNestConfigured, pageReachability: 'not-checked', episodeAvailability: 'unknown', playbackVerified: false },
  { id: 'anihub', name: 'AniHub', enabled: false, reason: 'Endpoint dan izin sumber streaming belum terverifikasi.' }
] }));
app.get('/api/providers/vidnest/check', async (req, res) => {
  const { anilistId, episode } = req.query;
  if (!validId(anilistId) || !validId(episode)) return res.status(400).json({ error: 'AniList ID dan episode harus bilangan bulat positif.' });
  if (!vidNestConfigured) return res.json({ configured: false, pageReachable: null, episodeAvailability: 'unknown', playbackVerified: false });
  const key = `${anilistId}:${episode}`;
  const cached = vidNestChecks.get(key);
  if (cached?.expires > Date.now()) return res.json({ configured: true, ...cached.value });
  console.info(`[vidnest] HEAD anime=${anilistId} episode=${episode}`);
  const value = await checkVidNestPage(anilistId, episode);
  if (value.error || !value.pageReachable) console.warn(`[vidnest] page check failed anime=${anilistId} episode=${episode} status=${value.httpStatus ?? 'network'} ${value.error || ''}`);
  else console.info(`[vidnest] page reachable anime=${anilistId} episode=${episode} status=${value.httpStatus}; playback unverified`);
  vidNestChecks.set(key, { value, expires: Date.now() + 60_000 });
  res.json({ configured: true, ...value });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.listen(port, '127.0.0.1', () => console.log(`ANIDEP API: http://127.0.0.1:${port}`));
