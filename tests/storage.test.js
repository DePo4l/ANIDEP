import test from 'node:test';
import assert from 'node:assert/strict';
import { addMedia, removeMedia, userMediaProvider, validateMediaUrl } from '../src/services/providers.js';
import { getHistory, removeHistory, saveProgress } from '../src/lib/history.js';

const data = new Map();
globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
globalThis.window = { dispatchEvent() {} };
globalThis.Event = class {};

test('media URLs are validated and episodes expose saved sources', async () => {
  assert.throws(() => validateMediaUrl('javascript:alert(1)'));
  assert.throws(() => validateMediaUrl('https://example.com/page'));
  const source = addMedia(42, 3, 'https://example.com/video.m3u8', 'https://example.com/id.vtt');
  assert.equal(source.type, 'hls');
  assert.deepEqual((await userMediaProvider.getEpisodes(42)).map(item => item.number), [3]);
  assert.equal((await userMediaProvider.getStreamingSources(3, 42))[0].url, source.url);
  removeMedia(42, 3, source.id);
  assert.deepEqual(await userMediaProvider.getEpisodes(42), []);
});

test('history saves progress and completes only near the end', () => {
  saveProgress({ animeId: 42, episode: 1, position: 1, duration: 10, title: 'Test' });
  assert.equal(getHistory()['42:1'].completed, false);
  saveProgress({ animeId: 42, episode: 1, position: 9.5, duration: 10, title: 'Test' });
  assert.equal(getHistory()['42:1'].completed, true);
  removeHistory(42, 1);
  assert.equal(getHistory()['42:1'], undefined);
});
