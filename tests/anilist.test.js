import test from 'node:test';
import assert from 'node:assert/strict';
import { listAnime } from '../src/services/anilist.js';

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
