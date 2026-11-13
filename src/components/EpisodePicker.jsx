import { Link } from 'react-router-dom';
import { episodeNumbers } from '../services/anilist.js';

export default function EpisodePicker({ animeId, count, current, available = [], numbers = episodeNumbers(count, available), compact = false }) {
  const known = new Set(available.map(episode => Number(episode.number)));
  if (!numbers.length) return <p className="muted">Nomor episode belum tersedia di AniList maupun sumber pribadi.</p>;
  return <div className="episodes" aria-label="Daftar episode">{numbers.map(number => <Link className={'episode-chip' + (number === Number(current) ? ' active' : '') + (known.has(number) ? ' ready' : '')} key={number} to={`/watch/${animeId}/${number}`} aria-current={number === Number(current) ? 'page' : undefined} aria-label={`Episode ${number}${known.has(number) ? ', video pribadi tersimpan' : ''}`} title={known.has(number) ? `Episode ${number}: video pribadi tersimpan` : `Episode ${number}: nomor dari AniList, pemutaran belum dipastikan`}>{compact ? number : `Episode ${number}`}{known.has(number) ? ' ●' : ''}</Link>)}</div>;
}
