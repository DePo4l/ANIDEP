const enabled = import.meta.env?.VITE_VIDNEST_ENABLED !== 'false';

export const vidNestProvider = {
  id: 'vidnest',
  name: 'VidNest',
  configured: enabled,
  supportedFormats: ['TV', 'OVA', 'ONA', 'SPECIAL'],
  // A reachable embed page does not establish that an episode exists or can play.
  buildUrl(anilistId, episode) {
    const id = Number(anilistId);
    const number = Number(episode);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(number) || number < 1) return null;
    return `https://vidnest.fun/anime/${id}/${number}/sub`;
  }
};

export const embedProviders = [vidNestProvider];
