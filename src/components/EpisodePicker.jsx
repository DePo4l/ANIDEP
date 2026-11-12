import { Link } from 'react-router-dom';

export default function EpisodePicker({ animeId, count, current, available = [] }) {
  const known = new Set(available.map(episode => episode.number));
  const total = Math.max(count || 0, ...known, 1);
  return <div className="episodes" aria-label="Daftar episode">{Array.from({ length: total }, (_, index) => index + 1).map(number => <Link className={'episode-chip' + (number === Number(current) ? ' active' : '') + (known.has(number) ? ' ready' : '')} key={number} to={`/watch/${animeId}/${number}`}>Episode {number}{known.has(number) ? ' ●' : ''}</Link>)}</div>;
}
