import { Link } from 'react-router-dom';

export default function ContinueWatching({ items, compact = false }) {
  if (!items.length) return null;
  return <section className={compact ? 'block' : 'continue'}>
    <div className="section-heading"><div>{!compact && <span className="eyebrow">KEMBALI MENONTON</span>}<h2>Lanjutkan menonton</h2></div><Link to="/history">Lihat Semua Riwayat →</Link></div>
    <div className="continue-grid">{items.map(item => <Link to={item.format === 'MOVIE' ? `/watch/${item.animeId}` : `/watch/${item.animeId}/${item.episode}`} className="continue-card" key={item.animeId}>
      <img src={item.cover} alt="" /><div><b>{item.title || `Anime ${item.animeId}`}</b><span>{item.format === 'MOVIE' ? 'Film' : `${item.watchMode === 'embed' ? 'Buka kembali' : 'Lanjut'} Episode ${item.episode}`}</span>{item.watchMode === 'manual' && Number(item.duration) > 0 && <progress aria-label="Progres tontonan" value={Number(item.position) || 0} max={Number(item.duration)} />}</div>
    </Link>)}</div>
  </section>;
}
