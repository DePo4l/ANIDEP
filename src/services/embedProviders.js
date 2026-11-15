import { useEffect, useState } from 'react';

let status = 'loading';
let loadPromise = null;
export function loadProviderStatus() {
  loadPromise ||= fetch('/api/providers')
    .then(response => response.ok && response.headers.get('content-type')?.includes('application/json') ? response.json() : Promise.reject(new Error('providers')))
    .then(data => {
      const provider = data.providers?.find(item => item.id === 'vidnest');
      if (typeof provider?.configured !== 'boolean') throw new Error('providers');
      status = provider.configured ? 'enabled' : 'disabled';
    })
    .catch(() => { status = 'error'; loadPromise = null; });
  return loadPromise;
}
export function useVidNestStatus() {
  const [, setReady] = useState(false);
  useEffect(() => { let active = true; loadProviderStatus().then(() => active && setReady(true)); return () => { active = false; }; }, []);
}

export const vidNestProvider = {
  id: 'vidnest',
  name: 'VidNest',
  get configured() { return status === 'enabled'; },
  supportedFormats: ['TV', 'OVA', 'ONA', 'SPECIAL', 'MOVIE'],
  get unavailableReason() { return status === 'error' ? 'API ANIDEP tidak mengembalikan JSON. Periksa endpoint /api/providers pada deployment.' : status === 'loading' ? 'Memeriksa konfigurasi penyedia video…' : 'VidNest belum aktif. Atur VIDNEST_ENABLED=true pada lingkungan server; ketersediaan video tidak dijamin.'; },
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
