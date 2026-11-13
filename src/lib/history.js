const key = 'anidep:watch-history:v1';
export function getHistory() { try { const data = JSON.parse(localStorage.getItem(key) || '{}'); return data && typeof data === 'object' ? data : {}; } catch { return {}; } }
export function groupContinueWatching(history) {
  const entries = Object.values(history || {}).filter(item => item && Number.isSafeInteger(Number(item.animeId)) && Number(item.animeId) > 0);
  entries.sort((a, b) => (Number(b.watchedAt ?? b.lastWatched) || 0) - (Number(a.watchedAt ?? a.lastWatched) || 0));
  const seen = new Set();
  return entries.filter(item => {
    const id = Number(item.animeId);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
export function recordSelection({ animeId, episode, title, cover, format }) {
  const data = getHistory();
  const id = animeId + ':' + episode;
  data[id] = { ...data[id], animeId: Number(animeId), episode: Number(episode), title, cover, format, watchMode: data[id]?.watchMode || 'selection', watchedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('anidep-history'));
}
export function recordOpen({ animeId, episode, language, title, cover, format }) {
  const data = getHistory();
  const id = animeId + ':' + episode;
  data[id] = { ...data[id], animeId: Number(animeId), episode: Number(episode), language, title, cover, format, watchMode: 'embed', watchedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('anidep-history'));
}
export function saveProgress({ animeId, episode, position, duration, title, cover, format, completed = false }) {
  const data = getHistory();
  const id = animeId + ':' + episode;
  data[id] = { ...data[id], animeId: Number(animeId), episode: Number(episode), position: Number(position) || 0, duration: Number(duration) || 0, title, cover, format: format || data[id]?.format, watchMode: 'manual', completed: completed || (duration > 0 && position >= Math.max(duration * 0.9, duration - 30)), watchedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('anidep-history'));
}
export function removeHistory(animeId, episode) {
  const data = getHistory();
  delete data[animeId + ':' + episode];
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('anidep-history'));
}
