// api/account.js
// Gabungan dari profile.js, edit-profile.js, setup-profile.js, upload-avatar.js.
// URL lama tetap jalan lewat rewrites di vercel.json.
const { db, bucket } = require('../lib/firebaseAdmin');
const { getUserFromSession, getCookie } = require('../lib/helpers');

async function handleProfile(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Parameter username wajib diisi.' });

  try {
    const snap = await db().collection('users').where('username', '==', username).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const data = snap.docs[0].data();
    return res.status(200).json({
      id: snap.docs[0].id,
      username: data.username,
      displayName: data.displayName || data.username,
      bio: data.bio || '',
      avatarUrl: data.avatarUrl || '',
      followerCount: data.followerCount || 0,
      followingCount: data.followingCount || 0,
      postCount: data.postCount || 0,
      banned: !!data.banned,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengambil profil.' });
  }
}

async function handleEditProfile(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { displayName, bio } = req.body || {};
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: 'Nama tampilan wajib diisi.' });
  }
  if (displayName.length > 50) {
    return res.status(400).json({ error: 'Nama tampilan maksimal 50 karakter.' });
  }
  if (bio && bio.length > 160) {
    return res.status(400).json({ error: 'Bio maksimal 160 karakter.' });
  }

  try {
    await db().collection('users').doc(session.userId).update({
      displayName: displayName.trim(),
      bio: (bio || '').trim(),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menyimpan profil.' });
  }
}

async function handleSetupProfile(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = getCookie(req, 'echonote_session');
    if (!token) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk ulang.' });

    const sessionDoc = await db().collection('sessions').doc(token).get();
    if (!sessionDoc.exists) return res.status(401).json({ error: 'Sesi tidak valid.' });

    const { displayName, bio } = req.body || {};
    if (!displayName) return res.status(400).json({ error: 'Nama tampilan wajib diisi.' });

    const userId = sessionDoc.data().userId;
    await db().collection('users').doc(userId).update({
      displayName,
      bio: bio || '',
      profileComplete: true,
    });

    return res.status(200).json({ ok: true, redirect: '/echonote-home/' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menyimpan profil.' });
  }
}

const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

async function handleUploadAvatar(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  try {
    const { imageBase64 } = req.body || {};
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(imageBase64 || '');
    if (!match) {
      return res.status(400).json({ error: 'Format gambar tidak didukung. Pakai JPG, PNG, atau WEBP.' });
    }

    const mimeType = match[1];
    const ext = ALLOWED_TYPES[mimeType];
    const buffer = Buffer.from(match[2], 'base64');

    if (buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: 'Ukuran gambar maksimal 2MB.' });
    }

    const filePath = `avatars/${session.userId}.${ext}`;
    const file = bucket().file(filePath);

    await file.save(buffer, {
      metadata: { contentType: mimeType, cacheControl: 'public, max-age=3600' },
    });
    await file.makePublic();

    const avatarUrl = `https://storage.googleapis.com/${bucket().name}/${filePath}?v=${Date.now()}`;

    await db().collection('users').doc(session.userId).update({ avatarUrl });

    return res.status(200).json({ ok: true, avatarUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengunggah avatar.' });
  }
}

module.exports = async (req, res) => {
  const { action } = req.query;
  switch (action) {
    case 'profile': return handleProfile(req, res);
    case 'edit-profile': return handleEditProfile(req, res);
    case 'setup-profile': return handleSetupProfile(req, res);
    case 'upload-avatar': return handleUploadAvatar(req, res);
    default: return res.status(404).json({ error: 'Route tidak ditemukan.' });
  }
};
