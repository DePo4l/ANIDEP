# ANIDEP

ANIDEP adalah aplikasi anime lokal dengan katalog AniList, halaman tonton, pemutar MP4/HLS pribadi, dan riwayat di browser. Katalog AniList tidak menyediakan video.

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

## VidNest dan izin konten

[Dokumentasi VidNest](https://vidnest.fun/) menawarkan iframe anime dengan format `https://vidnest.fun/anime/[ANILIST_ID]/[EPISODE]/[SUB_OR_DUB]`. ANIDEP menggunakan format `sub` secara bawaan. Akses gratis dan respons HTTP 200 **tidak membuktikan episode tersedia, dapat diputar, atau berlisensi**. VidNest mengumpulkan konten dari beberapa sumber tanpa pernyataan hak atas setiap episode; gunakan hanya konten yang boleh kamu tonton.

VidNest aktif secara bawaan dan dapat dimatikan dengan `VITE_VIDNEST_ENABLED=false` di `.env`. Sebelum menampilkan iframe, API lokal mengirim permintaan `HEAD` ke halaman embed untuk memeriksa apakah halaman itu dapat diakses. Pemeriksaan ini **tidak** mendeteksi apakah video di dalam iframe bisa diputar. Bila halaman gagal, ANIDEP memakai sumber pribadi yang tersimpan jika ada, menampilkan tautan menonton resmi dari AniList, dan menyediakan video demo publik untuk menguji pemutar. Tidak ada proxy atau ekstraksi URL video. Pilihan Sub/Dub ditunda.

Film tidak memakai URL `/anime/.../1/...`: dokumentasi VidNest menggunakan TMDB ID untuk film, sedangkan ANIDEP memakai AniList ID. Halaman film menampilkan tautan streaming resmi dari AniList bila tersedia dan tetap mendukung video pribadi.

## Menggunakan video pribadi

1. Cari anime atau jelajahi katalog, lalu buka halaman detail.
2. Buka bagian **video pribadi (opsional)**, lalu isi nomor episode dan URL langsung ke file `.mp4` atau playlist `.m3u8` yang diizinkan. Subtitle `.vtt` opsional.
3. Bila sumber pribadi sudah tersimpan untuk episode itu, halaman tonton memilihnya otomatis. Pemutar menggunakan kontrol video bawaan browser, dengan pilihan kecepatan dan kualitas HLS yang muncul bila playlist menyediakannya.
4. Riwayat, posisi video pribadi, dan URL yang ditambahkan tersimpan di `localStorage` browser ini. Untuk iframe VidNest hanya episode, bahasa, dan waktu membuka halaman yang disimpan; waktu putar di dalam iframe tidak dapat dibaca oleh ANIDEP. Menghapus data situs/browser akan menghapus riwayat.

Sumber HLS harus mengizinkan akses CORS dari `http://127.0.0.1:5173` agar dapat diputar lewat hls.js. Aplikasi tidak memproksi video atau melewati pembatasan sumber. Browser dengan dukungan HLS asli dapat memutarnya langsung.

Tombol **Uji pemutar dengan video demo** memakai HLS [Mux test asset](https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8), bukan episode anime. Untuk menguji MP4, gunakan [MDN flower](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4) sebagai sumber pribadi dan hapus setelah selesai.

## Data dan penyedia

AniList GraphQL `https://graphql.anilist.co` dipakai langsung oleh browser untuk pencarian, trending, populer, musim ini, detail, dan rekomendasi. Pencarian ditunda 350 ms, daftar dimuat 24 judul per halaman, dan respons AniList disimpan di memori selama 5 menit. Katalog dapat ditelusuri dengan tombol **Muat lebih banyak**. Jumlah episode dan status mengikuti data AniList, sehingga dapat kosong atau berubah.

Antarmuka penyedia video pribadi ada di `src/services/providers.js`: `searchAnime(query)`, `getAnimeDetails(id)`, `getEpisodes(animeId)`, dan `getStreamingSources(episodeId, animeId)`. `src/services/embedProviders.js` menyimpan konfigurasi VidNest dan pembuat URL. `GET /api/providers` membedakan konfigurasi VidNest dari ketersediaan episode; `GET /api/providers/vidnest/check?anilistId=21&episode=1` hanya memeriksa keterjangkauan halaman embed. Adaptor `anihubProvider` masih berupa scaffold nonaktif. [README AniHub](https://github.com/manisbhusal/Anihub-Api) dan [kode rutenya](https://github.com/manisbhusal/Anihub-Api/blob/main/index.js) memuat rute `/map`, `/episodes`, dan `/watch`; layanan demo publik tidak memberikan respons episode yang dapat diverifikasi saat implementasi, dan izin penggunaan sumber videonya belum jelas. ANIDEP tidak mencoba mengambil video dari scraper tersebut.

API Express lokal saat ini menyediakan `GET /api/health` dan `GET /api/providers`, dengan batas 120 permintaan per menit per IP serta respons JSON untuk kesalahan API. Pemutar dan AniList tidak membutuhkan server proxy.

## Struktur

- `src/services/anilist.js`: kueri dan cache AniList.
- `src/services/providers.js`: antarmuka penyedia dan penyimpanan sumber pribadi.
- `src/components/VideoPlayer.jsx`: pemutar MP4/HLS, kualitas, subtitle, dan penyimpanan progres.
- `src/components/VidNestPlayer.jsx`: iframe VidNest bersyarat.
- `src/services/embedProviders.js`: konfigurasi penyedia embed dan validasi URL.
- `src/components/EpisodePicker.jsx`: pilihan episode.
- `src/lib/history.js`: penyimpanan riwayat tontonan.
- `src/App.jsx`: halaman katalog, detail, tonton, dan riwayat.
- `server/index.js`: API lokal.
- `server/vidnest.js`: pemeriksaan halaman embed tanpa menganggap video tersedia.

Gunakan hanya media yang memang boleh kamu putar. ANIDEP tidak menyediakan atau mengunduh episode anime.
