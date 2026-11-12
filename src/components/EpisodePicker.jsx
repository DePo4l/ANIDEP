import { Link } from 'react-router-dom';
import { episodeNumbers } from '../services/anilist.js';

export default function EpisodePicker({ animeId, count, current, available = [] }) {
  const known = new Set(available.map(episode => episode.number));
  const numbers = episodeNumbers(count, available);
  if (!numbers.length) return <p className="muted">Nomor episode belum tersedia di AniList maupun sumber pribadi.</p>;
  return <div className="episodes" aria-label="Daftar episode">{numbers.map(number => <Link className={'episode-chip' + (number === Number(current) ? ' active' : '') + (known.has(number) ? ' ready' : '')} key={number} to={`/watch/${animeId}/${number}`}>Episode {number}{known.has(number) ? ' ●' : ''}</Link>)}</div>;
}
