const authorized = import.meta.env?.VITE_VIDNEST_EMBED_AUTHORIZED === 'true';
const allowedIds = new Set((import.meta.env?.VITE_VIDNEST_ALLOWED_ANILIST_IDS || '').split(',').map(Number).filter(id => Number.isSafeInteger(id) && id > 0));

export const vidNestProvider = {
  id: 'vidnest',
  name: 'VidNest',
  configured: authorized && allowedIds.size > 0,
  supportedFormats: ['TV', 'OVA', 'ONA', 'SPECIAL'],
  isAllowed(anilistId) { return authorized && allowedIds.has(Number(anilistId)); },
  unavailableReason: 'VidNest memerlukan izin embed untuk judul ini. Tambahkan AniList ID ke daftar izin di .env jika kamu memiliki hak untuk kontennya.',
  // A reachable embed page does not establish that an episode exists or can play.
  buildUrl(anilistId, episode) {
    const id = Number(anilistId);
    const number = Number(episode);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(number) || number < 1) return null;
    return `https://vidnest.fun/anime/${id}/${number}/sub`;
  }
};

export const embedProviders = [vidNestProvider];
export function embedCheckReady(check, key) { return check?.key === key && check.pageReachable === true; }
