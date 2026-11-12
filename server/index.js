import 'dotenv/config';
import express from 'express';
import { checkVidNestMoviePage, checkVidNestPage, validId } from './vidnest.js';
import { matchAniListMovie, searchTmdbMovies } from './tmdb.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const allowedIds = new Set((process.env.VITE_VIDNEST_ALLOWED_ANILIST_IDS || '').split(',').map(Number).filter(id => Number.isSafeInteger(id) && id > 0));
const vidNestConfigured = process.env.VITE_VIDNEST_EMBED_AUTHORIZED === 'true' && allowedIds.size > 0;
const requests = new Map();
const vidNestChecks = new Map();
const movieMatches = new Map();
const tmdbSearches = new Map();
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
  if (!vidNestConfigured || !allowedIds.has(Number(anilistId))) return res.json({ configured: false, pageReachable: null, episodeAvailability: 'unknown', playbackVerified: false });
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
app.get('/api/tmdb/movies/search', async (req, res) => {
  try {
    if (!process.env.TMDB_API_READ_ACCESS_TOKEN) return res.status(503).json({ error: 'Token TMDB belum diatur di server.' });
    const key = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const cached = tmdbSearches.get(key);
    if (cached?.expires > Date.now()) return res.json({ results: cached.value });
    const results = await searchTmdbMovies(req.query.q, process.env.TMDB_API_READ_ACCESS_TOKEN);
    tmdbSearches.set(key, { value: results, expires: Date.now() + 5 * 60_000 });
    res.json({ results });
  }
  catch (error) { console.warn(`[tmdb] search failed: ${error.message}`); res.status(error.status || 502).json({ error: error.message }); }
});
app.get('/api/movies/:anilistId/tmdb', async (req, res) => {
  if (!validId(req.params.anilistId)) return res.status(400).json({ error: 'AniList ID harus bilangan bulat positif.' });
  try {
    if (!process.env.TMDB_API_READ_ACCESS_TOKEN) return res.status(503).json({ error: 'Token TMDB belum diatur di server.' });
    const cached = movieMatches.get(req.params.anilistId);
    if (cached?.expires > Date.now()) return res.json(cached.value);
    const result = await matchAniListMovie(req.params.anilistId, process.env.TMDB_API_READ_ACCESS_TOKEN);
    console.info(`[tmdb] AniList ${req.params.anilistId} -> ${result.tmdbId || 'no confident match'}`);
    movieMatches.set(req.params.anilistId, { value: result, expires: Date.now() + 5 * 60_000 });
    res.json(result);
  } catch (error) {
    console.warn(`[tmdb] AniList ${req.params.anilistId} match failed: ${error.message}`);
    res.status(error.status || 502).json({ error: error.message });
  }
});
app.get('/api/providers/vidnest/movie/check', async (req, res) => {
  if (!validId(req.query.anilistId) || !validId(req.query.tmdbId)) return res.status(400).json({ error: 'AniList ID dan TMDB ID harus bilangan bulat positif.' });
  const matched = movieMatches.get(req.query.anilistId);
  if (!vidNestConfigured || !allowedIds.has(Number(req.query.anilistId)) || matched?.expires <= Date.now() || matched?.value.tmdbId !== Number(req.query.tmdbId)) return res.json({ configured: false, pageReachable: null, playbackVerified: false });
  const key = `movie:${req.query.tmdbId}`;
  const cached = vidNestChecks.get(key);
  if (cached?.expires > Date.now()) return res.json({ configured: true, ...cached.value });
  console.info(`[vidnest] HEAD movie=${req.query.tmdbId}`);
  const value = await checkVidNestMoviePage(req.query.tmdbId);
  if (value.error || !value.pageReachable) console.warn(`[vidnest] movie page check failed tmdb=${req.query.tmdbId} status=${value.httpStatus ?? 'network'} ${value.error || ''}`);
  else console.info(`[vidnest] movie page reachable tmdb=${req.query.tmdbId}; playback unverified`);
  vidNestChecks.set(key, { value, expires: Date.now() + 60_000 });
  res.json({ configured: true, ...value });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
const server = app.listen(port, '127.0.0.1');
server.on('listening', () => console.log(`ANIDEP API: http://127.0.0.1:${port}`));
server.on('error', error => { console.error(`ANIDEP API gagal dijalankan: ${error.message}`); process.exitCode = 1; });
