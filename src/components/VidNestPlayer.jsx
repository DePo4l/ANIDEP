import { useState } from 'react';
import { vidNestProvider } from '../services/embedProviders.js';

function Frame({ src }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  return <div className="embed-player">
    {loading && <div className="embed-status" role="status">Memuat halaman VidNest…</div>}
    {error && <div className="embed-status" role="alert">Halaman VidNest gagal dimuat. Coba sumber pribadi jika tersedia.</div>}
    <iframe src={src} title="Pemutar anime VidNest" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError(true); }} />
  </div>;
}

export default function VidNestPlayer({ anilistId, episode = 1, language = 'sub' }) {
  const src = vidNestProvider.buildUrl(anilistId, episode, language);
  if (!src) return <div className="player-empty">ID anime atau nomor episode tidak valid.</div>;
  if (!vidNestProvider.isAllowed(anilistId)) return <div className="player-empty">{vidNestProvider.unavailableReason}</div>;
  return <><Frame key={src} src={src} /><p className="embed-note">Halaman embed dapat dimuat tanpa menjamin episode tersedia atau bisa diputar. ANIDEP tidak dapat membaca posisi video dari iframe ini.</p></>;
}
