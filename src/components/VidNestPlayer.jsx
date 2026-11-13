import { useState } from 'react';
import { vidNestProvider } from '../services/embedProviders.js';

function Frame({ src }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  return <div className="embed-player">
    {loading && <div className="embed-status" role="status">Memuat halaman VidNest…</div>}
    {error && <div className="embed-status" role="alert">Halaman VidNest gagal dimuat. Coba sumber pribadi atau tautan menonton resmi.</div>}
    <iframe src={src} title="Pemutar anime VidNest" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError(true); }} />
  </div>;
}

export default function VidNestPlayer({ anilistId, episode = 1, tmdbId }) {
  const src = tmdbId ? vidNestProvider.buildMovieUrl(tmdbId) : vidNestProvider.buildUrl(anilistId, episode);
  if (!src) return <div className="player-empty">ID anime atau nomor episode tidak valid.</div>;
  return <><Frame key={src} src={src} /><p className="embed-note">Halaman embed dapat terbuka meski video tidak tersedia. Jika kosong, pilih sumber pribadi atau tautan resmi. <a href={src} target="_blank" rel="noreferrer">Buka di VidNest</a></p></>;
}
