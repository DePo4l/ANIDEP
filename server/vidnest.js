export function validId(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}

export async function checkVidNestPage(anilistId, episode, request = fetch) {
  const url = `https://vidnest.fun/anime/${anilistId}/${episode}/sub`;
  try {
    const response = await request(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return { pageReachable: response.ok ? true : [403, 405].includes(response.status) ? null : false, httpStatus: response.status, episodeAvailability: 'unknown', playbackVerified: false };
  } catch (error) {
    return { pageReachable: false, httpStatus: null, episodeAvailability: 'unknown', playbackVerified: false, error: error.message };
  }
}

export async function checkVidNestMoviePage(tmdbId, request = fetch) {
  try {
    const response = await request(`https://vidnest.fun/movie/${tmdbId}`, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return { pageReachable: response.ok ? true : [403, 405].includes(response.status) ? null : false, httpStatus: response.status, playbackVerified: false };
  } catch (error) {
    return { pageReachable: false, httpStatus: null, playbackVerified: false, error: error.message };
  }
}
