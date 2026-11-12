# ANIDEP

ANIDEP adalah aplikasi anime lokal dengan katalog AniList, pemutar MP4/HLS, dan riwayat menonton di browser. Katalog anime tidak menyediakan video. Tambahkan URL video yang kamu miliki atau boleh gunakan untuk setiap episode.

## Menjalankan

Butuh Node.js 20.19+ dan npm.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Buka `http://127.0.0.1:5173`. Vite menjalankan situs di port 5173 dan Express menjalankan API lokal di port 3001. `PORT` di `.env` mengubah port API; jika diubah, sesuaikan target proxy di `vite.config.js`.

```powershell
npm test
npm run build
npm run preview
```

## Menggunakan video

1. Cari anime atau jelajahi katalog, lalu buka halaman detail.
2. Isi nomor episode dan URL langsung ke file `.mp4` atau playlist `.m3u8` yang diizinkan. Subtitle `.vtt` opsional.
3. Buka halaman tonton. Pilih episode dan sumber yang tersimpan. Pemutar menggunakan kontrol video bawaan browser, dengan pilihan kecepatan dan kualitas HLS yang muncul bila playlist menyediakannya.
4. Riwayat, posisi putar, dan URL yang ditambahkan tersimpan di `localStorage` browser ini. Menghapus data situs/browser akan menghapusnya.

Sumber HLS harus mengizinkan akses CORS dari `http://127.0.0.1:5173` agar dapat diputar lewat hls.js. Aplikasi tidak memproksi video atau melewati pembatasan sumber. Browser dengan dukungan HLS asli dapat memutarnya langsung.

Untuk menguji pemutar dengan media publik: HLS [Mux test asset](https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8), MP4 [MDN flower](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4). Tambahkan masing-masing pada nomor episode pilihanmu; hapus sumber dari halaman tonton sesudahnya.

## Data dan penyedia

AniList GraphQL `https://graphql.anilist.co` dipakai langsung oleh browser untuk pencarian, trending, populer, musim ini, detail, dan rekomendasi. Pencarian ditunda 350 ms, daftar dimuat 24 judul per halaman, dan respons AniList disimpan di memori selama 5 menit. Katalog dapat ditelusuri dengan tombol **Muat lebih banyak**. Jumlah episode dan status mengikuti data AniList, sehingga dapat kosong atau berubah.

Antarmuka penyedia ada di `src/services/providers.js`: `searchAnime(query)`, `getAnimeDetails(id)`, `getEpisodes(animeId)`, dan `getStreamingSources(episodeId, animeId)`. Saat ini `userMediaProvider` aktif dan mengembalikan sumber yang ditambahkan pengguna. Adaptor `anihubProvider` tersedia tetapi dinonaktifkan. [README AniHub](https://github.com/manisbhusal/Anihub-Api) dan [kode rutenya](https://github.com/manisbhusal/Anihub-Api/blob/main/index.js) memuat rute `/map`, `/episodes`, dan `/watch`; layanan demo publik tidak memberikan respons episode yang dapat diverifikasi saat implementasi, dan izin penggunaan sumber videonya belum jelas. Karena itu ANIDEP tidak mengklaim episode atau streaming AniHub berfungsi dan tidak mencoba mengambil video dari scraper tersebut. `GET /api/providers` melaporkan status ini.

API Express lokal saat ini menyediakan `GET /api/health` dan `GET /api/providers`, dengan batas 120 permintaan per menit per IP serta respons JSON untuk kesalahan API. Pemutar dan AniList tidak membutuhkan server proxy.

## Struktur

- `src/services/anilist.js`: kueri dan cache AniList.
- `src/services/providers.js`: antarmuka penyedia dan penyimpanan sumber pribadi.
- `src/components/VideoPlayer.jsx`: pemutar MP4/HLS, kualitas, subtitle, dan penyimpanan progres.
- `src/components/EpisodePicker.jsx`: pilihan episode.
- `src/lib/history.js`: penyimpanan riwayat tontonan.
- `src/App.jsx`: halaman katalog, detail, tonton, dan riwayat.
- `server/index.js`: API lokal.

Gunakan hanya media yang memang boleh kamu putar. ANIDEP tidak menyediakan atau mengunduh episode anime.
