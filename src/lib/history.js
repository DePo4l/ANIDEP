const key = 'anidep:watch-history:v1';
export function getHistory() { try { const data = JSON.parse(localStorage.getItem(key) || '{}'); return Array.isArray(data) ? Object.fromEntries(data.filter(item => item?.animeId && item?.episode).map(item => [`${item.animeId}:${item.episode}`, item])) : data && typeof data === 'object' ? data : {}; } catch { return {}; } }
export function historyActivity(item) { return Math.max(Number(item?.watchedAt) || 0, Number(item?.openedAt) || 0, Number(item?.lastWatched) || 0); }
export function groupContinueWatching(history) {
  const latest = new Map();
  for (const [key, item] of Object.entries(history || {})) {
    if (!item || typeof item !== 'object' || item.watchMode === 'selection' && !item.watchedAt && !item.openedAt) continue;
    const animeId = Number(item.animeId ?? key.split(':')[0]);
    const episode = Number(item.episode ?? key.split(':')[1]);
    if (!Number.isSafeInteger(animeId) || animeId < 1 || !Number.isSafeInteger(episode) || episode < 1) continue;
    const record = { ...item, animeId, episode };
    const previous = latest.get(animeId);
    if (!previous || historyActivity(record) >= historyActivity(previous)) latest.set(animeId, record);
  }
  return [...latest.values()].filter(item => !(item.completed && item.watchMode === 'manual'))
    .sort((a, b) => historyActivity(b) - historyActivity(a));
}
export function recordSelection({ animeId, episode, title, cover, format }) {
  const data = getHistory();
  const id = animeId + ':' + episode;
  data[id] = { ...data[id], animeId: Number(animeId), episode: Number(episode), title, cover, format, watchMode: data[id]?.watchMode || 'selection', selectedAt: Date.now() };
  writeHistory(data);
}
export function writeHistory(data) {
  try { localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('anidep-history')); return true; }
  catch { return false; }
}
export function clearProgress(animeId, episode) {
  const data = getHistory();
  const item = data[animeId + ':' + episode];
  if (item?.watchMode !== 'manual') return;
  delete item.position; delete item.duration; delete item.completed; delete item.watchedAt;
  item.watchMode = 'selection';
  writeHistory(data);
}
export function recordOpen({ animeId, episode, language, title, cover, format }) {
  const data = getHistory();
  const id = animeId + ':' + episode;
  data[id] = { ...data[id], animeId: Number(animeId), episode: Number(episode), language, title, cover, format, watchMode: 'embed', openedAt: Date.now() };
  writeHistory(data);
}
export function saveProgress({ animeId, episode, position, duration, title, cover, format, completed = false }) {
  const data = getHistory();
  const id = animeId + ':' + episode;
  data[id] = { ...data[id], animeId: Number(animeId), episode: Number(episode), position: Number(position) || 0, duration: Number(duration) || 0, title, cover, format: format || data[id]?.format, watchMode: 'manual', completed: completed || (duration > 0 && position >= Math.max(duration * 0.9, duration - 30)), watchedAt: Date.now() };
  writeHistory(data);
}
export function removeHistory(animeId, episode) {
  const data = getHistory();
  delete data[animeId + ':' + episode];
  writeHistory(data);
}
