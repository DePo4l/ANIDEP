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
});

test('movie match rejects series, mismatched titles, and ambiguous matches', async () => {
  await assert.rejects(matchAniListMovie('21', 'fake-test-token', async () => response({ data: { Media: { ...anime936, format: 'TV' } } })), { status: 400 });
  const noMatch = await matchAniListMovie('936', 'fake-test-token', async url => String(url).includes('graphql.anilist') ? response({ data: { Media: anime936 } }) : response({ results: [{ ...tmdbMovie, title: 'Another Naruto Movie', original_title: 'Another Naruto Movie' }] }));
  assert.equal(noMatch.match, null);
  const ambiguous = await matchAniListMovie('936', 'fake-test-token', async url => String(url).includes('graphql.anilist') ? response({ data: { Media: anime936 } }) : response({ results: [tmdbMovie, { ...tmdbMovie, id: 12345 }] }));
  assert.equal(ambiguous.match, null);
});

test('VidNest movie check uses documented TMDB URL without claiming playback', async () => {
  const calls = [];
  const request = async (url, options) => { calls.push([url, options.method]); return { ok: true, status: 200 }; };
  const result = await checkVidNestMoviePage(16910, request);
  assert.deepEqual(calls, [['https://vidnest.fun/movie/16910', 'HEAD']]);
  assert.equal(result.pageReachable, true);
  assert.equal(result.playbackVerified, false);
  assert.equal((await checkVidNestMoviePage(16910, async () => ({ ok: false, status: 404 }))).pageReachable, false);
});
