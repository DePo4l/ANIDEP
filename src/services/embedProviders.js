import { useEffect, useState } from 'react';

// The allowlist lives on the server (VIDNEST_ALLOWED_ANILIST_IDS), so editing it needs only a server restart.
let allowedIds = new Set();
let loadPromise = null;
function loadAllowlist() {
  loadPromise ||= fetch('/api/providers')
    .then(response => response.ok ? response.json() : Promise.reject(new Error('providers')))
    .then(data => {
      const ids = data.providers?.find(provider => provider.id === 'vidnest')?.allowedAnilistIds || [];
      allowedIds = new Set(ids.map(Number).filter(id => Number.isSafeInteger(id) && id > 0));
    })
    .catch(() => { loadPromise = null; });
  return loadPromise;
}
// Re-renders the caller once the allowlist has loaded.
export function useVidNestAllowlist() {
  const [, setReady] = useState(false);
  useEffect(() => { let active = true; loadAllowlist().then(() => active && setReady(true)); return () => { active = false; }; }, []);
}

export const vidNestProvider = {
  id: 'vidnest',
  name: 'VidNest',
  get configured() { return allowedIds.size > 0; },
  supportedFormats: ['TV', 'OVA', 'ONA', 'SPECIAL', 'MOVIE'],
  isAllowed(anilistId) { return allowedIds.has(Number(anilistId)); },
  unavailableReason: 'VidNest memerlukan izin embed untuk judul ini. Tambahkan AniList ID ke VIDNEST_ALLOWED_ANILIST_IDS di .env server jika kamu memiliki hak untuk kontennya.',
  // A reachable embed page does not establish that an episode exists or can play.
  buildUrl(anilistId, episode) {
    const id = Number(anilistId);
    const number = Number(episode);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(number) || number < 1) return null;
    return `https://vidnest.fun/anime/${id}/${number}/sub`;
  },
  buildMovieUrl(tmdbId) {
    const id = Number(tmdbId);
    return Number.isSafeInteger(id) && id > 0 ? `https://vidnest.fun/movie/${id}` : null;
  }
};

export const embedProviders = [vidNestProvider];
export function embedCheckReady(check, key) { return check?.key === key && check.pageReachable === true; }
