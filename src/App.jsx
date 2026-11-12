import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { getAnime, getRecommendations, listAnime, synopsisOf, titleOf } from './services/anilist.js';
import { addMedia, removeMedia, userMediaProvider } from './services/providers.js';
import { getHistory, removeHistory, saveProgress } from './lib/history.js';
import EpisodePicker from './components/EpisodePicker.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';

function Shell({ children }) {
  return <><header className="header"><div className="container nav-inner"><Link className="brand" to="/">ANI<span>DEP</span><small>your anime space</small></Link><nav><NavLink to="/">Jelajahi</NavLink><NavLink to="/history">Riwayat</NavLink></nav><span className="nav-pill">✦ Tonton dengan caramu</span></div></header>{children}<footer className="container">ANIDEP · Data anime dari <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>. Video hanya dari sumber yang kamu tambahkan sendiri.</footer></>;
}
function AnimeCard({ anime }) { return <Link className="anime-card" to={`/anime/${anime.id}`}><div className="poster"><img src={anime.coverImage?.large} alt={`Poster ${titleOf(anime)}`} loading="lazy" /><span className="score">★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '—'}</span></div><div className="card-info"><span className="card-kicker">{anime.format || 'ANIME'} · {anime.seasonYear || '—'}</span><h3>{titleOf(anime)}</h3><p>{anime.episodes ? anime.episodes + ' episode' : 'Jumlah episode belum ada'} · {anime.status || 'Status belum ada'}</p></div></Link>; }
function Grid({ items }) { return <div className="anime-grid">{items.map(anime => <AnimeCard anime={anime} key={anime.id} />)}</div>; }
function Notice({ children, retry }) { return <div className="notice" role="status">{children}{retry && <button onClick={retry}>Coba lagi</button>}</div>; }

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
  useEffect(() => { const update = () => setHistory(Object.values(getHistory()).sort((a, b) => b.watchedAt - a.watchedAt).filter(item => !item.completed).slice(0, 4)); update(); window.addEventListener('anidep-history', update); return () => window.removeEventListener('anidep-history', update); }, []);
  useEffect(() => { let active = true; setLoading(true); setError(''); listAnime({ kind, search, page }).then(result => { if (!active) return; setItems(previous => page === 1 ? result.items : [...previous, ...result.items]); setHasMore(result.hasMore); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [kind, search, page, retry]);
  const changeKind = value => { setKind(value); setPage(1); setItems([]); };
  return <main className="container"><section className="hero"><div className="hero-copy"><span className="eyebrow">✦ DUNIA ANIME DALAM GENGGAMAN</span><h1>Temukan cerita<br /><em>berikutnya.</em></h1><p>Jelajahi ribuan anime dari AniList. Tambahkan video MP4 atau HLS yang boleh kamu gunakan, lalu lanjutkan menonton dari posisi terakhir.</p><div className="hero-actions"><a className="button primary" href="#discover">Mulai jelajahi <span>↗</span></a><Link className="button ghost" to="/history">Lanjutkan menonton</Link></div></div><div className="hero-art"><span className="art-ring">✦</span><div><small>ANIDEP ORIGINAL SPACE</small><strong>Your next favorite<br />starts here.</strong></div></div></section>
    {history.length > 0 && <section className="continue"><div className="section-heading"><div><span className="eyebrow">KEMBALI MENONTON</span><h2>Lanjutkan menonton</h2></div><Link to="/history">Lihat riwayat →</Link></div><div className="continue-grid">{history.map(item => <Link to={`/watch/${item.animeId}/${item.episode}`} className="continue-card" key={item.animeId + ':' + item.episode}><img src={item.cover} alt="" /><div><b>{item.title}</b><span>Episode {item.episode}</span><progress value={item.position} max={item.duration || 1} /></div></Link>)}</div></section>}
    <section id="discover" className="catalog"><div className="section-heading"><div><span className="eyebrow">PILIHAN UNTUKMU</span><h2>Jelajahi anime</h2><p>Temukan seri, film, dan musim terbaru.</p></div><div className="search-wrap"><span>⌕</span><input aria-label="Cari anime" value={input} onChange={event => setInput(event.target.value)} placeholder="Cari judul anime..." /></div></div><div className="filters" role="group" aria-label="Jenis katalog">{[['trending', 'Trending'], ['popular', 'Populer'], ['seasonal', 'Musim ini']].map(([value, label]) => <button className={kind === value ? 'active' : ''} onClick={() => changeKind(value)} key={value}>{label}</button>)}</div>
      {error && <Notice retry={() => setRetry(value => value + 1)}>{error}</Notice>}{!error && items.length > 0 && <Grid items={items} />}{loading && <Notice>Memuat anime…</Notice>}{!loading && !error && !items.length && <Notice>Tidak ada anime yang ditemukan.</Notice>}{hasMore && !loading && !error && <button className="button load-more" onClick={() => setPage(value => value + 1)}>Muat lebih banyak ↓</button>}</section></main>;
}

function MediaForm({ animeId, onAdded, initialEpisode = 1 }) {
  const [episode, setEpisode] = useState(initialEpisode);
  const [url, setUrl] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [error, setError] = useState('');
  useEffect(() => setEpisode(initialEpisode), [initialEpisode]);
  const submit = event => { event.preventDefault(); try { addMedia(animeId, Number(episode), url.trim(), subtitle.trim()); setUrl(''); setSubtitle(''); setError(''); onAdded?.(); } catch (err) { setError(err.message); } };
  return <form className="media-form" onSubmit={submit}><div><label>Episode<input type="number" min="1" value={episode} onChange={event => setEpisode(event.target.value)} required /></label><label>URL video MP4 atau HLS<input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://contoh.com/video.m3u8" required /></label><label>URL subtitle WebVTT (opsional)<input type="url" value={subtitle} onChange={event => setSubtitle(event.target.value)} placeholder="https://contoh.com/subtitle.vtt" /></label></div><button className="button primary" type="submit">Tambahkan sumber</button>{error && <p className="form-error" role="alert">{error}</p>}</form>;
}

function Detail() {
  const { animeId } = useParams();
  const [anime, setAnime] = useState(null), [recommendations, setRecommendations] = useState([]), [episodes, setEpisodes] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const refreshEpisodes = () => userMediaProvider.getEpisodes(animeId).then(setEpisodes);
  useEffect(() => { let active = true; setLoading(true); setError(''); getAnime(animeId).then(data => { if (active) setAnime(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); getRecommendations(animeId).then(data => { if (active) setRecommendations(data); }).catch(() => {}); refreshEpisodes(); return () => { active = false; }; }, [animeId]);
  if (loading) return <main className="container page"><Notice>Memuat detail anime…</Notice></main>;
  if (error || !anime) return <main className="container page"><Notice>{error || 'Anime tidak ditemukan.'}</Notice></main>;
  return <main className="container page"><Link to="/" className="back">← Kembali ke katalog</Link><section className="detail-hero"><div className="detail-poster"><img src={anime.coverImage?.large} alt={`Poster ${titleOf(anime)}`} /></div><div className="detail-copy"><span className="eyebrow">{anime.format || 'ANIME'} · {anime.season} {anime.seasonYear}</span><h1>{titleOf(anime)}</h1><div className="meta"><span>★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '—'}</span><span>{anime.episodes || '—'} episode</span><span>{anime.status || 'Status belum ada'}</span></div><p>{synopsisOf(anime) || 'Sinopsis belum tersedia.'}</p><div className="tags">{anime.genres?.map(genre => <span key={genre}>{genre}</span>)}</div><Link className="button primary" to={`/watch/${animeId}/${episodes[0]?.number || 1}`}>Buka halaman tonton →</Link></div></section><section className="block"><div className="section-heading"><div><span className="eyebrow">EPISODE</span><h2>Daftar episode</h2></div><span className="muted">● menandai episode dengan sumber video</span></div><EpisodePicker animeId={animeId} count={anime.episodes} available={episodes} /></section><section className="block"><div className="section-heading"><div><span className="eyebrow">MEDIA PRIBADI</span><h2>Tambahkan video</h2><p>Gunakan hanya URL video dan subtitle yang kamu miliki atau diizinkan untuk diputar.</p></div></div><MediaForm animeId={animeId} onAdded={refreshEpisodes} /></section>{recommendations.length > 0 && <section className="block"><div className="section-heading"><div><span className="eyebrow">JELAJAHI LAGI</span><h2>Rekomendasi</h2></div></div><Grid items={recommendations} /></section>}</main>;
}

function Watch() {
  const { animeId, episodeNumber } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null), [episodes, setEpisodes] = useState([]), [sources, setSources] = useState([]), [sourceId, setSourceId] = useState(''), [error, setError] = useState('');
  const number = Number(episodeNumber);
  const refresh = () => Promise.all([userMediaProvider.getEpisodes(animeId), userMediaProvider.getStreamingSources(number, animeId)]).then(([list, media]) => { setEpisodes(list); setSources(media); setSourceId(current => media.some(item => item.id === current) ? current : media[0]?.id || ''); });
  useEffect(() => { let active = true; setAnime(null); setError(''); getAnime(animeId).then(data => { if (active) setAnime(data); }).catch(err => { if (active) setError(err.message); }); refresh(); const listener = () => refresh(); window.addEventListener('anidep-sources', listener); return () => { active = false; window.removeEventListener('anidep-sources', listener); }; }, [animeId, number]);
  if (!Number.isInteger(number) || number < 1) return <main className="container page"><Notice>Nomor episode tidak valid.</Notice></main>;
  const source = sources.find(item => item.id === sourceId);
  const history = getHistory()[animeId + ':' + number];
  const total = Math.max(anime?.episodes || 0, ...episodes.map(item => item.number), number);
  return <main className="container page"><Link className="back" to={`/anime/${animeId}`}>← Detail anime</Link><div className="watch-layout"><div><VideoPlayer key={animeId + ':' + number + ':' + sourceId} source={source} resumeAt={history?.position || 0} onProgress={(position, duration, completed) => saveProgress({ animeId, episode: number, position, duration, completed, title: titleOf(anime), cover: anime?.coverImage?.large })} /><div className="watch-title"><span className="eyebrow">SEDANG DITONTON</span><h1>{anime ? titleOf(anime) : 'Memuat anime…'}</h1><p>Episode {number} {anime?.duration ? '· ' + anime.duration + ' menit' : ''}</p></div>{error && <Notice>{error}</Notice>}<div className="watch-nav"><button disabled={number <= 1} onClick={() => navigate(`/watch/${animeId}/${number - 1}`)}>← Episode sebelumnya</button><button disabled={number >= total} onClick={() => navigate(`/watch/${animeId}/${number + 1}`)}>Episode berikutnya →</button></div><section className="block"><h2>Tentang anime</h2><p className="muted">{synopsisOf(anime) || 'Sinopsis belum tersedia.'}</p></section></div><aside><div className="side-panel"><span className="eyebrow">SUMBER VIDEO</span><h2>Pilih sumber</h2>{sources.length ? <><select aria-label="Sumber streaming" value={sourceId} onChange={event => setSourceId(event.target.value)}>{sources.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button className="text-button danger" onClick={() => { removeMedia(animeId, number, sourceId); refresh(); }}>Hapus sumber ini</button></> : <p className="muted">Belum ada sumber video untuk episode ini.</p>}<MediaForm animeId={animeId} initialEpisode={number} onAdded={refresh} /></div><div className="side-panel"><span className="eyebrow">PILIH EPISODE</span><h2>Daftar episode</h2><EpisodePicker animeId={animeId} current={number} count={anime?.episodes} available={episodes} /></div></aside></div></main>;
}

function History() {
  const [items, setItems] = useState([]);
  const refresh = () => setItems(Object.values(getHistory()).sort((a, b) => b.watchedAt - a.watchedAt));
  useEffect(() => { refresh(); window.addEventListener('anidep-history', refresh); return () => window.removeEventListener('anidep-history', refresh); }, []);
  return <main className="container page"><span className="eyebrow">JEJAK TONTONANMU</span><h1 className="page-title">Riwayat menonton</h1>{items.length ? <div className="history-list">{items.map(item => <div className="history-item" key={item.animeId + ':' + item.episode}><img src={item.cover} alt="" /><div><Link to={`/watch/${item.animeId}/${item.episode}`}><h3>{item.title}</h3></Link><p>Episode {item.episode} · {item.completed ? 'Selesai' : 'Lanjutkan dari ' + Math.floor(item.position / 60) + ' menit'}</p><progress value={item.position} max={item.duration || 1} /></div><button onClick={() => removeHistory(item.animeId, item.episode)} aria-label={`Hapus riwayat ${item.title} episode ${item.episode}`}>Hapus</button></div>)}</div> : <Notice>Belum ada riwayat menonton. Mulai dari katalog anime.</Notice>}</main>;
}
export default function App() { return <Shell><Routes><Route path="/" element={<Home />} /><Route path="/anime/:animeId" element={<Detail />} /><Route path="/watch/:animeId/:episodeNumber" element={<Watch />} /><Route path="/history" element={<History />} /><Route path="*" element={<main className="container page"><Notice>Halaman tidak ditemukan.</Notice></main>} /></Routes></Shell>; }
