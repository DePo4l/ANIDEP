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

Untuk pencocokan film, buka `.env` di folder proyek dan isi `TMDB_API_READ_ACCESS_TOKEN=` dengan **API Read Access Token** milikmu. Jangan pakai API Key pada variabel ini. Simpan file, hentikan `npm run dev` yang sedang berjalan dengan `Ctrl+C`, lalu jalankan `npm run dev` lagi. `.env` diabaikan Git; token hanya dibaca server Express dan tidak boleh memakai awalan `VITE_`.

```powershell
npm test
npm run build
npm run preview
```

## VidNest dan izin konten

[Dokumentasi VidNest](https://vidnest.fun/) menawarkan iframe anime dengan format `https://vidnest.fun/anime/[ANILIST_ID]/[EPISODE]/[SUB_OR_DUB]`. ANIDEP menggunakan format `sub` secara bawaan. Akses gratis dan respons HTTP 200 **tidak membuktikan episode tersedia, dapat diputar, atau berlisensi**. VidNest mengumpulkan konten dari beberapa sumber tanpa pernyataan hak atas setiap episode; gunakan hanya konten yang boleh kamu tonton.

VidNest hanya aktif untuk judul yang kamu izinkan di `.env`: set `VITE_VIDNEST_EMBED_AUTHORIZED=true` dan isi `VITE_VIDNEST_ALLOWED_ANILIST_IDS` dengan AniList ID yang kontennya boleh kamu embed. Jika video pribadi tersedia, ANIDEP memilihnya tanpa menghubungi VidNest. Pemeriksaan otomatis memakai `HEAD` untuk melihat apakah halaman embed terjangkau; pemeriksaan ini **tidak** mendeteksi apakah video dapat diputar. Untuk anime episodik yang diizinkan, tombol VidNest dapat membuka iframe secara manual saat `HEAD` diblokir, tanpa mengklaim video tersedia. Bila halaman gagal, tautan menonton resmi AniList dan video demo publik tetap tersedia. Tidak ada proxy atau ekstraksi URL video. Pilihan Sub/Dub ditunda.

Di halaman tonton, panel kanan menampilkan daftar nomor episode dari AniList, pencarian, dan rentang 50 episode untuk seri panjang. Nomor ini **bukan daftar episode yang sudah terbukti dapat diputar**; sumber video pribadi yang tersimpan diberi tanda. Film menampilkan informasi dan pilihan menonton resmi tanpa daftar episode buatan. Pengaturan VidNest, demo, dan URL pribadi tetap ada di bagian **Pengaturan pemutar & sumber video** di bawah pemutar.

Film tidak memakai URL `/anime/.../1/...`: dokumentasi VidNest menggunakan TMDB ID untuk film, sedangkan ANIDEP memakai AniList ID. API lokal mencari judul film AniList di TMDB, mencocokkan judul dan tahun, lalu memeriksa halaman `/movie/[TMDB_ID]` sebelum menampilkan iframe. Film yang tidak cocok, token TMDB yang kosong/salah, atau halaman VidNest yang gagal akan menampilkan pesan yang jelas dan tautan streaming resmi AniList bila tersedia. Respons halaman HTTP 200 tidak membuktikan film dapat diputar atau berlisensi.

## Menggunakan video pribadi

1. Cari anime atau jelajahi katalog, lalu buka halaman detail.
2. Buka bagian **video pribadi (opsional)**, lalu isi nomor episode dan URL langsung ke file `.mp4` atau playlist `.m3u8` yang diizinkan. Subtitle `.vtt` opsional.
3. Bila sumber pribadi sudah tersimpan untuk episode itu, halaman tonton memilihnya otomatis. Pemutar menggunakan kontrol video bawaan browser, dengan pilihan kecepatan dan kualitas HLS yang muncul bila playlist menyediakannya.
4. Riwayat, posisi video pribadi, dan URL yang ditambahkan tersimpan di `localStorage` browser ini. Untuk iframe VidNest hanya episode, bahasa, dan waktu membuka halaman yang disimpan; waktu putar di dalam iframe tidak dapat dibaca oleh ANIDEP. Menghapus data situs/browser akan menghapus riwayat.

**Lanjutkan menonton** menampilkan satu kartu per AniList ID dan mengarah ke episode yang paling baru diputar lewat video pribadi atau dibuka lewat iframe, termasuk bila nomor episodenya lebih kecil dari episode sebelumnya. Memilih nomor episode tanpa membuka pemutar tetap tersimpan di riwayat, tetapi tidak mengganti kartu lanjutan. Episode video pribadi yang selesai tidak ditampilkan sebagai tontonan yang perlu dilanjutkan. Riwayat lengkap tersedia melalui **Lihat Semua Riwayat**. Indikator progres hanya muncul untuk video pribadi dengan durasi yang diketahui.

Sumber HLS harus mengizinkan akses CORS dari `http://127.0.0.1:5173` agar dapat diputar lewat hls.js. Aplikasi tidak memproksi video atau melewati pembatasan sumber. Browser dengan dukungan HLS asli dapat memutarnya langsung.

Tombol **Uji pemutar dengan video demo** memakai HLS [Mux test asset](https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8), bukan episode anime. Untuk menguji MP4, gunakan [MDN flower](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4) sebagai sumber pribadi dan hapus setelah selesai.

## Data dan penyedia

AniList GraphQL `https://graphql.anilist.co` dipakai langsung oleh browser untuk pencarian, trending, populer, musim ini, detail, dan rekomendasi. Pencarian ditunda 350 ms, daftar dimuat 24 judul per halaman, dan respons AniList disimpan di memori selama 5 menit. Katalog dapat ditelusuri dengan tombol **Muat lebih banyak**. Jumlah episode dan status mengikuti data AniList, sehingga dapat kosong atau berubah.

Antarmuka penyedia video pribadi ada di `src/services/providers.js`: `searchAnime(query)`, `getAnimeDetails(id)`, `getEpisodes(animeId)`, dan `getStreamingSources(episodeId, animeId)`. `src/services/embedProviders.js` menyimpan konfigurasi VidNest dan pembuat URL. `GET /api/providers` membedakan konfigurasi VidNest dari ketersediaan episode; `GET /api/providers/vidnest/check?anilistId=21&episode=1` hanya memeriksa keterjangkauan halaman embed. Adaptor `anihubProvider` masih berupa scaffold nonaktif. [README AniHub](https://github.com/manisbhusal/Anihub-Api) dan [kode rutenya](https://github.com/manisbhusal/Anihub-Api/blob/main/index.js) memuat rute `/map`, `/episodes`, dan `/watch`; layanan demo publik tidak memberikan respons episode yang dapat diverifikasi saat implementasi, dan izin penggunaan sumber videonya belum jelas. ANIDEP tidak mencoba mengambil video dari scraper tersebut.

API Express lokal menyediakan `GET /api/health`, `GET /api/providers`, `GET /api/tmdb/movies/search?q=...`, `GET /api/movies/:anilistId/tmdb`, dan pemeriksaan halaman VidNest untuk anime serta film. TMDB memakai Bearer Read Access Token di backend saja. Pencarian film meminta `query` dan `include_adult=false`; pencocokan menolak judul/tahun yang tidak meyakinkan. API dibatasi 120 permintaan per menit per IP. AniList pada katalog tetap dipanggil langsung oleh browser; pencocokan film mengambil metadata minimum di backend.

## Struktur

- `src/services/anilist.js`: kueri dan cache AniList.
- `src/services/providers.js`: antarmuka penyedia dan penyimpanan sumber pribadi.
- `src/components/VideoPlayer.jsx`: pemutar MP4/HLS, kualitas, subtitle, dan penyimpanan progres.
- `src/components/VidNestPlayer.jsx`: iframe VidNest bersyarat.
- `src/services/embedProviders.js`: konfigurasi penyedia embed dan validasi URL.
- `src/components/EpisodePicker.jsx`: pilihan episode.
- `src/components/EpisodeSidebar.jsx`: daftar episode, pencarian, rentang, dan navigasi halaman tonton.
- `src/components/ContinueWatching.jsx`: kartu lanjutan yang dikelompokkan per AniList ID.
- `src/lib/history.js`: penyimpanan riwayat tontonan.
- `src/App.jsx`: halaman katalog, detail, tonton, dan riwayat.
- `server/index.js`: API lokal.
- `server/vidnest.js`: pemeriksaan halaman embed tanpa menganggap video tersedia.
- `server/tmdb.js`: pencarian film TMDB dan pencocokan judul film AniList.

Gunakan hanya media yang memang boleh kamu putar. ANIDEP tidak menyediakan atau mengunduh episode anime.
