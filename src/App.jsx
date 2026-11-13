import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { episodeCountOf, episodeNumbers, getAnime, getRecommendations, listAnime, synopsisOf, titleOf } from './services/anilist.js';
import { addMedia, removeMedia, userMediaProvider } from './services/providers.js';
import { embedCheckReady, vidNestProvider } from './services/embedProviders.js';
import { clearProgress, getHistory, groupContinueWatching, historyActivity, recordOpen, recordSelection, removeHistory, saveProgress } from './lib/history.js';
import EpisodePicker from './components/EpisodePicker.jsx';
import EpisodeSidebar from './components/EpisodeSidebar.jsx';
import ContinueWatching from './components/ContinueWatching.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import VidNestPlayer from './components/VidNestPlayer.jsx';

function Shell({ children }) {
  return <><header className="header"><div className="container nav-inner"><Link className="brand" to="/">ANI<span>DEP</span><small>your anime space</small></Link><nav><NavLink to="/">Jelajahi</NavLink><NavLink to="/history">Riwayat</NavLink></nav><span className="nav-pill">✦ Tonton dengan caramu</span></div></header>{children}<footer className="container">ANIDEP · Data anime dari <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>. Video hanya dari sumber yang diizinkan.</footer></>;
}
function AnimeCard({ anime }) { return <Link className="anime-card" to={`/anime/${anime.id}`}><div className="poster"><img src={anime.coverImage?.large} alt={`Poster ${titleOf(anime)}`} loading="lazy" /><span className="score">★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '—'}</span></div><div className="card-info"><span className="card-kicker">{anime.format || 'ANIME'} · {anime.seasonYear || '—'}</span><h3>{titleOf(anime)}</h3><p>{anime.episodes ? anime.episodes + ' episode' : 'Jumlah episode belum ada'} · {anime.status || 'Status belum ada'}</p></div></Link>; }
function Grid({ items }) { return <div className="anime-grid">{items.map(anime => <AnimeCard anime={anime} key={anime.id} />)}</div>; }
function Notice({ children, retry }) { return <div className="notice" role="status">{children}{retry && <button onClick={retry}>Coba lagi</button>}</div>; }
const demoSource = { id: 'mux-demo', label: 'Video demo HLS', type: 'hls', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' };

function Home() {
  const [kind, setKind] = useState('trending');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [retry, setRetry] = useState(0);
  useEffect(() => { const timer = setTimeout(() => { setSearch(input.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [input]);
  useEffect(() => { const update = () => setHistory(groupContinueWatching(getHistory()).slice(0, 4)); update(); window.addEventListener('anidep-history', update); return () => window.removeEventListener('anidep-history', update); }, []);
  useEffect(() => { let active = true; setLoading(true); setError(''); listAnime({ kind, search, page }).then(result => { if (!active) return; setItems(previous => page === 1 ? result.items : [...previous, ...result.items]); setHasMore(result.hasMore); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [kind, search, page, retry]);
  const changeKind = value => { setKind(value); setPage(1); setItems([]); };
  return <main className="container"><section className="hero"><div className="hero-copy"><span className="eyebrow">✦ DUNIA ANIME DALAM GENGGAMAN</span><h1>Temukan cerita<br /><em>berikutnya.</em></h1><p>Jelajahi ribuan anime dari AniList. Buka pemutar embed yang diizinkan atau gunakan video pribadi sebagai pilihan tambahan.</p><div className="hero-actions"><a className="button primary" href="#discover">Mulai jelajahi <span>↗</span></a><Link className="button ghost" to="/history">Lanjutkan menonton</Link></div></div><div className="hero-art"><span className="art-ring">✦</span><div><small>ANIDEP ORIGINAL SPACE</small><strong>Your next favorite<br />starts here.</strong></div></div></section>
    <ContinueWatching items={history} />
    <section id="discover" className="catalog"><div className="section-heading"><div><span className="eyebrow">PILIHAN UNTUKMU</span><h2>Jelajahi anime</h2><p>Temukan seri, film, dan musim terbaru.</p></div><div className="search-wrap"><span>⌕</span><input aria-label="Cari anime" value={input} onChange={event => setInput(event.target.value)} placeholder="Cari judul anime..." /></div></div><div className="filters" role="group" aria-label="Jenis katalog">{[['trending', 'Trending'], ['popular', 'Populer'], ['seasonal', 'Musim ini']].map(([value, label]) => <button className={kind === value ? 'active' : ''} onClick={() => changeKind(value)} key={value}>{label}</button>)}</div>
      {error && <Notice retry={() => setRetry(value => value + 1)}>{error}</Notice>}{!error && items.length > 0 && <Grid items={items} />}{loading && <Notice>Memuat anime…</Notice>}{!loading && !error && !items.length && <Notice>Tidak ada anime yang ditemukan.</Notice>}{hasMore && !loading && !error && <button className="button load-more" onClick={() => setPage(value => value + 1)}>Muat lebih banyak ↓</button>}</section></main>;
}

function MediaForm({ animeId, onAdded, initialEpisode = 1, isMovie = false }) {
  const [episode, setEpisode] = useState(initialEpisode);
  const [url, setUrl] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [error, setError] = useState('');
  useEffect(() => setEpisode(initialEpisode), [initialEpisode]);
  const submit = event => {
    event.preventDefault();
    try {
      addMedia(animeId, isMovie ? 1 : Number(episode), url.trim(), subtitle.trim());
      setUrl(''); setSubtitle(''); setError(''); onAdded?.();
    } catch (err) { setError(err.message); }
  };
  return <form className="media-form" onSubmit={submit}><div>
    {!isMovie && <label>Episode<input type="number" min="1" value={episode} onChange={event => setEpisode(event.target.value)} required /></label>}
    <label>URL video MP4 atau HLS<input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://contoh.com/video.m3u8" required /></label>
    <label>URL subtitle WebVTT (opsional)<input type="url" value={subtitle} onChange={event => setSubtitle(event.target.value)} placeholder="https://contoh.com/subtitle.vtt" /></label>
  </div><button className="button primary" type="submit">Tambahkan sumber</button>{error && <p className="form-error" role="alert">{error}</p>}</form>;
}

function OfficialLinks({ anime }) {
  const links = anime?.externalLinks?.filter(link => link.type === 'STREAMING' && /^https?:\/\//.test(link.url)) || [];
  if (!links.length) return null;
  return <p className="official-links">Pilihan menonton resmi: {links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.site}</a>)}</p>;
}

function Detail() {
  const { animeId } = useParams();
  const [anime, setAnime] = useState(null), [recommendations, setRecommendations] = useState([]), [episodes, setEpisodes] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const refreshEpisodes = () => userMediaProvider.getEpisodes(animeId).then(setEpisodes);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    getAnime(animeId).then(data => { if (active) setAnime(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    getRecommendations(animeId).then(data => { if (active) setRecommendations(data); }).catch(() => {});
    refreshEpisodes();
    return () => { active = false; };
  }, [animeId]);
  if (loading) return <main className="container page"><Notice>Memuat detail anime…</Notice></main>;
  if (error || !anime) return <main className="container page"><Notice>{error || 'Anime tidak ditemukan.'}</Notice></main>;
  const isMovie = anime.format === 'MOVIE';
  const count = episodeCountOf(anime);
  const numbers = episodeNumbers(count, episodes);
  return <main className="container page"><Link to="/" className="back">← Kembali ke katalog</Link>
    <section className="detail-hero"><div className="detail-poster"><img src={anime.coverImage?.large} alt={`Poster ${titleOf(anime)}`} /></div><div className="detail-copy"><span className="eyebrow">{anime.format || 'ANIME'} · {anime.season} {anime.seasonYear}</span><h1>{titleOf(anime)}</h1><div className="meta"><span>★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '—'}</span><span>{isMovie ? 'Film' : `${count || '—'} episode`}</span><span>{anime.status || 'Status belum ada'}</span></div><p>{synopsisOf(anime) || 'Sinopsis belum tersedia.'}</p><div className="tags">{anime.genres?.map(genre => <span key={genre}>{genre}</span>)}</div>{(isMovie || numbers.length > 0) && <Link className="button primary" to={isMovie ? `/watch/${animeId}` : `/watch/${animeId}/${numbers[0]}`}>Buka halaman tonton →</Link>}</div></section>
    {!isMovie && <section className="block"><div className="section-heading"><div><span className="eyebrow">EPISODE</span><h2>Daftar episode</h2></div><span className="muted">● menandai episode dengan sumber pribadi</span></div><EpisodePicker animeId={animeId} count={count} available={episodes} /></section>}
    {isMovie && <section className="block"><Notice>Film ditampilkan sebagai satu judul. ANIDEP mencari kecocokannya di TMDB sebelum membuka embed VidNest.</Notice><OfficialLinks anime={anime} /></section>}
    <section className="block"><details className="manual-details"><summary>Tambahkan video pribadi (opsional)</summary><p className="muted">Gunakan hanya URL yang kamu miliki atau diizinkan untuk diputar.</p><MediaForm animeId={animeId} isMovie={isMovie} onAdded={refreshEpisodes} /></details></section>
    {recommendations.length > 0 && <section className="block"><div className="section-heading"><div><span className="eyebrow">JELAJAHI LAGI</span><h2>Rekomendasi</h2></div></div><Grid items={recommendations} /></section>}
  </main>;
}

function Watch() {
  const { animeId, episodeNumber } = useParams();
  const number = Number(episodeNumber ?? 1);
  const [anime, setAnime] = useState(null), [loading, setLoading] = useState(true), [episodes, setEpisodes] = useState([]), [sources, setSources] = useState([]), [sourceId, setSourceId] = useState(''), [error, setError] = useState('');
  const [playerMode, setPlayerMode] = useState('auto');
  const [embedOverride, setEmbedOverride] = useState(false);
  const [vidNestCheck, setVidNestCheck] = useState({ checking: false, pageReachable: null });
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourceError, setSourceError] = useState('');
  const refresh = () => {
    setSourcesLoading(true); setSourceError('');
    return Promise.all([userMediaProvider.getEpisodes(animeId), userMediaProvider.getStreamingSources(number, animeId)])
      .then(([list, media]) => { setEpisodes(list); setSources(media); setSourceId(current => media.some(item => item.id === current) ? current : media[0]?.id || ''); })
      .catch(() => setSourceError('Sumber pribadi tidak dapat dibaca. Coba muat ulang halaman.'))
      .finally(() => setSourcesLoading(false));
  };
  useEffect(() => {
    let active = true;
    setAnime(null); setEpisodes([]); setSources([]); setSourceId(''); setLoading(true); setSourcesLoading(true); setError(''); setPlayerMode('auto'); setEmbedOverride(false);
    getAnime(animeId).then(data => { if (active) setAnime(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    refresh();
    const listener = () => refresh();
    window.addEventListener('anidep-sources', listener);
    return () => { active = false; window.removeEventListener('anidep-sources', listener); };
  }, [animeId, number]);
  const isMovie = anime?.format === 'MOVIE';
  const count = episodeCountOf(anime);
  const numbers = episodeNumbers(count, episodes);
  const validEpisode = isMovie ? number === 1 : numbers.includes(number);
  useEffect(() => {
    if (anime?.id === Number(animeId) && validEpisode) recordSelection({ animeId, episode: number, title: titleOf(anime), cover: anime.coverImage?.large, format: anime.format });
  }, [animeId, number, anime?.id, validEpisode]);
  const source = sources.find(item => item.id === sourceId);
  useEffect(() => {
    if (!sourcesLoading && !sourceError && !sources.length && anime?.id === Number(animeId) && validEpisode) clearProgress(animeId, number);
  }, [animeId, number, anime?.id, validEpisode, sourcesLoading, sourceError, sources.length]);
  const checkKey = `${animeId}:${number}`;
  const canCheckVidNest = Boolean(anime && validEpisode && vidNestProvider.isAllowed(animeId) && (isMovie || (number <= count && vidNestProvider.supportedFormats.includes(anime.format))));
  const shouldCheckVidNest = canCheckVidNest && !sourcesLoading && !embedOverride && (playerMode === 'embed' || (playerMode === 'auto' && !source));
  useEffect(() => {
    if (!shouldCheckVidNest) { setVidNestCheck(previous => previous.key === checkKey && previous.pageReachable === null && !previous.checking ? previous : { key: checkKey, checking: false, pageReachable: null }); return; }
    const controller = new AbortController();
    setVidNestCheck({ key: checkKey, checking: true, pageReachable: null });
    const load = async () => {
      const read = async url => { const response = await fetch(url, { signal: controller.signal }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Pemeriksaan penyedia gagal.'); return data; };
      if (isMovie) {
        const match = await read(`/api/movies/${animeId}/tmdb`);
        if (!match.tmdbId) return setVidNestCheck({ key: checkKey, checking: false, pageReachable: false, matchReason: match.reason || 'Film belum cocok di TMDB.' });
        const check = await read(`/api/providers/vidnest/movie/check?anilistId=${animeId}&tmdbId=${match.tmdbId}`);
        setVidNestCheck({ ...check, tmdbId: match.tmdbId, key: checkKey, checking: false });
      } else {
        const check = await read(`/api/providers/vidnest/check?anilistId=${animeId}&episode=${number}`);
        setVidNestCheck({ ...check, key: checkKey, checking: false });
      }
    };
    load()
      .catch(err => { if (err.name !== 'AbortError') setVidNestCheck({ key: checkKey, checking: false, pageReachable: false, error: err.message }); });
    return () => controller.abort();
  }, [animeId, number, checkKey, shouldCheckVidNest, isMovie]);
  const currentCheck = vidNestCheck.key === checkKey;
  const embedReady = shouldCheckVidNest && embedCheckReady(vidNestCheck, checkKey) && (!isMovie || !!vidNestCheck.tmdbId);
  const checking = shouldCheckVidNest && (!currentCheck || vidNestCheck.checking);
  const forceEmbed = embedOverride && canCheckVidNest && !isMovie;
  const mode = playerMode === 'auto' ? source ? 'manual' : sourcesLoading || checking ? 'loading' : embedReady ? 'embed' : 'none' : playerMode === 'embed' && checking ? 'loading' : playerMode;
  useEffect(() => {
    if (mode === 'embed' && (embedReady || forceEmbed)) recordOpen({ animeId, episode: number, language: 'sub', title: titleOf(anime), cover: anime.coverImage?.large, format: anime.format });
  }, [animeId, number, mode, embedReady, forceEmbed]);
  if (!Number.isSafeInteger(number) || number < 1) return <main className="container page"><Notice>Nomor episode tidak valid.</Notice></main>;
  if (loading) return <main className="container page"><Notice>Memuat halaman tonton…</Notice></main>;
  if (error || !anime) return <main className="container page"><Notice>{error || 'Anime tidak ditemukan.'}</Notice></main>;
  const historyData = getHistory();
  const history = historyData[animeId + ':' + number];
  const recent = groupContinueWatching(historyData).filter(item => Number(item.animeId) !== Number(animeId)).slice(0, 4);
  const emptyMessage = sourceError || (!validEpisode ? 'Nomor episode ini belum tercantum di AniList atau sumber pribadi.' : !canCheckVidNest ? vidNestProvider.unavailableReason : currentCheck && vidNestCheck.matchReason ? vidNestCheck.matchReason : currentCheck && vidNestCheck.error ? `VidNest tidak dapat diperiksa: ${vidNestCheck.error}` : currentCheck && vidNestCheck.httpStatus ? `Halaman VidNest merespons HTTP ${vidNestCheck.httpStatus}. Video ${isMovie ? 'film' : 'episode'} ini belum tersedia di ANIDEP.` : 'Belum ada sumber video yang dapat diputar untuk judul ini.');
  return <main className="container page"><Link className="back" to={`/anime/${animeId}`}>← Detail anime</Link><div className="watch-layout"><div>
    {mode === 'manual' && source ? <VideoPlayer key={animeId + ':' + number + ':' + sourceId} source={source} resumeAt={history?.position || 0} onProgress={(position, duration, completed) => saveProgress({ animeId, episode: number, position, duration, completed, title: titleOf(anime), cover: anime.coverImage?.large, format: anime.format })} /> : mode === 'embed' && (embedReady || forceEmbed) ? <VidNestPlayer anilistId={animeId} episode={number} tmdbId={isMovie ? vidNestCheck.tmdbId : null} /> : mode === 'demo' ? <><VideoPlayer source={demoSource} /><p className="embed-note">Ini video uji publik, bukan episode {titleOf(anime)}.</p></> : <div className="player-empty">{mode === 'loading' ? isMovie ? 'Mencari film di TMDB dan memeriksa VidNest…' : 'Memeriksa halaman VidNest…' : emptyMessage}</div>}
    <div className="watch-title"><img className="watch-cover" src={anime.coverImage?.large} alt="" /><div><span className="eyebrow">SEDANG DITONTON</span><h1>{titleOf(anime)}</h1><p>{isMovie ? 'Film' : `Episode ${number}`} {anime.duration ? '· ' + anime.duration + ' menit' : ''}</p></div></div>
    <details className="watch-settings manual-details"><summary>Pengaturan pemutar &amp; sumber video</summary>
      {canCheckVidNest && <><button className="button source-button" onClick={() => { setEmbedOverride(!isMovie); setPlayerMode('embed'); }}>VidNest{mode === 'embed' && (embedReady || forceEmbed) ? ' · dipilih' : checking ? ' · memeriksa' : ''}</button><p className="muted">Halaman embed dapat terbuka meski video belum tersedia. Untuk anime episodik, tombol ini dapat mencoba iframe saat pemeriksaan HEAD diblokir.</p></>}
      {sourceError && <p className="form-error" role="alert">{sourceError}</p>}
      {sources.length > 0 && <><button className="button source-button" onClick={() => setPlayerMode('manual')}>Sumber pribadi{mode === 'manual' ? ' · dipilih' : ''}</button><select aria-label="Sumber streaming pribadi" value={sourceId} onChange={event => { setSourceId(event.target.value); setPlayerMode('manual'); }}>{sources.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{mode === 'manual' && <button className="text-button danger" onClick={() => { removeMedia(animeId, number, sourceId); refresh(); setPlayerMode('auto'); }}>Hapus sumber ini</button>}</>}
      <button className="button source-button" onClick={() => setPlayerMode('demo')}>Uji pemutar dengan video demo{mode === 'demo' ? ' · dipilih' : ''}</button>
      <details className="manual-details"><summary>Gunakan URL video pribadi (opsional)</summary><MediaForm animeId={animeId} initialEpisode={number} isMovie={isMovie} onAdded={() => { refresh(); setPlayerMode('manual'); }} /></details>
    </details>
  </div><aside>{isMovie ? <section className="side-panel movie-panel"><span className="eyebrow">FILM</span><h2>{titleOf(anime)}</h2><p className="muted">{anime.duration ? `${anime.duration} menit` : 'Durasi belum tersedia'} · {anime.seasonYear || 'Tahun belum tersedia'}</p><p className="muted">{currentCheck && vidNestCheck.matchReason ? vidNestCheck.matchReason : embedReady ? 'Halaman VidNest terjangkau; pemutaran belum dipastikan.' : 'VidNest belum dapat dibuka.'}{sources.length ? ' Video pribadi tersimpan.' : ''}</p><OfficialLinks anime={anime} /></section> : <EpisodeSidebar animeId={animeId} count={count} current={number} available={episodes} />}</aside></div>
    <section className="block watch-details"><h2>Tentang anime</h2><p className="muted">{synopsisOf(anime) || 'Sinopsis belum tersedia.'}</p>{!isMovie && <OfficialLinks anime={anime} />}</section>
    <ContinueWatching items={recent} compact />
  </main>;
}

function History() {
  const [items, setItems] = useState([]);
  const refresh = () => setItems(Object.values(getHistory()).sort((a, b) => Math.max(historyActivity(b), Number(b.selectedAt) || 0) - Math.max(historyActivity(a), Number(a.selectedAt) || 0)));
  useEffect(() => { refresh(); window.addEventListener('anidep-history', refresh); return () => window.removeEventListener('anidep-history', refresh); }, []);
  return <main className="container page"><span className="eyebrow">JEJAK TONTONANMU</span><h1 className="page-title">Riwayat menonton</h1>{items.length ? <div className="history-list">{items.map(item => <div className="history-item" key={item.animeId + ':' + item.episode}><img src={item.cover} alt="" /><div><Link to={item.format === 'MOVIE' ? `/watch/${item.animeId}` : `/watch/${item.animeId}/${item.episode}`}><h3>{item.title}</h3></Link><p>{item.format === 'MOVIE' ? 'Film' : `Episode ${item.episode}`} · {item.watchMode === 'embed' ? 'Terakhir dibuka' : item.completed ? 'Selesai' : item.watchMode === 'manual' && Number(item.duration) > 0 ? 'Lanjutkan dari ' + Math.floor((Number(item.position) || 0) / 60) + ' menit' : 'Terakhir dipilih'}</p>{item.watchMode === 'manual' && Number(item.duration) > 0 && <progress value={item.position} max={item.duration} />}</div><button onClick={() => removeHistory(item.animeId, item.episode)} aria-label={`Hapus riwayat ${item.title} episode ${item.episode}`}>Hapus</button></div>)}</div> : <Notice>Belum ada riwayat menonton. Mulai dari katalog anime.</Notice>}</main>;
}
export default function App() { return <Shell><Routes><Route path="/" element={<Home />} /><Route path="/anime/:animeId" element={<Detail />} /><Route path="/watch/:animeId" element={<Watch />} /><Route path="/watch/:animeId/:episodeNumber" element={<Watch />} /><Route path="/history" element={<History />} /><Route path="*" element={<main className="container page"><Notice>Halaman tidak ditemukan.</Notice></main>} /></Routes></Shell>; }
