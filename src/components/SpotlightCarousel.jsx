import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { episodeCountOf, listSpotlightAnime, synopsisOf, titleOf } from '../services/anilist.js';

export default function SpotlightCarousel() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listSpotlightAnime().then(items => { if (active) { setSlides(items); setIndex(0); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % slides.length), 6000);
    return () => window.clearTimeout(timer);
  }, [index, paused, slides.length]);

  const anime = slides[index];
  const move = direction => setIndex(value => (value + direction + slides.length) % slides.length);
  const title = anime ? titleOf(anime) : 'CERITA BARU MENANTI';
  const titleSize = title.length > 40 ? 'spotlight-title-long' : title.length > 23 ? 'spotlight-title-medium' : '';
  const image = anime?.coverImage?.extraLarge || anime?.coverImage?.large;

  return <section className="spotlight" aria-label="Sorotan anime">
    {anime ? <>
      <div className="spotlight-copy" key={`copy-${anime.id}`}>
        <div className="spotlight-overline"><span className="spotlight-mark">✦</span> ANIDEP / {anime.spotlightCategory} <span className="spotlight-edition">EDISI {anime.seasonYear || new Date().getFullYear()}</span></div>
        <div className="spotlight-story" aria-live="polite">
          <span className="spotlight-index">{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')} — {anime.format || 'ANIME'}</span>
          <h1 className={titleSize}>{title}</h1>
          {anime.title?.native && <p className="spotlight-native" lang="ja">{anime.title.native}</p>}
          <p className="spotlight-synopsis">{synopsisOf(anime) || 'Temukan kisah anime ini di ANIDEP.'}</p>
          <div className="spotlight-meta"><span>★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '—'}</span><span>{anime.genres?.slice(0, 2).join(' / ') || 'ANIME'}</span></div>
          <div className="spotlight-actions">
            {(anime.format === 'MOVIE' || episodeCountOf(anime) > 0) && <Link className="spotlight-watch" to={anime.format === 'MOVIE' ? `/watch/${anime.id}` : `/watch/${anime.id}/1`}>Tonton sekarang <span aria-hidden="true">↗</span></Link>}
            <Link className="spotlight-details" to={`/anime/${anime.id}`}>Lihat detail <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="spotlight-bottom"><span>SCROLL TO EXPLORE ↓</span><span>アニメ / ANIME</span></div>
      </div>
      <div className="spotlight-art" key={`art-${anime.id}`}>
        {anime.bannerImage && <img className="spotlight-banner" src={anime.bannerImage} alt="" aria-hidden="true" />}
        {image && <img className="spotlight-poster" src={image} alt="" aria-hidden="true" />}
        <span className="spotlight-art-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className="spotlight-art-label">ANIDEP COLLECTION • {anime.season || 'ANIME'} {anime.seasonYear || ''}</span>
      </div>
      {slides.length > 1 && <div className="spotlight-controls" aria-label="Kontrol carousel">
        <button type="button" onClick={() => move(-1)} aria-label="Anime sebelumnya">←</button>
        <button type="button" onClick={() => move(1)} aria-label="Anime berikutnya">→</button>
        <span className="spotlight-control-divider" />
        <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Putar carousel' : 'Jeda carousel'} aria-pressed={paused}>{paused ? '▶' : 'Ⅱ'}</button>
        <span className="spotlight-control-count">{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
        <span className="spotlight-timer" aria-hidden="true"><span key={`${index}-${paused}`} className={paused ? 'paused' : ''} /></span>
      </div>}
      {slides.length > 1 && <div className="spotlight-pagination" aria-label="Pilih sorotan">{slides.map((slide, position) => <button type="button" key={slide.id} onClick={() => setIndex(position)} className={position === index ? 'active' : ''} aria-label={`Sorotan ${position + 1}: ${titleOf(slide)}`} aria-current={position === index ? 'true' : undefined}><span /></button>)}</div>}
    </> : <div className="spotlight-fallback"><span className="spotlight-overline">✦ ANIDEP / SOROTAN ANIME</span><h1>{loading ? 'MEMUAT CERITA' : 'CERITA BARU MENANTI'}</h1><p role="status">{error || (!loading && 'Belum ada anime untuk ditampilkan.')}</p>{error && <button type="button" onClick={() => setRetry(value => value + 1)}>Coba lagi ↗</button>}</div>}
  </section>;
}
