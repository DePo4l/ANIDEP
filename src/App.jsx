import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { episodeCountOf, episodeNumbers, getAnime, getRecommendations, listAnime, synopsisOf, titleOf } from './services/anilist.js';
import { addMedia, removeMedia, userMediaProvider } from './services/providers.js';
import { embedCheckReady, vidNestProvider } from './services/embedProviders.js';
import { getHistory, recordOpen, removeHistory, saveProgress } from './lib/history.js';
import EpisodePicker from './components/EpisodePicker.jsx';
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
  useEffect(() => { const update = () => setHistory(Object.values(getHistory()).sort((a, b) => b.watchedAt - a.watchedAt).filter(item => !item.completed || item.watchMode === 'embed').slice(0, 4)); update(); window.addEventListener('anidep-history', update); return () => window.removeEventListener('anidep-history', update); }, []);
  useEffect(() => { let active = true; setLoading(true); setError(''); listAnime({ kind, search, page }).then(result => { if (!active) return; setItems(previous => page === 1 ? result.items : [...previous, ...result.items]); setHasMore(result.hasMore); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [kind, search, page, retry]);
  const changeKind = value => { setKind(value); setPage(1); setItems([]); };
  return <main className="container"><section className="hero"><div className="hero-copy"><span className="eyebrow">✦ DUNIA ANIME DALAM GENGGAMAN</span><h1>Temukan cerita<br /><em>berikutnya.</em></h1><p>Jelajahi ribuan anime dari AniList. Buka pemutar embed yang diizinkan atau gunakan video pribadi sebagai pilihan tambahan.</p><div className="hero-actions"><a className="button primary" href="#discover">Mulai jelajahi <span>↗</span></a><Link className="button ghost" to="/history">Lanjutkan menonton</Link></div></div><div className="hero-art"><span className="art-ring">✦</span><div><small>ANIDEP ORIGINAL SPACE</small><strong>Your next favorite<br />starts here.</strong></div></div></section>
    {history.length > 0 && <section className="continue"><div className="section-heading"><div><span className="eyebrow">KEMBALI MENONTON</span><h2>Lanjutkan menonton</h2></div><Link to="/history">Lihat riwayat →</Link></div><div className="continue-grid">{history.map(item => <Link to={item.format === 'MOVIE' ? `/watch/${item.animeId}` : `/watch/${item.animeId}/${item.episode}`} className="continue-card" key={item.animeId + ':' + item.episode}><img src={item.cover} alt="" /><div><b>{item.title}</b><span>{item.format === 'MOVIE' ? 'Film' : 'Episode ' + item.episode}{item.watchMode === 'embed' ? ' · ' + (item.language === 'dub' ? 'Dub' : 'Sub') : ''}</span>{item.watchMode !== 'embed' && <progress value={item.position} max={item.duration || 1} />}</div></Link>)}</div></section>}
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
    {isMovie && <section className="block"><Notice>Film ditampilkan sebagai satu judul, tanpa daftar episode. VidNest belum memiliki format film berbasis AniList yang terverifikasi.</Notice><OfficialLinks anime={anime} /></section>}
    <section className="block"><details className="manual-details"><summary>Tambahkan video pribadi (opsional)</summary><p className="muted">Gunakan hanya URL yang kamu miliki atau diizinkan untuk diputar.</p><MediaForm animeId={animeId} isMovie={isMovie} onAdded={refreshEpisodes} /></details></section>
    {recommendations.length > 0 && <section className="block"><div className="section-heading"><div><span className="eyebrow">JELAJAHI LAGI</span><h2>Rekomendasi</h2></div></div><Grid items={recommendations} /></section>}
  </main>;
}

function Watch() {
  const { animeId, episodeNumber } = useParams();
  const navigate = useNavigate();
  const number = Number(episodeNumber ?? 1);
  const [anime, setAnime] = useState(null), [loading, setLoading] = useState(true), [episodes, setEpisodes] = useState([]), [sources, setSources] = useState([]), [sourceId, setSourceId] = useState(''), [error, setError] = useState('');
  const [playerMode, setPlayerMode] = useState('auto');
  const [vidNestCheck, setVidNestCheck] = useState({ checking: false, pageReachable: null });
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const refresh = () => Promise.all([userMediaProvider.getEpisodes(animeId), userMediaProvider.getStreamingSources(number, animeId)]).then(([list, media]) => {
    setEpisodes(list); setSources(media); setSourceId(current => media.some(item => item.id === current) ? current : media[0]?.id || '');
  });
  useEffect(() => {
    let active = true;
    setAnime(null); setEpisodes([]); setSources([]); setSourceId(''); setLoading(true); setSourcesLoading(true); setError(''); setPlayerMode('auto');
    getAnime(animeId).then(data => { if (active) setAnime(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    refresh().finally(() => { if (active) setSourcesLoading(false); });
    const listener = () => refresh();
    window.addEventListener('anidep-sources', listener);
    return () => { active = false; window.removeEventListener('anidep-sources', listener); };
  }, [animeId, number]);
  const isMovie = anime?.format === 'MOVIE';
  const count = episodeCountOf(anime);
  const numbers = episodeNumbers(count, episodes);
  const validEpisode = isMovie ? number === 1 : numbers.includes(number);
  const source = sources.find(item => item.id === sourceId);
  const checkKey = `${animeId}:${number}`;
  const canCheckVidNest = Boolean(anime && validEpisode && !isMovie && number <= count && vidNestProvider.isAllowed(animeId) && vidNestProvider.supportedFormats.includes(anime.format));
  const shouldCheckVidNest = canCheckVidNest && !sourcesLoading && (playerMode === 'embed' || (playerMode === 'auto' && !source));
  useEffect(() => {
    if (!shouldCheckVidNest) { setVidNestCheck({ key: checkKey, checking: false, pageReachable: null }); return; }
    const controller = new AbortController();
    setVidNestCheck({ key: checkKey, checking: true, pageReachable: null });
    fetch(`/api/providers/vidnest/check?anilistId=${animeId}&episode=${number}`, { signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Pemeriksaan VidNest gagal.'); return result; })
      .then(result => setVidNestCheck({ ...result, key: checkKey, checking: false }))
      .catch(err => { if (err.name !== 'AbortError') setVidNestCheck({ key: checkKey, checking: false, pageReachable: false, error: err.message }); });
    return () => controller.abort();
  }, [animeId, number, checkKey, shouldCheckVidNest]);
  const embedReady = shouldCheckVidNest && embedCheckReady(vidNestCheck, checkKey);
  const checking = shouldCheckVidNest && (vidNestCheck.key !== checkKey || vidNestCheck.checking);
  const mode = playerMode === 'auto' ? source ? 'manual' : sourcesLoading || checking ? 'loading' : embedReady ? 'embed' : 'none' : playerMode === 'embed' && checking ? 'loading' : playerMode;
  useEffect(() => {
    if (mode === 'embed' && embedReady) recordOpen({ animeId, episode: number, language: 'sub', title: titleOf(anime), cover: anime.coverImage?.large, format: anime.format });
  }, [animeId, number, mode, embedReady]);
  if (!Number.isSafeInteger(number) || number < 1) return <main className="container page"><Notice>Nomor episode tidak valid.</Notice></main>;
  if (loading) return <main className="container page"><Notice>Memuat halaman tonton…</Notice></main>;
  if (error || !anime) return <main className="container page"><Notice>{error || 'Anime tidak ditemukan.'}</Notice></main>;
  const history = getHistory()[animeId + ':' + number];
  const recent = Object.values(getHistory()).filter(item => (item.animeId !== Number(animeId) || item.episode !== number) && (!item.completed || item.watchMode === 'embed')).sort((a, b) => b.watchedAt - a.watchedAt).slice(0, 4);
  const index = numbers.indexOf(number);
  const previous = index > 0 ? numbers[index - 1] : null;
  const next = index >= 0 ? numbers[index + 1] : null;
  const emptyMessage = isMovie ? 'VidNest tidak mendokumentasikan film dengan AniList ID. Lihat tautan resmi atau gunakan video pribadi.' : !validEpisode ? 'Nomor episode ini belum tercantum di AniList atau sumber pribadi.' : !canCheckVidNest ? vidNestProvider.unavailableReason : vidNestCheck.key === checkKey && vidNestCheck.error ? `VidNest tidak dapat diperiksa: ${vidNestCheck.error}` : vidNestCheck.key === checkKey && vidNestCheck.httpStatus ? `Halaman VidNest merespons HTTP ${vidNestCheck.httpStatus}. Video episode ini belum tersedia di ANIDEP.` : 'Belum ada sumber video yang dapat diputar untuk episode ini.';
  return <main className="container page"><Link className="back" to={`/anime/${animeId}`}>← Detail anime</Link><div className="watch-layout"><div>
    {mode === 'manual' && source ? <VideoPlayer key={animeId + ':' + number + ':' + sourceId} source={source} resumeAt={history?.position || 0} onProgress={(position, duration, completed) => saveProgress({ animeId, episode: number, position, duration, completed, title: titleOf(anime), cover: anime.coverImage?.large, format: anime.format })} /> : mode === 'embed' && embedReady ? <VidNestPlayer anilistId={animeId} episode={number} /> : mode === 'demo' ? <><VideoPlayer source={demoSource} /><p className="embed-note">Ini video uji publik, bukan episode {titleOf(anime)}.</p></> : <div className="player-empty">{mode === 'loading' ? 'Memeriksa halaman VidNest…' : emptyMessage}</div>}
    <div className="watch-title"><img className="watch-cover" src={anime.coverImage?.large} alt="" /><div><span className="eyebrow">SEDANG DITONTON</span><h1>{titleOf(anime)}</h1><p>{isMovie ? 'Film' : `Episode ${number}`} {anime.duration ? '· ' + anime.duration + ' menit' : ''}</p></div></div>
    {!isMovie && <div className="watch-nav"><button disabled={!previous} onClick={() => navigate(`/watch/${animeId}/${previous}`)}>← Episode sebelumnya</button><button disabled={!next} onClick={() => navigate(`/watch/${animeId}/${next}`)}>Episode berikutnya →</button></div>}
    <section className="block"><h2>Tentang anime</h2><p className="muted">{synopsisOf(anime) || 'Sinopsis belum tersedia.'}</p><OfficialLinks anime={anime} /></section>
    {recent.length > 0 && <section className="block"><h2>Lanjutkan menonton</h2><div className="continue-grid">{recent.map(item => <Link className="continue-card" key={item.animeId + ':' + item.episode} to={item.format === 'MOVIE' ? `/watch/${item.animeId}` : `/watch/${item.animeId}/${item.episode}`}><img src={item.cover} alt="" /><div><b>{item.title}</b><span>{item.format === 'MOVIE' ? 'Film' : `Episode ${item.episode}`}</span>{item.watchMode !== 'embed' && <progress value={item.position} max={item.duration || 1} />}</div></Link>)}</div></section>}
  </div><aside><div className="side-panel"><span className="eyebrow">SUMBER VIDEO</span><h2>Pilih sumber</h2>
    {canCheckVidNest && <><button className="button source-button" onClick={() => setPlayerMode('embed')}>VidNest{mode === 'embed' && embedReady ? ' · dipilih' : checking ? ' · memeriksa' : ''}</button><p className="muted">{embedReady ? 'Halaman embed dapat diakses. Ketersediaan dan playback episode belum dapat diverifikasi dari luar iframe.' : 'Jika VidNest gagal, gunakan sumber pribadi atau tautan resmi di bawah deskripsi.'}</p></>}
    {sources.length > 0 && <><button className="button source-button" onClick={() => setPlayerMode('manual')}>Sumber pribadi{mode === 'manual' ? ' · dipilih' : ''}</button><select aria-label="Sumber streaming pribadi" value={sourceId} onChange={event => { setSourceId(event.target.value); setPlayerMode('manual'); }}>{sources.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{mode === 'manual' && <button className="text-button danger" onClick={() => { removeMedia(animeId, number, sourceId); refresh(); setPlayerMode('auto'); }}>Hapus sumber ini</button>}</>}
    {!embedReady && !sources.length && <p className="muted">Belum ada sumber episode yang terverifikasi. Video demo di bawah hanya untuk memeriksa pemutar.</p>}
    <button className="button source-button" onClick={() => setPlayerMode('demo')}>Uji pemutar dengan video demo{mode === 'demo' ? ' · dipilih' : ''}</button>
    <details className="manual-details"><summary>Gunakan URL video pribadi (opsional)</summary><MediaForm animeId={animeId} initialEpisode={number} isMovie={isMovie} onAdded={() => { refresh(); setPlayerMode('manual'); }} /></details>
  </div>{!isMovie && <div className="side-panel"><span className="eyebrow">PILIH EPISODE</span><h2>Daftar episode</h2><EpisodePicker animeId={animeId} current={number} count={count} available={episodes} /></div>}</aside></div></main>;
}

function History() {
  const [items, setItems] = useState([]);
  const refresh = () => setItems(Object.values(getHistory()).sort((a, b) => b.watchedAt - a.watchedAt));
  useEffect(() => { refresh(); window.addEventListener('anidep-history', refresh); return () => window.removeEventListener('anidep-history', refresh); }, []);
  return <main className="container page"><span className="eyebrow">JEJAK TONTONANMU</span><h1 className="page-title">Riwayat menonton</h1>{items.length ? <div className="history-list">{items.map(item => <div className="history-item" key={item.animeId + ':' + item.episode}><img src={item.cover} alt="" /><div><Link to={item.format === 'MOVIE' ? `/watch/${item.animeId}` : `/watch/${item.animeId}/${item.episode}`}><h3>{item.title}</h3></Link><p>{item.format === 'MOVIE' ? 'Film' : `Episode ${item.episode}`} · {item.watchMode === 'embed' ? `Terakhir dibuka (${item.language === 'dub' ? 'Dub' : 'Sub'})` : item.completed ? 'Selesai' : 'Lanjutkan dari ' + Math.floor(item.position / 60) + ' menit'}</p>{item.watchMode !== 'embed' && <progress value={item.position} max={item.duration || 1} />}</div><button onClick={() => removeHistory(item.animeId, item.episode)} aria-label={`Hapus riwayat ${item.title} episode ${item.episode}`}>Hapus</button></div>)}</div> : <Notice>Belum ada riwayat menonton. Mulai dari katalog anime.</Notice>}</main>;
}
export default function App() { return <Shell><Routes><Route path="/" element={<Home />} /><Route path="/anime/:animeId" element={<Detail />} /><Route path="/watch/:animeId" element={<Watch />} /><Route path="/watch/:animeId/:episodeNumber" element={<Watch />} /><Route path="/history" element={<History />} /><Route path="*" element={<main className="container page"><Notice>Halaman tidak ditemukan.</Notice></main>} /></Routes></Shell>; }
