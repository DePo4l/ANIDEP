import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { episodeNeighbors, episodeNumbers, episodeRanges, visibleEpisodeNumbers } from '../services/anilist.js';
import EpisodePicker from './EpisodePicker.jsx';

export default function EpisodeSidebar({ animeId, count, current, available }) {
  const navigate = useNavigate();
  const numbers = useMemo(() => episodeNumbers(count, available), [count, available]);
  const ranges = useMemo(() => episodeRanges(numbers), [numbers]);
  const currentRange = numbers.includes(Number(current)) ? Math.floor((Number(current) - 1) / 50) * 50 + 1 : ranges[0]?.start || 1;
  const [search, setSearch] = useState('');
  const [rangeStart, setRangeStart] = useState(currentRange);
  useEffect(() => {
    setRangeStart(currentRange);
    setSearch('');
  }, [current, currentRange]);
  const selectedRange = ranges.some(range => range.start === rangeStart) ? rangeStart : currentRange;
  const visible = visibleEpisodeNumbers(numbers, selectedRange, search);
  const { previous, next } = episodeNeighbors(numbers, current);
  return <section className="side-panel episode-sidebar" aria-label="Daftar episode">
    <span className="eyebrow">DAFTAR EPISODE</span><h2>Pilih episode yang ingin ditonton</h2>
    {numbers.length > 50 && <div className="episode-filters">
      <input type="search" inputMode="numeric" aria-label="Cari nomor episode" placeholder="Cari nomor episode..." value={search} onChange={event => setSearch(event.target.value)} />
      {ranges.length > 1 && <select aria-label="Rentang episode" value={selectedRange} onChange={event => { setRangeStart(Number(event.target.value)); setSearch(''); }}>{ranges.map(({ start, end }) => <option key={start} value={start}>Episode {start}–{end}</option>)}</select>}
    </div>}
    <p className="episode-disclaimer">Nomor dari AniList belum memastikan video tersedia di VidNest. ● berarti video pribadi tersimpan.</p>
    <div className="episode-scroll">{visible.length ? <EpisodePicker animeId={animeId} count={count} current={current} available={available} numbers={visible} compact /> : <p className="muted">{numbers.length ? 'Episode tidak ditemukan.' : 'Nomor episode belum tersedia.'}</p>}</div>
    <div className="episode-nav"><button disabled={!previous} onClick={() => navigate(`/watch/${animeId}/${previous}`)}>← Sebelumnya</button><button disabled={!next} onClick={() => navigate(`/watch/${animeId}/${next}`)}>Berikutnya →</button></div>
  </section>;
}
