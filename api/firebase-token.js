// api/firebase-token.js
// GET - butuh cookie sesi. Balikin Firebase custom token supaya client bisa signInWithCustomToken()
// dan dapat auth.uid = userId kita sendiri. Ini JEMBATAN antara sistem auth manual kita dengan
// Firebase Auth, khusus dipakai supaya Realtime Database Security Rules bisa membatasi akses
// per-user (tanpa ini, chat di RTDB bakal terbuka untuk siapa saja yang tahu URL-nya).
const { getUserFromSession } = require('../lib/helpers');
const { getAdmin } = require('../lib/firebaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  try {
    const token = await getAdmin().auth().createCustomToken(session.userId);
    return res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal membuat token Firebase.' });
  }
};
