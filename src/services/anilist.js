const endpoint = 'https://graphql.anilist.co';
const cache = new Map();
const cardFields = 'id title { romaji english } coverImage { large } format episodes averageScore status season seasonYear';

async function query(document, variables = {}) {
  const key = JSON.stringify([document, variables]);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: document, variables })
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'AniList sedang membatasi permintaan. Coba lagi sebentar.' : 'AniList tidak tersedia.');
  const result = await response.json();
  if (result.errors?.length) throw new Error(result.errors[0].message || 'Data AniList gagal dimuat.');
  cache.set(key, { value: result.data, expires: Date.now() + 5 * 60_000 });
  return result.data;
}

export function titleOf(anime) { return anime?.title?.english || anime?.title?.romaji || 'Tanpa judul'; }
export function synopsisOf(anime) { return (anime?.description || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#039;/g, "'"); }

export async function listAnime({ kind = 'trending', search = '', page = 1 } = {}) {
  const now = new Date();
  const season = ['WINTER', 'SPRING', 'SUMMER', 'FALL'][Math.floor(now.getMonth() / 3)];
  const sort = kind === 'popular' ? 'POPULARITY_DESC' : 'TRENDING_DESC';
  const seasonal = kind === 'seasonal' && !search;
  const document = `query ($page: Int${search ? ', $search: String' : ''}${seasonal ? ', $season: MediaSeason, $year: Int' : ''}) { Page(page: $page, perPage: 24) { pageInfo { hasNextPage } media(type: ANIME, isAdult: false, sort: ${sort}${search ? ', search: $search' : ''}${seasonal ? ', season: $season, seasonYear: $year' : ''}) { ${cardFields} } } }`;
  const data = await query(document, { page: Math.max(1, page), ...(search ? { search } : {}), ...(seasonal ? { season, year: now.getFullYear() } : {}) });
  return { items: data.Page.media, hasMore: data.Page.pageInfo.hasNextPage };
}

export async function getAnime(id) {
  const data = await query(`query ($id: Int) { Media(id: $id, type: ANIME) { ${cardFields} description(asHtml: false) bannerImage genres duration studios(isMain: true) { nodes { name } } nextAiringEpisode { episode airingAt } } }`, { id: Number(id) });
  return data.Media;
}

export async function getRecommendations(id) {
  const data = await query(`query ($id: Int) { Media(id: $id, type: ANIME) { recommendations(perPage: 8, sort: RATING_DESC) { nodes { mediaRecommendation { ${cardFields} } } } } }`, { id: Number(id) });
  return data.Media?.recommendations?.nodes?.map(row => row.mediaRecommendation).filter(Boolean) || [];
}
