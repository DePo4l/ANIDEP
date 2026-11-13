import test from 'node:test';
import assert from 'node:assert/strict';
import { addMedia, removeMedia, userMediaProvider, validateMediaUrl } from '../src/services/providers.js';
import { getHistory, groupContinueWatching, recordOpen, recordSelection, removeHistory, saveProgress } from '../src/lib/history.js';

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
  recordOpen({ animeId: 42, episode: 1, language: 'dub', title: 'Test', format: 'TV' });
  assert.equal(getHistory()['42:1'].watchMode, 'embed');
  assert.equal(getHistory()['42:1'].language, 'dub');
  assert.equal(getHistory()['42:1'].position, 9.5);
  removeHistory(42, 1);
  assert.equal(getHistory()['42:1'], undefined);
});

test('continue watching groups legacy episode records by AniList ID and uses recency', () => {
  data.set('anidep:watch-history:v1', JSON.stringify({
    '20:1': { animeId: 20, episode: 1, title: 'Naruto', watchedAt: 1000, watchMode: 'embed' },
    '20:220': { animeId: 20, episode: 220, title: 'Naruto', watchedAt: 3000, watchMode: 'embed' },
    '20:15': { animeId: 20, episode: 15, title: 'Naruto', watchedAt: 2000, watchMode: 'manual', position: 90, duration: 200 },
    '21:10': { animeId: 21, episode: 10, title: 'Naruto', lastWatched: 2500, watchMode: 'manual' }
  }));
  assert.deepEqual(groupContinueWatching(getHistory()).map(item => [item.animeId, item.episode]), [[20, 220], [21, 10]]);
  const stored = getHistory();
  stored['20:15'].watchedAt = 4000;
  assert.deepEqual(groupContinueWatching(stored).map(item => [item.animeId, item.episode]), [[20, 15], [21, 10]]);
  stored['20:15'].completed = true;
  assert.equal(groupContinueWatching(stored)[0].episode, 15);
  recordSelection({ animeId: 20, episode: 15, title: 'Naruto', format: 'TV' });
  assert.equal(getHistory()['20:15'].position, 90);
  assert.equal(getHistory()['20:15'].watchMode, 'manual');
  assert.ok(getHistory()['20:220']);
  data.delete('anidep:watch-history:v1');
});
