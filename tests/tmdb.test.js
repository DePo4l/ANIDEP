import test from 'node:test';
import assert from 'node:assert/strict';
import { matchAniListMovie, searchTmdbMovies } from '../server/tmdb.js';
import { checkVidNestMoviePage } from '../server/vidnest.js';

const anime936 = { id: 936, format: 'MOVIE', title: { english: 'Naruto the Movie: Legend of the Stone of Gelel', romaji: 'NARUTO: Dai Gekitotsu! Maboroshi no Chitei Iseki Dattebayo' }, synonyms: [], startDate: { year: 2005 } };
const tmdbMovie = { id: 16910, title: anime936.title.english, original_title: anime936.title.english, release_date: '2005-08-06' };
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('AniList 936 matches the correct TMDB film and sends bearer token only in backend header', async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1 ? response({ data: { Media: anime936 } }) : response({ results: [
      { id: 999, title: 'Naruto', release_date: '2005-01-01' },
      { ...tmdbMovie, id: 998, release_date: '2020-01-01' },
      tmdbMovie
    ] });
  };
  const result = await matchAniListMovie('936', 'fake-test-token', request);
  assert.deepEqual(result, { anilistId: 936, tmdbId: 16910, title: anime936.title.english, releaseDate: '2005-08-06' });
  assert.equal(calls[0].url, 'https://graphql.anilist.co');
  assert.match(calls[1].url, /\/3\/search\/movie\?query=Naruto/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer fake-test-token');
  assert.doesNotMatch(calls[1].url, /fake-test-token/);
});

test('TMDB search handles missing and invalid credentials and malformed results', async () => {
  await assert.rejects(searchTmdbMovies('Naruto', ''), { status: 503 });
  await assert.rejects(searchTmdbMovies('a', 'fake-test-token'), { status: 400 });
  await assert.rejects(searchTmdbMovies('Naruto', 'fake-test-token', async () => response({}, 401)), { status: 502, message: 'Token TMDB tidak valid atau ditolak.' });
  await assert.rejects(searchTmdbMovies('Naruto', 'fake-test-token', async () => response({})), { status: 502 });
  assert.equal((await searchTmdbMovies('  Naruto  ', 'fake-test-token', async () => response({ results: [] }))).length, 0);
  await assert.rejects(matchAniListMovie('99999999', 'fake-test-token', async () => response({ errors: [{ message: 'Not Found' }] }, 404)), { status: 404, message: 'Judul tidak ditemukan di AniList.' });
});

test('movie match rejects series, mismatched titles, and ambiguous matches', async () => {
  await assert.rejects(matchAniListMovie('21', 'fake-test-token', async () => response({ data: { Media: { ...anime936, format: 'TV' } } })), { status: 400 });
  const noMatch = await matchAniListMovie('936', 'fake-test-token', async url => String(url).includes('graphql.anilist') ? response({ data: { Media: anime936 } }) : response({ results: [{ ...tmdbMovie, title: 'Another Naruto Movie', original_title: 'Another Naruto Movie' }] }));
  assert.equal(noMatch.match, null);
  const ambiguous = await matchAniListMovie('936', 'fake-test-token', async url => String(url).includes('graphql.anilist') ? response({ data: { Media: anime936 } }) : response({ results: [tmdbMovie, { ...tmdbMovie, id: 12345 }] }));
  assert.equal(ambiguous.match, null);
});

test('movie matching requires a year and does not confuse different Japanese titles', async () => {
  let searches = 0;
  const noYear = await matchAniListMovie('936', 'fake-test-token', async url => {
    if (!String(url).includes('graphql.anilist')) searches++;
    return response({ data: { Media: { ...anime936, startDate: { year: null } } } });
  });
  assert.equal(noYear.match, null);
  assert.equal(searches, 0);
  const japanese = { ...anime936, title: { romaji: 'ナルト' }, synonyms: [] };
  const wrongTitle = await matchAniListMovie('936', 'fake-test-token', async url => String(url).includes('graphql.anilist')
    ? response({ data: { Media: japanese } })
    : response({ results: [{ ...tmdbMovie, title: '別作品', original_title: '別作品' }] }));
  assert.equal(wrongTitle.match, null);
});

test('a distinct alias resolves ambiguous primary movie matches', async () => {
  const anime = { ...anime936, title: { english: 'Shared Title', romaji: '別名' }, synonyms: [] };
  const matched = await matchAniListMovie('936', 'fake-test-token', async url => {
    if (String(url).includes('graphql.anilist')) return response({ data: { Media: anime } });
    const title = new URL(url).searchParams.get('query');
    return title === 'Shared Title' ? response({ results: [
      { id: 1, title, release_date: '2005-01-01' },
      { id: 2, title, release_date: '2005-02-01' }
    ] }) : response({ results: [{ id: 2, title: '別名', release_date: '2005-02-01' }] });
  });
  assert.equal(matched.tmdbId, 2);
});

test('movie matching deduplicates and limits aliases while tolerating a failed alias', async () => {
  const anime = { ...anime936, title: { english: 'Shared Title', romaji: 'shared title', native: '別名' }, synonyms: ['別名', 'Alias Two', 'Alias Three', 'Alias Four', 'Alias Five'] };
  const searches = [];
  const result = await matchAniListMovie('936', 'fake-test-token', async url => {
    if (String(url).includes('graphql.anilist')) return response({ data: { Media: anime } });
    const query = new URL(url).searchParams.get('query');
    searches.push(query);
    if (query === 'Alias Two') throw new Error('temporary');
    if (query === '別名') return response({ results: [{ id: 16910, title: '別名', release_date: '2005-08-06' }] });
    return response({ results: [] });
  });
  assert.equal(result.tmdbId, 16910);
  assert.ok(searches.length <= 5);
  assert.equal(searches.filter(query => query.toLowerCase() === 'shared title').length, 1);
});

test('VidNest movie check uses documented TMDB URL without claiming playback', async () => {
  const calls = [];
  const request = async (url, options) => { calls.push([url, options.method]); return { ok: true, status: 200 }; };
  const result = await checkVidNestMoviePage(16910, request);
  assert.deepEqual(calls, [['https://vidnest.fun/movie/16910', 'HEAD']]);
  assert.equal(result.pageReachable, true);
  assert.equal(result.playbackVerified, false);
  assert.equal((await checkVidNestMoviePage(16910, async () => ({ ok: false, status: 404 }))).pageReachable, false);
  assert.equal((await checkVidNestMoviePage(16910, async () => ({ ok: false, status: 403 }))).pageReachable, null);
});
