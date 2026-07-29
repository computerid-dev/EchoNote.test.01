// api/chat.js
// Gabungan dari chat/list.js, chat/id.js, chat/send.js. URL lama tetap jalan
// lewat rewrites di vercel.json. Tetap end-to-end: pesan lewat Realtime
// Database, panel Admin sama sekali tidak punya endpoint/akses ke sini.
const { db, rtdb } = require('../lib/firebaseAdmin');
const { getUserFromSession } = require('../lib/helpers');

async function handleList(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  try {
    const snap = await db().collection('chats')
      .where('participants', 'array-contains', session.userId)
      .get();

    const chats = snap.docs.map(d => ({ chatId: d.id, ...d.data() }));
    chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const enriched = await Promise.all(chats.map(async (chat) => {
      const otherId = chat.participants.find(id => id !== session.userId);
      const otherDoc = await db().collection('users').doc(otherId).get();
      const other = otherDoc.exists ? otherDoc.data() : null;
      return {
        chatId: chat.chatId,
        lastMessage: chat.lastMessage || '',
        lastMessageAt: chat.lastMessageAt || null,
        otherUser: other ? {
          username: other.username,
          displayName: other.displayName || other.username,
          avatarUrl: other.avatarUrl || '',
        } : null,
      };
    }));

    return res.status(200).json({ chats: enriched.filter(c => c.otherUser) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal memuat percakapan.' });
  }
}

async function handleId(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { with: withUsername } = req.query;
  if (!withUsername) return res.status(400).json({ error: 'Parameter with wajib diisi.' });

  try {
    const targetSnap = await db().collection('users').where('username', '==', withUsername).limit(1).get();
    if (targetSnap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const chatId = [session.userId, targetSnap.docs[0].id].sort().join('_');
    return res.status(200).json({ chatId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menghitung chatId.' });
  }
}

async function handleSend(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { targetUsername, text } = req.body || {};
  if (!targetUsername || !text || !text.trim()) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Pesan maksimal 2000 karakter.' });
  }
  if (targetUsername === session.userData.username) {
    return res.status(400).json({ error: 'Tidak bisa mengirim pesan ke diri sendiri.' });
  }

  try {
    const targetSnap = await db().collection('users').where('username', '==', targetUsername).limit(1).get();
    if (targetSnap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    const targetId = targetSnap.docs[0].id;

    const chatId = [session.userId, targetId].sort().join('_');
    const now = Date.now();

    await db().collection('chats').doc(chatId).set({
      participants: [session.userId, targetId],
      lastMessage: text.trim(),
      lastMessageAt: now,
      updatedAt: now,
    }, { merge: true });

    const msgRef = rtdb().ref(`chats/${chatId}/messages`).push();
    await msgRef.set({
      senderId: session.userId,
      text: text.trim(),
      createdAt: now,
    });

    return res.status(200).json({ ok: true, chatId, messageId: msgRef.key, createdAt: now });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengirim pesan.' });
  }
}

module.exports = async (req, res) => {
  const { action } = req.query;
  switch (action) {
    case 'list': return handleList(req, res);
    case 'id': return handleId(req, res);
    case 'send': return handleSend(req, res);
    default: return res.status(404).json({ error: 'Route tidak ditemukan.' });
  }
};
