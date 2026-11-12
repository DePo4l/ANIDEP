const key = 'anidep:user-sources:v1';

function read() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
function write(data) { localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('anidep-sources')); }
export function validateMediaUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL harus HTTP atau HTTPS.');
  if (!/\.(m3u8|mp4)(?:$|[?#])/i.test(url.href)) throw new Error('Gunakan URL langsung .m3u8 atau .mp4.');
  return url.href;
}
export const userMediaProvider = {
  id: 'user-media', name: 'Media pribadi', enabled: true,
  async searchAnime() { return []; },
  async getAnimeDetails() { return null; },
  async getEpisodes(animeId) { return Object.keys(read()[animeId] || {}).map(Number).sort((a, b) => a - b).map(number => ({ number, id: String(number), provider: 'user-media' })); },
  async getStreamingSources(episodeId, animeId) { return read()[animeId]?.[episodeId] || []; }
};
// shortcut: AniHub has no verified permitted stream, enable it after endpoints and usage rights are confirmed.
export const anihubProvider = {
  id: 'anihub', name: 'AniHub', enabled: false,
  async searchAnime() { return []; },
  async getAnimeDetails() { return null; },
  async getEpisodes() { return []; },
  async getStreamingSources() { return []; }
};
export const providers = [userMediaProvider, anihubProvider];
export function addMedia(animeId, episode, url, subtitleUrl = '') {
  if (!Number.isInteger(Number(animeId)) || Number(animeId) < 1 || !Number.isInteger(episode) || episode < 1) throw new Error('ID anime dan nomor episode harus valid.');
  const type = /\.m3u8(?:$|[?#])/i.test(url) ? 'hls' : 'mp4';
  const source = { id: crypto.randomUUID(), label: type === 'hls' ? 'HLS pribadi' : 'MP4 pribadi', url: validateMediaUrl(url), type, subtitles: subtitleUrl ? [{ label: 'Subtitle', src: new URL(subtitleUrl).href, lang: 'id' }] : [] };
  if (subtitleUrl && (!/^https?:$/.test(new URL(subtitleUrl).protocol) || !/\.vtt(?:$|[?#])/i.test(subtitleUrl))) throw new Error('Subtitle harus berupa URL HTTP(S) ke file .vtt.');
  const data = read();
  data[animeId] ||= {};
  data[animeId][episode] ||= [];
  data[animeId][episode].push(source);
  write(data);
  return source;
}
export function removeMedia(animeId, episode, sourceId) {
  const data = read();
  if (!data[animeId]?.[episode]) return;
  data[animeId][episode] = data[animeId][episode].filter(item => item.id !== sourceId);
  if (!data[animeId][episode].length) delete data[animeId][episode];
  write(data);
}
