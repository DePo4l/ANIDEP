const key = 'anidep:watch-history:v1';
export function getHistory() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
export function saveProgress({ animeId, episode, position, duration, title, cover, completed = false }) {
  const data = getHistory();
  const id = animeId + ':' + episode;
  data[id] = { animeId: Number(animeId), episode: Number(episode), position: Number(position) || 0, duration: Number(duration) || 0, title, cover, completed: completed || (duration > 0 && position >= Math.max(duration * 0.9, duration - 30)), watchedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('anidep-history'));
}
export function removeHistory(animeId, episode) {
  const data = getHistory();
  delete data[animeId + ':' + episode];
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('anidep-history'));
}
