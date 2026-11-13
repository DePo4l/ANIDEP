import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { episodeNeighbors, episodeNumbers, episodeRanges, visibleEpisodeNumbers } from '../services/anilist.js';
import EpisodePicker from './EpisodePicker.jsx';

export default function EpisodeSidebar({ animeId, count, current, available }) {
  const navigate = useNavigate();
  const numbers = episodeNumbers(count, available);
  const ranges = episodeRanges(numbers);
  const [search, setSearch] = useState('');
  const [rangeStart, setRangeStart] = useState(Math.floor((Number(current) - 1) / 50) * 50 + 1);
  useEffect(() => {
    setRangeStart(Math.floor((Number(current) - 1) / 50) * 50 + 1);
    setSearch('');
  }, [current]);
  const visible = visibleEpisodeNumbers(numbers, rangeStart, search);
  const { previous, next } = episodeNeighbors(numbers, current);
  return <section className="side-panel episode-sidebar" aria-label="Daftar episode">
    <span className="eyebrow">DAFTAR EPISODE</span><h2>Pilih episode yang ingin ditonton</h2>
    {numbers.length > 50 && <div className="episode-filters">
      <input type="search" inputMode="numeric" aria-label="Cari nomor episode" placeholder="Cari episode..." value={search} onChange={event => setSearch(event.target.value.replace(/\D/g, ''))} />
      {ranges.length > 1 && <select aria-label="Rentang episode" value={rangeStart} onChange={event => { setRangeStart(Number(event.target.value)); setSearch(''); }}>{ranges.map(({ start, end }) => <option key={start} value={start}>Episode {start}–{end}</option>)}</select>}
    </div>}
    <p className="episode-disclaimer">Nomor dari AniList belum memastikan video tersedia di VidNest. ● berarti video pribadi tersimpan.</p>
    <div className="episode-scroll">{visible.length ? <EpisodePicker animeId={animeId} count={count} current={current} available={available} numbers={visible} compact /> : <p className="muted">{numbers.length ? 'Episode tidak ditemukan.' : 'Nomor episode belum tersedia.'}</p>}</div>
    <div className="episode-nav"><button disabled={!previous} onClick={() => navigate(`/watch/${animeId}/${previous}`)}>← Sebelumnya</button><button disabled={!next} onClick={() => navigate(`/watch/${animeId}/${next}`)}>Berikutnya →</button></div>
  </section>;
}
