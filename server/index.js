import 'dotenv/config';
import express from 'express';
import { checkVidNestMoviePage, checkVidNestPage, validId, vidNestEnabled } from './vidnest.js';
import { matchAniListMovie, MovieLookupError, searchTmdbMovies } from './tmdb.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const vidNestConfigured = vidNestEnabled();
const requests = new Map();
const vidNestChecks = new Map();
const movieMatches = new Map();
const tmdbSearches = new Map();
let lastSweep = 0;
function cacheSet(map, key, value, ttl) {
  const now = Date.now();
  for (const [id, entry] of map) if (entry.expires < now) map.delete(id);
  if (!map.has(key) && map.size >= 500) map.delete(map.keys().next().value);
  map.set(key, { value, expires: now + ttl });
}
async function getMovieMatch(anilistId) {
  const cached = movieMatches.get(anilistId);
  if (cached?.expires > Date.now()) return cached.value;
  const pending = matchAniListMovie(anilistId, process.env.TMDB_API_READ_ACCESS_TOKEN);
  cacheSet(movieMatches, anilistId, pending, Infinity);
  try {
    const result = await pending;
    console.info(`[tmdb] AniList ${anilistId} -> ${result.tmdbId || 'no confident match'}`);
    cacheSet(movieMatches, anilistId, result, 5 * 60_000);
    return result;
  } catch (error) { movieMatches.delete(anilistId); throw error; }
}
app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [ip, record] of requests) if (record.until < now) requests.delete(ip);
    for (const [key, record] of vidNestChecks) if (record.expires < now) vidNestChecks.delete(key);
    for (const [key, record] of movieMatches) if (record.expires < now) movieMatches.delete(key);
    for (const [key, record] of tmdbSearches) if (record.expires < now) tmdbSearches.delete(key);
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
  if (!vidNestConfigured) return res.json({ configured: false, pageReachable: null, episodeAvailability: 'unknown', playbackVerified: false });
  const key = `${anilistId}:${episode}`;
  const cached = vidNestChecks.get(key);
  if (cached?.expires > Date.now()) return res.json({ configured: true, ...await cached.value });
  console.info(`[vidnest] HEAD anime=${anilistId} episode=${episode}`);
  const pending = checkVidNestPage(anilistId, episode);
  cacheSet(vidNestChecks, key, pending, Infinity);
  const value = await pending;
  if (value.error || !value.pageReachable) console.warn(`[vidnest] page check failed anime=${anilistId} episode=${episode} status=${value.httpStatus ?? 'network'} ${value.error || ''}`);
  else console.info(`[vidnest] page reachable anime=${anilistId} episode=${episode} status=${value.httpStatus}; playback unverified`);
  cacheSet(vidNestChecks, key, value, value.pageReachable ? 60_000 : 10_000);
  res.json({ configured: true, ...value });
});
app.get('/api/tmdb/movies/search', async (req, res) => {
  try {
    if (!process.env.TMDB_API_READ_ACCESS_TOKEN) return res.status(503).json({ error: 'Token TMDB belum diatur di server.' });
    const key = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const cached = tmdbSearches.get(key);
    if (cached?.expires > Date.now()) return res.json({ results: await cached.value });
    const pending = searchTmdbMovies(key, process.env.TMDB_API_READ_ACCESS_TOKEN);
    cacheSet(tmdbSearches, key, pending, Infinity);
    const results = await pending;
    cacheSet(tmdbSearches, key, results, 5 * 60_000);
    res.json({ results });
  }
  catch (error) { tmdbSearches.delete(typeof req.query.q === 'string' ? req.query.q.trim() : ''); console.warn(`[tmdb] search failed: ${error.message}`); res.status(error instanceof MovieLookupError ? error.status : 502).json({ error: error instanceof MovieLookupError ? error.message : 'Pencarian film gagal.' }); }
});
app.get('/api/movies/:anilistId/tmdb', async (req, res) => {
  if (!validId(req.params.anilistId)) return res.status(400).json({ error: 'AniList ID harus bilangan bulat positif.' });
  try {
    if (!process.env.TMDB_API_READ_ACCESS_TOKEN) return res.status(503).json({ error: 'Token TMDB belum diatur di server.' });
    const result = await getMovieMatch(req.params.anilistId);
    res.json(result);
  } catch (error) {
    console.warn(`[tmdb] AniList ${req.params.anilistId} match failed: ${error.message}`);
    res.status(error instanceof MovieLookupError ? error.status : 502).json({ error: error instanceof MovieLookupError ? error.message : 'Pencocokan film gagal.' });
  }
});
app.get('/api/providers/vidnest/movie/check', async (req, res) => {
  if (!validId(req.query.anilistId) || !validId(req.query.tmdbId)) return res.status(400).json({ error: 'AniList ID dan TMDB ID harus bilangan bulat positif.' });
  if (!vidNestConfigured) return res.json({ configured: false, pageReachable: null, playbackVerified: false });
  let matched;
  try { matched = await getMovieMatch(req.query.anilistId); }
  catch (error) { return res.status(error instanceof MovieLookupError ? error.status : 502).json({ error: error instanceof MovieLookupError ? error.message : 'Pencocokan film gagal.' }); }
  if (matched.tmdbId !== Number(req.query.tmdbId)) return res.json({ configured: false, pageReachable: null, playbackVerified: false });
  const key = `movie:${req.query.tmdbId}`;
  const cached = vidNestChecks.get(key);
  if (cached?.expires > Date.now()) return res.json({ configured: true, ...await cached.value });
  console.info(`[vidnest] HEAD movie=${req.query.tmdbId}`);
  const pending = checkVidNestMoviePage(req.query.tmdbId);
  cacheSet(vidNestChecks, key, pending, Infinity);
  const value = await pending;
  if (value.error || !value.pageReachable) console.warn(`[vidnest] movie page check failed tmdb=${req.query.tmdbId} status=${value.httpStatus ?? 'network'} ${value.error || ''}`);
  else console.info(`[vidnest] movie page reachable tmdb=${req.query.tmdbId}; playback unverified`);
  cacheSet(vidNestChecks, key, value, value.pageReachable ? 60_000 : 10_000);
  res.json({ configured: true, ...value });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
const server = app.listen(port, '127.0.0.1');
server.on('listening', () => console.log(`ANIDEP API: http://127.0.0.1:${port}`));
server.on('error', error => { console.error(`ANIDEP API gagal dijalankan: ${error.message}`); process.exitCode = 1; });
