import { useEffect, useState } from 'react';

let configured = false;
let loadPromise = null;
function loadProviderStatus() {
  loadPromise ||= fetch('/api/providers')
    .then(response => response.ok ? response.json() : Promise.reject(new Error('providers')))
    .then(data => {
      configured = data.providers?.find(provider => provider.id === 'vidnest')?.configured === true;
    })
    .catch(() => { loadPromise = null; });
  return loadPromise;
}
export function useVidNestStatus() {
  const [, setReady] = useState(false);
  useEffect(() => { let active = true; loadProviderStatus().then(() => active && setReady(true)); return () => { active = false; }; }, []);
}

export const vidNestProvider = {
  id: 'vidnest',
  name: 'VidNest',
  get configured() { return configured; },
  supportedFormats: ['TV', 'OVA', 'ONA', 'SPECIAL', 'MOVIE'],
  unavailableReason: 'VidNest belum aktif. Aktifkan VIDNEST_ENABLED=true di .env server untuk mencoba embed; ketersediaan video tidak dijamin.',
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
