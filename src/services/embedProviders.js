import { useEffect, useState } from 'react';

let status = 'loading';
export function loadProviderStatus() {
  status = 'loading';
  return fetch('/api/providers', { cache: 'no-store' })
    .then(response => response.ok && response.headers.get('content-type')?.includes('application/json') ? response.json() : Promise.reject(new Error('providers')))
    .then(data => {
      const provider = data.providers?.find(item => item.id === 'vidnest');
      if (typeof provider?.configured !== 'boolean') throw new Error('providers');
      status = provider.configured ? 'enabled' : 'disabled';
      return status;
    })
    .catch(() => { status = 'error'; return status; });
}
export function useVidNestStatus(routeKey) {
  const [current, setCurrent] = useState('loading');
  useEffect(() => {
    let active = true;
    setCurrent('loading');
    loadProviderStatus().then(next => { if (active) setCurrent(next); });
    return () => { active = false; };
  }, [routeKey]);
  return current;
}

export function providerUnavailableReason(current = status) {
  return current === 'error' ? 'Konfigurasi VidNest tidak dapat diperiksa melalui API ANIDEP. Coba muat ulang halaman.' : current === 'loading' ? 'Memeriksa konfigurasi penyedia video…' : 'VidNest belum aktif. Atur VIDNEST_ENABLED=true pada lingkungan server; ketersediaan video tidak dijamin.';
}

export const vidNestProvider = {
  id: 'vidnest',
  name: 'VidNest',
  get configured() { return status === 'enabled'; },
  supportedFormats: ['TV', 'TV_SHORT', 'OVA', 'ONA', 'SPECIAL', 'MOVIE'],
  get unavailableReason() { return providerUnavailableReason(); },
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
