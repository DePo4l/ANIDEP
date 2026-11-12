const anilistEndpoint = 'https://graphql.anilist.co';
const tmdbEndpoint = 'https://api.themoviedb.org/3/search/movie';

export class MovieLookupError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

function normalize(title) {
  return (typeof title === 'string' ? title : '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();
}

export async function searchTmdbMovies(query, token, request = fetch) {
  if (!token) throw new MovieLookupError('Token TMDB belum diatur di server.', 503);
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > 100) throw new MovieLookupError('Judul pencarian harus 2–100 karakter.', 400);
  const url = new URL(tmdbEndpoint);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('include_adult', 'false');
  let response;
  try { response = await request(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(8000) }); }
  catch { throw new MovieLookupError('TMDB tidak dapat dihubungi.'); }
  if (response.status === 401 || response.status === 403) throw new MovieLookupError('Token TMDB tidak valid atau ditolak.', 502);
  if (!response.ok) throw new MovieLookupError(`Pencarian TMDB gagal (HTTP ${response.status}).`);
  let data;
  try { data = await response.json(); } catch { throw new MovieLookupError('Respons TMDB bukan JSON yang valid.'); }
  if (!Array.isArray(data.results)) throw new MovieLookupError('Respons TMDB tidak memuat daftar film.');
  return data.results.filter(movie => movie && Number.isSafeInteger(movie.id) && movie.id > 0).map(movie => ({
    id: movie.id, title: movie.title, originalTitle: movie.original_title, releaseDate: movie.release_date
  }));
}

export async function matchAniListMovie(anilistId, token, request = fetch) {
  if (!token) throw new MovieLookupError('Token TMDB belum diatur di server.', 503);
  let response;
  try {
    response = await request(anilistEndpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ query: 'query ($id: Int) { Media(id: $id, type: ANIME) { id format title { english romaji native } synonyms startDate { year } } }', variables: { id: Number(anilistId) } })
    });
  } catch { throw new MovieLookupError('AniList tidak dapat dihubungi.'); }
  if (!response.ok) throw new MovieLookupError(`AniList gagal (HTTP ${response.status}).`);
  let data;
  try { data = await response.json(); } catch { throw new MovieLookupError('Respons AniList bukan JSON yang valid.'); }
  if (data.errors?.length) throw new MovieLookupError('AniList gagal mengambil metadata film.');
  const anime = data.data?.Media;
  if (!anime) throw new MovieLookupError('Judul tidak ditemukan di AniList.', 404);
  if (anime.format !== 'MOVIE') throw new MovieLookupError('Judul AniList ini bukan film.', 400);
  const year = anime.startDate?.year;
  if (!Number.isSafeInteger(year) || year < 1888) return { anilistId: anime.id, match: null, reason: 'Tahun film belum tersedia di AniList; kecocokan TMDB tidak dapat dipastikan.' };
  const titles = [...new Set([anime.title?.english, anime.title?.romaji, anime.title?.native, ...(anime.synonyms || [])].filter(title => normalize(title).length > 1))];
  const matchesFor = (movies, title) => movies.filter(movie => {
    const sameTitle = [movie.title, movie.originalTitle].some(candidate => normalize(candidate) === normalize(title));
    const movieYear = Number(movie.releaseDate?.slice(0, 4));
    return sameTitle && Number.isSafeInteger(movieYear) && Math.abs(movieYear - year) <= 1;
  });
  if (!titles.length) return { anilistId: anime.id, match: null, reason: 'Judul film AniList tidak tersedia untuk pencocokan TMDB.' };
  const primary = matchesFor(await searchTmdbMovies(titles[0], token, request), titles[0]);
  const matched = movie => ({ anilistId: anime.id, tmdbId: movie.id, title: movie.title, releaseDate: movie.releaseDate });
  if (primary.length === 1) return matched(primary[0]);
  const alternatives = (await Promise.all(titles.slice(1).map(async title => matchesFor(await searchTmdbMovies(title, token, request), title)))).flat();
  const candidates = primary.length ? primary.filter(movie => alternatives.some(other => other.id === movie.id)) : alternatives;
  const unique = new Map(candidates.map(movie => [movie.id, movie]));
  if (unique.size === 1) return matched(unique.values().next().value);
  if (primary.length > 1 || unique.size > 1) return { anilistId: anime.id, match: null, reason: 'Beberapa film TMDB cocok; pilih tautan resmi agar tidak membuka film yang salah.' };
  return { anilistId: anime.id, match: null, reason: 'Film ini belum dapat dicocokkan dengan yakin di TMDB.' };
}
