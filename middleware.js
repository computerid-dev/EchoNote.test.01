// middleware.js — Vercel Edge Middleware, jalan SEBELUM request nyampe file statis atau /api.
//
// Tujuan: tool scraping/clone otomatis (curl, wget, HTTrack, python-requests, web2zip, dst)
// dapat 404 duluan. Browser asli tetap bisa akses normal — termasuk WebView dari tool
// web2pwa/web2apk (PWABuilder, Median, GoNative, Appilix, dst), karena tool-tool itu
// nge-render halamanmu pakai Chromium/WebView sungguhan dengan User-Agent mirip browser
// biasa, jadi otomatis lolos dari filter di bawah ini tanpa perlu di-whitelist manual.
//
// CATATAN JUJUR (baca ini): ini memperberat/menggagalkan scraping-tool siap-pakai yang jadi
// mayoritas kasus (HTTrack, wget --mirror, python script standar, layanan "web2zip", dst).
// Ini BUKAN tembok yang mustahil ditembus — orang yang niat banget & punya kemampuan bikin
// scraper custom pakai headless browser dengan User-Agent disamarkan persis Chrome tetap
// bisa nembus, karena dari sisi server itu memang persis tidak bisa dibedakan dari browser
// asli. Tidak ada sistem anti-scrape (di platform apa pun) yang benar-benar 100% kebal.
import { next } from '@vercel/edge';

const BLOCKED_UA_PATTERNS = [
  /curl/i, /wget/i, /python-requests/i, /python-urllib/i, /aiohttp/i,
  /scrapy/i, /httrack/i, /libwww-perl/i, /go-http-client/i,
  /node-fetch/i, /^axios/i, /okhttp/i, /^java\//i,
  /phantomjs/i, /teleport/i, /webcopier/i, /sitesucker/i,
  /webzip/i, /web2zip/i, /offline explorer/i, /webreaper/i, /larbin/i,
  /bot(?!.*google)/i, // kata "bot" di UA, tapi jangan blokir yang eksplisit sebut "google" (googlebot dsb)
];

const HONEYPOT_PATH = '/__trap';

export default function middleware(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const accept = request.headers.get('accept') || '';

  // Jebakan tersembunyi: link ke sini ada di setiap halaman tapi disembunyikan lewat CSS
  // (position:absolute;left:-9999px). Manusia/browser normal nggak pernah klik ke sini,
  // tapi tool clone yang nge-crawl SEMUA <a href> di HTML (kayak HTTrack/wget --mirror)
  // bakal ke-jebak dan langsung dapat 404.
  if (url.pathname === HONEYPOT_PATH) {
    return new Response('Not Found', { status: 404 });
  }

  // User-Agent kosong hampir pasti script mentah, bukan browser.
  if (ua.trim() === '') {
    return new Response('Not Found', { status: 404 });
  }

  // Cocok pola tool scraping/clone yang dikenal.
  if (BLOCKED_UA_PATTERNS.some((re) => re.test(ua))) {
    return new Response('Not Found', { status: 404 });
  }

  // Request ke halaman HTML (bukan aset/API) yang Accept header-nya nggak minta text/html
  // sama sekali biasanya berarti script mentah nembak URL langsung, bukan browser beneran.
  const isAsset = /\.(js|mjs|css|png|jpg|jpeg|webp|gif|svg|ico|json|woff2?|mp4|webm)$/i.test(url.pathname);
  const isApi = url.pathname.startsWith('/api/');
  if (!isAsset && !isApi && !accept.includes('text/html') && !accept.includes('*/*')) {
    return new Response('Not Found', { status: 404 });
  }

  return next();
}

export const config = {
  // Jalan untuk semua path KECUALI file internal Vercel sendiri.
  matcher: ['/((?!_vercel).*)'],
};
