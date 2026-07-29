// api/feed.js
// Gabungan dari feed/list.js, feed/create.js, feed/like.js, feed/comment.js,
// feed/comments.js. URL lama (/api/feed/list dst) tetap jalan lewat rewrites.
const { db } = require('../lib/firebaseAdmin');
const { getUserFromSession, newId } = require('../lib/helpers');

async function handleList(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { before, limit } = req.query;
  const take = Math.min(Number(limit) || 10, 30);

  try {
    let query = db().collection('posts').orderBy('createdAt', 'desc');
    if (before) query = query.where('createdAt', '<', Number(before));
    query = query.limit(take);

    const snap = await query.get();
    const posts = snap.docs.map(d => d.data());

    const session = await getUserFromSession(req).catch(() => null);

    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authorDocs = await Promise.all(authorIds.map(id => db().collection('users').doc(id).get()));
    const authorMap = {};
    authorDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data();
        authorMap[doc.id] = { username: d.username, displayName: d.displayName || d.username, avatarUrl: d.avatarUrl || '' };
      }
    });

    let likedSet = new Set();
    if (session) {
      const likeChecks = await Promise.all(
        posts.map(p => db().collection('likes').doc(`${p.id}_${session.userId}`).get())
      );
      likeChecks.forEach((doc, i) => { if (doc.exists) likedSet.add(posts[i].id); });
    }

    const enriched = posts.map(p => ({
      ...p,
      author: authorMap[p.authorId] || null,
      likedByMe: likedSet.has(p.id),
    })).filter(p => p.author);

    return res.status(200).json({
      posts: enriched,
      nextBefore: posts.length === take ? posts[posts.length - 1].createdAt : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal memuat feed.' });
  }
}

async function handleCreate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });
  if (session.userData.banned) return res.status(403).json({ error: 'Akun ini diblokir.' });

  const { type, text, mediaUrl } = req.body || {};
  if (!['text', 'photo', 'video'].includes(type)) {
    return res.status(400).json({ error: 'Tipe post tidak valid.' });
  }
  if (type === 'text' && (!text || !text.trim())) {
    return res.status(400).json({ error: 'Teks tidak boleh kosong.' });
  }
  if (type !== 'text' && !mediaUrl) {
    return res.status(400).json({ error: 'Media belum selesai diunggah.' });
  }
  if (text && text.length > 1000) {
    return res.status(400).json({ error: 'Teks maksimal 1000 karakter.' });
  }

  try {
    const id = newId();
    const now = Date.now();
    await db().collection('posts').doc(id).set({
      id,
      authorId: session.userId,
      type,
      text: (text || '').trim(),
      mediaUrl: mediaUrl || '',
      createdAt: now,
      likeCount: 0,
      commentCount: 0,
      score: 0,
    });

    await db().collection('users').doc(session.userId).update({
      postCount: (session.userData.postCount || 0) + 1,
    });

    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal membuat post.' });
  }
}

async function handleLike(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { postId, action } = req.body || {};
  if (!postId || !['like', 'unlike'].includes(action)) {
    return res.status(400).json({ error: 'Parameter tidak valid.' });
  }

  try {
    const postRef = db().collection('posts').doc(postId);
    const likeRef = db().collection('likes').doc(`${postId}_${session.userId}`);

    const result = await db().runTransaction(async (tx) => {
      const [postDoc, likeDoc] = await Promise.all([tx.get(postRef), tx.get(likeRef)]);
      if (!postDoc.exists) throw new Error('NOT_FOUND');

      const alreadyLiked = likeDoc.exists;
      const currentCount = postDoc.data().likeCount || 0;
      const commentCount = postDoc.data().commentCount || 0;

      if (action === 'like' && !alreadyLiked) {
        tx.set(likeRef, { postId, userId: session.userId, createdAt: Date.now() });
        const newCount = currentCount + 1;
        tx.update(postRef, { likeCount: newCount, score: newCount + commentCount * 2 });
        return newCount;
      }
      if (action === 'unlike' && alreadyLiked) {
        tx.delete(likeRef);
        const newCount = Math.max(0, currentCount - 1);
        tx.update(postRef, { likeCount: newCount, score: newCount + commentCount * 2 });
        return newCount;
      }
      return currentCount;
    });

    return res.status(200).json({ ok: true, likeCount: result, likedByMe: action === 'like' });
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Post tidak ditemukan.' });
    console.error(err);
    return res.status(500).json({ error: 'Gagal memproses like.' });
  }
}

async function handleComment(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });
  if (session.userData.banned) return res.status(403).json({ error: 'Akun ini diblokir.' });

  const { postId, text } = req.body || {};
  if (!postId || !text || !text.trim()) {
    return res.status(400).json({ error: 'Komentar tidak boleh kosong.' });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: 'Komentar maksimal 500 karakter.' });
  }

  try {
    const postRef = db().collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return res.status(404).json({ error: 'Post tidak ditemukan.' });

    const id = newId();
    const now = Date.now();
    await postRef.collection('comments').doc(id).set({
      id,
      authorId: session.userId,
      text: text.trim(),
      createdAt: now,
    });
    await postRef.update({
      commentCount: (postDoc.data().commentCount || 0) + 1,
      score: (postDoc.data().likeCount || 0) + ((postDoc.data().commentCount || 0) + 1) * 2,
    });

    return res.status(200).json({
      ok: true,
      comment: {
        id,
        text: text.trim(),
        createdAt: now,
        author: {
          username: session.userData.username,
          displayName: session.userData.displayName || session.userData.username,
          avatarUrl: session.userData.avatarUrl || '',
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengirim komentar.' });
  }
}

async function handleComments(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { postId } = req.query;
  if (!postId) return res.status(400).json({ error: 'Parameter postId wajib diisi.' });

  try {
    const snap = await db().collection('posts').doc(postId).collection('comments')
      .orderBy('createdAt', 'asc').limit(100).get();
    const comments = snap.docs.map(d => d.data());

    const authorIds = [...new Set(comments.map(c => c.authorId))];
    const authorDocs = await Promise.all(authorIds.map(id => db().collection('users').doc(id).get()));
    const authorMap = {};
    authorDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data();
        authorMap[doc.id] = { username: d.username, displayName: d.displayName || d.username, avatarUrl: d.avatarUrl || '' };
      }
    });

    const enriched = comments.map(c => ({ ...c, author: authorMap[c.authorId] || null })).filter(c => c.author);
    return res.status(200).json({ comments: enriched });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal memuat komentar.' });
  }
}

module.exports = async (req, res) => {
  const { action } = req.query;
  switch (action) {
    case 'list': return handleList(req, res);
    case 'create': return handleCreate(req, res);
    case 'like': return handleLike(req, res);
    case 'comment': return handleComment(req, res);
    case 'comments': return handleComments(req, res);
    default: return res.status(404).json({ error: 'Route tidak ditemukan.' });
  }
};
