// api/auth.js
// Gabungan dari register.js, login.js, logout.js, me.js, status.js.
// Dipecah jadi banyak file kayak sebelumnya bikin jumlah Serverless Function
// kebablasan (limit Vercel Hobby = 12). Digabung jadi 1 file, tapi URL lama
// (/api/register, /api/login, dst) tetap jalan lewat rewrites di vercel.json
// yang nambahin ?action=xxx sebelum sampai ke sini.
const { db } = require('../lib/firebaseAdmin');
const { newId, createSession, setCookie, getCookie, getAutoMode, getUserFromSession } = require('../lib/helpers');

async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, email, phone, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, dan password wajib diisi.' });
    }

    const usersRef = db().collection('users');
    const pendingRef = db().collection('pending_daftar');

    const [existingUser, existingPending] = await Promise.all([
      usersRef.where('username', '==', username).limit(1).get(),
      pendingRef.where('username', '==', username).where('status', '==', 'pending').limit(1).get(),
    ]);

    if (!existingUser.empty) {
      return res.status(409).json({ error: 'Username sudah terdaftar.' });
    }
    if (!existingPending.empty) {
      return res.status(409).json({ error: 'Username ini masih menunggu review admin.' });
    }

    const autoMode = await getAutoMode();
    const id = newId();
    const baseData = {
      id,
      username,
      email,
      phone: phone || '',
      password, // NOTE: disimpan apa adanya (plaintext) atas permintaan eksplisit pemilik produk,
                // supaya admin & sistem auto bisa mencocokkan data secara langsung.
      createdAt: Date.now(),
    };

    if (autoMode) {
      await usersRef.doc(id).set({ ...baseData, profileComplete: false, banned: false });
      const token = await createSession(id);
      setCookie(res, 'echonote_session', token, 60 * 60 * 24 * 30);
      return res.status(200).json({ status: 'accepted', redirect: '/set-up_account/' });
    }

    await pendingRef.doc(id).set({ ...baseData, status: 'pending', type: 'daftar' });
    return res.status(200).json({
      status: 'pending',
      pendingId: id,
      redirect: `/pending/?type=daftar&id=${id}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat mendaftar.' });
  }
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier dan password wajib diisi.' });
    }

    const usersRef = db().collection('users');
    const [byUsername, byEmail, byPhone] = await Promise.all([
      usersRef.where('username', '==', identifier).limit(1).get(),
      usersRef.where('email', '==', identifier).limit(1).get(),
      usersRef.where('phone', '==', identifier).limit(1).get(),
    ]);
    const match = [byUsername, byEmail, byPhone].find(snap => !snap.empty);
    const userDoc = match ? match.docs[0] : null;
    const userData = userDoc ? userDoc.data() : null;

    if (userData && userData.banned) {
      return res.status(403).json({ status: 'rejected', error: 'Akun ini diblokir.' });
    }

    const passwordMatches = !!userData && userData.password === password;
    const autoMode = await getAutoMode();

    if (autoMode) {
      if (passwordMatches) {
        const token = await createSession(userDoc.id);
        setCookie(res, 'echonote_session', token, 60 * 60 * 24 * 30);
        return res.status(200).json({ status: 'accepted', redirect: '/echonote-home/' });
      }
      return res.status(200).json({ status: 'rejected' });
    }

    const id = newId();
    await db().collection('pending_login').doc(id).set({
      id,
      identifier,
      passwordAttempt: password,
      matchedUserId: userDoc ? userDoc.id : null,
      matches: passwordMatches,
      status: 'pending',
      type: 'login',
      createdAt: Date.now(),
    });

    return res.status(200).json({
      status: 'pending',
      pendingId: id,
      redirect: `/pending/?type=login&id=${id}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getCookie(req, 'echonote_session');
  if (token) {
    await db().collection('sessions').doc(token).delete().catch(() => {});
  }
  res.setHeader('Set-Cookie', 'echonote_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return res.status(200).json({ ok: true });
}

async function handleMe(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { userData } = session;
  return res.status(200).json({
    username: userData.username,
    displayName: userData.displayName || '',
    bio: userData.bio || '',
    avatarUrl: userData.avatarUrl || '',
    followerCount: userData.followerCount || 0,
    followingCount: userData.followingCount || 0,
    postCount: userData.postCount || 0,
  });
}

async function handleStatus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, id } = req.query;
    if (!type || !id || !['daftar', 'login'].includes(type)) {
      return res.status(400).json({ error: 'Parameter type/id tidak valid.' });
    }

    const collection = type === 'daftar' ? 'pending_daftar' : 'pending_login';
    const doc = await db().collection(collection).doc(id).get();

    if (!doc.exists) {
      return res.status(200).json({ status: 'rejected' });
    }
    const data = doc.data();

    if (data.status === 'pending') return res.status(200).json({ status: 'pending' });
    if (data.status === 'rejected') return res.status(200).json({ status: 'rejected' });

    let userId = null;
    if (type === 'daftar') {
      userId = id;
    } else {
      userId = data.matchedUserId;
    }

    if (userId) {
      const token = await createSession(userId);
      setCookie(res, 'echonote_session', token, 60 * 60 * 24 * 30);
    }

    const redirect = type === 'daftar' ? '/set-up_account/' : '/echonote-home/';
    return res.status(200).json({ status: 'accepted', redirect });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat cek status.' });
  }
}

module.exports = async (req, res) => {
  const { action } = req.query;
  switch (action) {
    case 'register': return handleRegister(req, res);
    case 'login': return handleLogin(req, res);
    case 'logout': return handleLogout(req, res);
    case 'me': return handleMe(req, res);
    case 'status': return handleStatus(req, res);
    default: return res.status(404).json({ error: 'Route tidak ditemukan.' });
  }
};
