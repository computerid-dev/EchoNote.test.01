// lib/firebaseAdmin.js
// Inisialisasi Firebase Admin SDK sekali saja (di-cache antar invocation serverless).
// Semua kredensial diambil dari lib/config.js — ISI FILE ITU SEBELUM DEPLOY.

const admin = require('firebase-admin');
const config = require('./config');

function getAdmin() {
  if (!admin.apps.length) {
    const privateKey = (config.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error(
        'lib/config.js belum diisi. Buka file itu, lengkapi FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      // Wajib diisi kalau mau pakai Realtime Database (chat real-time).
      databaseURL: config.FIREBASE_DATABASE_URL,
    });
  }
  return admin;
}

function db() {
  return getAdmin().firestore();
}

// Bucket Storage untuk avatar/media.
function bucket() {
  return getAdmin().storage().bucket(config.FIREBASE_STORAGE_BUCKET || 'echonoteein.firebasestorage.app');
}

// Realtime Database - dipakai untuk pesan chat supaya bisa real-time (push instan ke listener client).
function rtdb() {
  return getAdmin().database();
}

module.exports = { getAdmin, db, bucket, rtdb };
