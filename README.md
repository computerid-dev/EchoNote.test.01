# EchoNote — Aplikasi Utama (publik)

Yang dishare ke publik: user daftar, login, posting (foto/video/teks), like,
komentar, follow, dan chat end-to-end. Panel admin ada di project terpisah.

## Alur yang jalan out-of-the-box (gak perlu setting apa-apa buat ini)

```
User isi form daftar
   -> masuk status "pending" (nunggu)
   -> muncul di panel Admin, tab Antrean
   -> Admin klik Accept
   -> user resmi jadi member, lanjut lengkapi profil, bisa langsung
      posting/like/komen/follow/chat kayak sosmed pada umumnya
```

Ini **default** dari sistem (Mode Auto = OFF), gak perlu di-toggle apa-apa
di panel Admin. Kalau suatu saat mau pendaftaran langsung diterima otomatis
tanpa antrean, tinggal nyalain **Mode Auto** dari panel Admin — bisa
dibalik kapan aja, gak perlu ubah kode ataupun deploy ulang.

## Setup — ZERO environment variable di Vercel

Sama kayak project Admin, semua kredensial diisi di **satu file**:
`lib/config.js`. Gak ada setting apapun di dashboard Vercel.

1. Buka `lib/config.js`.
2. Isi `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
   `FIREBASE_DATABASE_URL` — **persis sama** dengan yang lu isi di project
   Admin (dari file JSON service account yang sama).
   > `ADMIN_SECRET` di file ini gak dipakai di project EchoNote, boleh
   > dibiarin, gak ngaruh.
3. Save, push ke repo GitHub sendiri (beda repo dari Admin). Repo ini juga
   sebaiknya **Private** karena tetap nyimpen `FIREBASE_PRIVATE_KEY`.
4. Import ke Vercel → langsung **Deploy**, gak ada Environment Variables yang
   perlu diisi.
5. Domain yang Vercel kasih (atau custom domain) itu yang lu share ke user.

## Struktur folder
```
EchoNote/
├── api/
│   ├── feed/        -> create, list, like, comment, comments
│   ├── chat/         -> list, id, send (end-to-end, admin tidak bisa akses)
│   ├── login.js, register.js, logout.js, me.js, status.js
│   ├── profile.js, edit-profile.js, setup-profile.js, upload-avatar.js
│   ├── follow.js, follow-status.js
│   └── firebase-token.js
├── lib/
│   ├── config.js          -> SATU-SATUNYA file yang perlu diisi
│   ├── firebaseAdmin.js
│   └── helpers.js
├── middleware.js     -> anti-scrape ringan
├── public/            -> home, login, daftar, akun, profil, chat, pending,
│                         set-up_account, ikon PWA, dll
├── package.json
└── vercel.json
```
