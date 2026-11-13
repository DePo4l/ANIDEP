import test from 'node:test';
import assert from 'node:assert/strict';
import { checkVidNestPage, validId, vidNestEnabled } from '../server/vidnest.js';

test('VidNest can be enabled globally without an AniList ID list', () => {
  assert.equal(vidNestEnabled({ VIDNEST_ENABLED: 'true' }), true);
  assert.equal(vidNestEnabled({ VIDNEST_ENABLED: 'false', VIDNEST_EMBED_AUTHORIZED: 'true' }), false);
  assert.equal(vidNestEnabled({ VIDNEST_EMBED_AUTHORIZED: 'true' }), true);
  assert.equal(vidNestEnabled({}), false);
});

test('VidNest check reports page reachability without claiming playback', async () => {
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
