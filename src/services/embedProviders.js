const vidNestAuthorized = import.meta.env?.VITE_VIDNEST_EMBED_AUTHORIZED === 'true';
const allowedIds = new Set((import.meta.env?.VITE_VIDNEST_ALLOWED_ANILIST_IDS || '').split(',').map(Number).filter(id => Number.isSafeInteger(id) && id > 0));

export const vidNestProvider = {
  id: 'vidnest',
  name: 'VidNest',
  enabled: vidNestAuthorized && allowedIds.size > 0,
  status: vidNestAuthorized && allowedIds.size > 0 ? 'configured' : 'authorization-required',
  supportedFormats: ['TV', 'OVA', 'ONA', 'SPECIAL'],
  languages: ['sub', 'dub'],
  unavailableReason: 'VidNest mendokumentasikan iframe anime, tetapi izin atas episode yang dikumpulkannya belum dapat diverifikasi. Aktifkan hanya jika kamu memiliki izin untuk konten yang diputar.',
  isAllowed(anilistId) { return vidNestAuthorized && allowedIds.has(Number(anilistId)); },
  buildUrl(anilistId, episode, language = 'sub') {
    const id = Number(anilistId);
    const number = Number(episode);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(number) || number < 1) return null;
    return `https://vidnest.fun/anime/${id}/${number}/${language === 'dub' ? 'dub' : 'sub'}`;
  }
};

export const embedProviders = [vidNestProvider];
