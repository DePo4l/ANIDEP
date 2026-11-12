import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function VideoPlayer({ source, resumeAt = 0, onProgress, onEnded }) {
  const video = useRef(null);
  const hls = useRef(null);
  const lastSave = useRef(0);
  const [levels, setLevels] = useState([]);
  const [quality, setQuality] = useState(-1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const element = video.current;
    if (!source) return;
    setError(''); setLoading(true); setLevels([]); setQuality(-1);
    element.pause();
    element.removeAttribute('src');
    element.load();
    if (source.type === 'hls') {
      if (Hls.isSupported()) {
        const instance = new Hls();
        hls.current = instance;
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(instance.levels.map((level, index) => ({ index, label: level.height ? level.height + 'p' : Math.round(level.bitrate / 1000) + ' kbps' })));
          setLoading(false);
        });
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) { setLoading(false); setError('Video HLS gagal dimuat: ' + data.details); }
        });
        instance.loadSource(source.url);
        instance.attachMedia(element);
      } else if (element.canPlayType('application/vnd.apple.mpegurl')) element.src = source.url;
      else { setError('Browser ini tidak mendukung HLS.'); setLoading(false); }
    } else element.src = source.url;
    return () => { hls.current?.destroy(); hls.current = null; element.pause(); element.removeAttribute('src'); element.load(); };
  }, [source?.url, source?.type]);

  function save(force = false, completed = false) {
    const element = video.current;
    if (!element || !Number.isFinite(element.duration)) return;
    if (!force && Date.now() - lastSave.current < 5000) return;
    lastSave.current = Date.now();
    onProgress?.(element.currentTime, element.duration, completed);
  }

  function setLevel(value) {
    const next = Number(value);
    setQuality(next);
    if (hls.current) hls.current.currentLevel = next;
  }

  if (!source) return <div className="player-empty">Tambahkan URL MP4 atau HLS yang boleh kamu gunakan untuk mulai menonton.</div>;
  return <div className="player-shell">
    <video ref={video} controls playsInline onLoadedMetadata={event => { if (resumeAt > 0 && resumeAt < event.currentTarget.duration - 5) event.currentTarget.currentTime = resumeAt; setLoading(false); }} onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)} onTimeUpdate={() => save()} onPause={() => save(true)} onEnded={() => { save(true, true); onEnded?.(); }} onError={() => { setLoading(false); setError('Video tidak dapat diputar. Periksa URL, format, dan izin CORS sumber.'); }}>
      {(source.subtitles || []).map(track => <track key={track.src} kind="subtitles" src={track.src} srcLang={track.lang || 'id'} label={track.label || 'Subtitle'} />)}
    </video>
    {loading && <div className="player-message">Memuat video…</div>}
    {error && <div className="player-error" role="alert">{error}</div>}
    <div className="player-tools"><button onClick={() => { video.current.currentTime = Math.max(0, video.current.currentTime - 10); }}>−10 detik</button><button onClick={() => { video.current.currentTime += 10; }}>+10 detik</button><label>Kecepatan <select onChange={event => { video.current.playbackRate = Number(event.target.value); }} defaultValue="1"><option value="0.75">0,75×</option><option value="1">1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label>{levels.length > 1 && <label>Kualitas <select value={quality} onChange={event => setLevel(event.target.value)}><option value={-1}>Otomatis</option>{levels.map(level => <option key={level.index} value={level.index}>{level.label}</option>)}</select></label>}</div>
  </div>;
}
