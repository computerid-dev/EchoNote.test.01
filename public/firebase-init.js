// firebase-init.js — inisialisasi Firebase client SDK (dipakai bareng di semua halaman:
// auth/admin, chat, dan nanti feed). Cukup edit config di SATU tempat ini.
//
// Catatan: apiKey di config Firebase Web SDK memang didesain untuk publik/terlihat di browser —
// keamanan sebenarnya dijaga oleh Firestore/Realtime Database Security Rules, bukan dengan
// menyembunyikan key ini.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDey4n66dITqo44IQPdAP3rLQxEHEa078A",
  authDomain: "echonoteein.firebaseapp.com",
  projectId: "echonoteein",
  storageBucket: "echonoteein.firebasestorage.app",
  messagingSenderId: "381809531179",
  appId: "1:381809531179:web:c161ef3ca523ba9fca0d6e",
  measurementId: "G-W31WE875Q1",

  // >>> TODO ISI INI: paste URL Realtime Database kamu di sini <<<
  // Buka Firebase Console > Realtime Database, copy URL yang tampil di bagian atas halaman.
  // Contoh bentuknya: "https://echonoteein-default-rtdb.asia-southeast1.firebasedatabase.app"
  databaseURL: "https://echonoteein-default-rtdb.asia-southeast1.firebasedatabase.app",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

// getAnalytics() bisa gagal di lingkungan yang tidak mendukung (mis. beberapa in-app browser),
// jadi dicek dulu pakai isSupported() supaya tidak melempar error dan mematikan halaman.
export let analytics = null;
isSupported().then((ok) => {
  if (ok) analytics = getAnalytics(app);
});

// Jembatan sesi login kita (cookie) ke Firebase Auth, supaya Realtime Database Security Rules
// bisa membatasi akses per-user lewat auth.uid. Dipanggil sekali sebelum baca/tulis RTDB.
// Aman dipanggil berkali-kali - kalau sudah login, langsung selesai tanpa request baru.
let signInPromise = null;
export function ensureFirebaseSignedIn() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (signInPromise) return signInPromise;

  signInPromise = fetch('/api/firebase-token')
    .then((res) => {
      if (!res.ok) throw new Error('Gagal ambil token Firebase (belum login?)');
      return res.json();
    })
    .then((data) => signInWithCustomToken(auth, data.token))
    .then((cred) => cred.user)
    .catch((err) => {
      signInPromise = null;
      throw err;
    });

  return signInPromise;
}
