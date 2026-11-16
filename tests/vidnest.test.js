import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { checkVidNestPage, validId, vidNestEnabled } from '../server/vidnest.js';
import { loadProviderStatus, providerUnavailableReason, vidNestProvider } from '../src/services/embedProviders.js';

test('VidNest can be enabled globally without an AniList ID list', () => {
  assert.equal(vidNestEnabled({ VIDNEST_ENABLED: 'true' }), true);
  assert.equal(vidNestEnabled({ VIDNEST_ENABLED: 'false', VIDNEST_EMBED_AUTHORIZED: 'true' }), false);
  assert.equal(vidNestEnabled({ VIDNEST_EMBED_AUTHORIZED: 'true' }), true);
  assert.equal(vidNestEnabled({}), false);
});

test('VidNest check reports page reachability without claiming playback', async () => {
  assert.equal(vidNestProvider.supportedFormats.includes('TV_SHORT'), true);
  assert.equal(vidNestProvider.buildUrl(10216, 1), 'https://vidnest.fun/anime/10216/1/sub');
  assert.equal(validId('21'), true);
  assert.equal(validId('0'), false);
  assert.equal(validId('1.5'), false);
  const calls = [];
  const request = async (url, options) => { calls.push({ url, method: options.method }); return { ok: true, status: 200 }; };
  const result = await checkVidNestPage(21, 1, request);
  assert.deepEqual(calls, [{ url: 'https://vidnest.fun/anime/21/1/sub', method: 'HEAD' }]);
  assert.equal(result.pageReachable, true);
  assert.equal(result.episodeAvailability, 'unknown');
  assert.equal(result.playbackVerified, false);
  const missing = await checkVidNestPage(21, 9999, async () => ({ ok: false, status: 404 }));
  assert.equal(missing.pageReachable, false);
  assert.equal(missing.httpStatus, 404);
  const headBlocked = await checkVidNestPage(21, 1, async () => ({ ok: false, status: 405 }));
  assert.equal(headBlocked.pageReachable, null);
});

test('Vercel API rewrite reaches Express and returns JSON while watch routes stay in the SPA', async () => {
  const rewrites = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url))).rewrites;
  assert.deepEqual(rewrites[0], { source: '/api/(.*)', destination: '/api/index?__route=$1' });
  assert.deepEqual(rewrites[1], { source: '/(.*)', destination: '/index.html' });
  const previous = process.env.VIDNEST_ENABLED;
  process.env.VIDNEST_ENABLED = 'true';
  const { default: handler } = await import('../api/index.js');
  const server = createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/index?__route=`;
    const providers = await fetch(base + 'providers');
    assert.equal(providers.status, 200);
    assert.match(providers.headers.get('content-type'), /application\/json/);
    assert.equal((await providers.json()).providers.find(item => item.id === 'vidnest').configured, true);
    assert.deepEqual(await (await fetch(base + 'health')).json(), { ok: true });
    const invalid = await fetch(base + 'providers/vidnest/check&anilistId=bad&episode=1');
    assert.equal(invalid.status, 400);
    assert.match(invalid.headers.get('content-type'), /application\/json/);
    assert.equal((await fetch(base + 'movies/bad/tmdb')).status, 400);
    assert.equal((await fetch(base + 'providers/vidnest/movie/check&anilistId=bad&tmdbId=1')).status, 400);
    assert.equal((await fetch(base + 'missing')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.VIDNEST_ENABLED;
    else process.env.VIDNEST_ENABLED = previous;
  }
});

test('HTML from /api/providers is reported as an API failure', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/html' }) });
    await loadProviderStatus();
    assert.equal(vidNestProvider.configured, false);
    assert.match(vidNestProvider.unavailableReason, /API ANIDEP/);
    globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ providers: [{ id: 'vidnest', configured: true }] }) });
    await loadProviderStatus();
    assert.equal(vidNestProvider.configured, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('provider status is fetched again and disabled state has its own message', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, cache: options.cache });
      return { ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ providers: [{ id: 'vidnest', configured: calls.length === 2 }] }) };
    };
    assert.equal(await loadProviderStatus(), 'disabled');
    assert.match(providerUnavailableReason('disabled'), /belum aktif/);
    assert.equal(await loadProviderStatus(), 'enabled');
    assert.equal(vidNestProvider.configured, true);
    assert.deepEqual(calls, [
      { url: '/api/providers', cache: 'no-store' },
      { url: '/api/providers', cache: 'no-store' }
    ]);
  } finally { globalThis.fetch = originalFetch; }
});
