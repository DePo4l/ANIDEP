import 'dotenv/config';
import express from 'express';
import { checkVidNestPage, validId } from './vidnest.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const allowedIds = new Set((process.env.VITE_VIDNEST_ALLOWED_ANILIST_IDS || '').split(',').map(Number).filter(id => Number.isSafeInteger(id) && id > 0));
const vidNestConfigured = process.env.VITE_VIDNEST_EMBED_AUTHORIZED === 'true' && allowedIds.size > 0;
const requests = new Map();
const vidNestChecks = new Map();
let lastSweep = 0;
app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [ip, record] of requests) if (record.until < now) requests.delete(ip);
    for (const [key, record] of vidNestChecks) if (record.expires < now) vidNestChecks.delete(key);
    lastSweep = now;
  }
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
  if (!vidNestConfigured || !allowedIds.has(Number(anilistId))) return res.json({ configured: false, pageReachable: null, episodeAvailability: 'unknown', playbackVerified: false });
  const key = `${anilistId}:${episode}`;
  const cached = vidNestChecks.get(key);
  if (cached?.expires > Date.now()) return res.json({ configured: true, ...await cached.value });
  console.info(`[vidnest] HEAD anime=${anilistId} episode=${episode}`);
  const pending = checkVidNestPage(anilistId, episode);
  if (vidNestChecks.size >= 500) vidNestChecks.delete(vidNestChecks.keys().next().value);
  vidNestChecks.set(key, { value: pending, expires: Infinity });
  const value = await pending;
  if (value.error || !value.pageReachable) console.warn(`[vidnest] page check failed anime=${anilistId} episode=${episode} status=${value.httpStatus ?? 'network'} ${value.error || ''}`);
  else console.info(`[vidnest] page reachable anime=${anilistId} episode=${episode} status=${value.httpStatus}; playback unverified`);
  vidNestChecks.set(key, { value, expires: Date.now() + (value.pageReachable ? 60_000 : 10_000) });
  if (vidNestChecks.size > 500) vidNestChecks.delete(vidNestChecks.keys().next().value);
  res.json({ configured: true, ...value });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.listen(port, '127.0.0.1', () => console.log(`ANIDEP API: http://127.0.0.1:${port}`));
