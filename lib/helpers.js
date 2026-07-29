// lib/helpers.js
const crypto = require('crypto');
const { db } = require('./firebaseAdmin');
const config = require('./config');

function newId() {
  return crypto.randomBytes(12).toString('hex');
}

// Sesi user biasa: token acak disimpan di collection `sessions`, dikirim balik sebagai cookie.
async function createSession(userId) {
  const token = newId();
  await db().collection('sessions').doc(token).set({
    userId,
    createdAt: Date.now(),
  });
  return token;
}

function setCookie(res, name, value, maxAgeSeconds) {
  res.setHeader(
    'Set-Cookie',
    `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`
  );
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return match ? match.split('=')[1] : null;
}

// Guard sederhana untuk endpoint /api/admin/*: cocokkan header x-admin-secret
// dengan env var ADMIN_SECRET (password admin, diset di Vercel).
function requireAdmin(req, res) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== config.ADMIN_SECRET) {
    res.status(401).json({ error: 'Akses admin ditolak. Secret salah atau belum login.' });
    return false;
  }
  return true;
}

async function getAutoMode() {
  const doc = await db().collection('settings').doc('auto').get();
  if (!doc.exists) return false;
  return !!doc.data().enabled;
}

// Dipakai semua endpoint yang butuh "siapa yang sedang login" (edit profil, follow, chat, dst).
// Balikin { userId, userData } kalau sesi valid, atau null kalau tidak.
async function getUserFromSession(req) {
  const token = getCookie(req, 'echonote_session');
  if (!token) return null;

  const sessionDoc = await db().collection('sessions').doc(token).get();
  if (!sessionDoc.exists) return null;

  const userId = sessionDoc.data().userId;
  const userDoc = await db().collection('users').doc(userId).get();
  if (!userDoc.exists) return null;

  return { userId, userData: userDoc.data() };
}

module.exports = {
  newId, createSession, setCookie, getCookie, requireAdmin, getAutoMode, getUserFromSession,
};
