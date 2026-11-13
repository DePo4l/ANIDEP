import test from 'node:test';
import assert from 'node:assert/strict';
import { episodeCountOf, episodeNeighbors, episodeNumbers, episodeRanges, listAnime, visibleEpisodeNumbers } from '../src/services/anilist.js';
import { embedCheckReady, vidNestProvider } from '../src/services/embedProviders.js';

test('AniList sends only filters in use and keeps pagination', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ data: { Page: { media: [], pageInfo: { hasNextPage: true } } } }) };
  };
  try {
    assert.equal((await listAnime({ search: 'Naruto', page: 2 })).hasMore, true);
    await listAnime({ kind: 'trending' });
    await listAnime({ kind: 'seasonal' });
    assert.equal(calls[0].variables.page, 2);
    assert.equal(calls[0].variables.search, 'Naruto');
    assert.doesNotMatch(calls[0].query, /season: \$season/);
    assert.doesNotMatch(calls[1].query, /search: \$search|season: \$season/);
    assert.match(calls[2].query, /season: \$season, seasonYear: \$year/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('episode navigation, ranges, and search use known numbers without claiming streams', () => {
  const short = episodeNumbers(12);
  assert.deepEqual(episodeRanges(short), [{ start: 1, end: 12 }]);
  assert.deepEqual(episodeNeighbors(short, 1), { previous: null, next: 2 });
  assert.deepEqual(episodeNeighbors(short, 12), { previous: 11, next: null });
  const long = episodeNumbers(220);
  assert.deepEqual(episodeRanges(long), [
    { start: 1, end: 50 }, { start: 51, end: 100 },
    { start: 101, end: 150 }, { start: 151, end: 200 }, { start: 201, end: 220 }
  ]);
  assert.deepEqual(visibleEpisodeNumbers(long, 201).slice(0, 2), [201, 202]);
  assert.deepEqual(visibleEpisodeNumbers(long, 1, '220'), [220]);
  assert.deepEqual(visibleEpisodeNumbers(long, 1, '1'), [1]);
  assert.deepEqual(visibleEpisodeNumbers(long, 1, 'Episode 12'), []);
  assert.deepEqual(episodeNeighbors(long, 220), { previous: 219, next: null });
  assert.deepEqual(episodeRanges(episodeNumbers(0)), []);
});

test('episode metadata and VidNest URLs do not invent movie episodes', () => {
  assert.equal(episodeCountOf({ format: 'MOVIE', episodes: 1 }), 0);
  assert.equal(episodeCountOf({ format: 'TV', episodes: 12 }), 12);
  assert.equal(episodeCountOf({ format: 'ONA', episodes: 8, status: 'RELEASING', nextAiringEpisode: { episode: 4 } }), 3);
  assert.equal(episodeCountOf({ format: 'TV', episodes: null, status: 'RELEASING', nextAiringEpisode: { episode: 1181 } }), 1180);
  assert.equal(episodeCountOf({ format: 'OVA', episodes: null }), 0);
  assert.deepEqual(episodeNumbers(0), []);
  assert.deepEqual(episodeNumbers(3, [{ number: 5 }]), [1, 2, 3, 5]);
  assert.equal(vidNestProvider.buildUrl(21, 1), 'https://vidnest.fun/anime/21/1/sub');
  assert.equal(vidNestProvider.buildUrl(21, 2), 'https://vidnest.fun/anime/21/2/sub');
  assert.equal(vidNestProvider.buildUrl(21, 0), null);
  assert.equal(vidNestProvider.buildMovieUrl(16910), 'https://vidnest.fun/movie/16910');
  assert.equal(vidNestProvider.buildMovieUrl(0), null);
  assert.equal(vidNestProvider.configured, false);
  assert.equal(embedCheckReady({ key: '21:1', pageReachable: true }, '21:2'), false);
  assert.equal(embedCheckReady({ key: '21:2', pageReachable: true }, '21:2'), true);
});
