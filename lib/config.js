// lib/config.js
// ============================================================================
// SUDAH TERISI OTOMATIS dari file service account JSON yang lu upload.
// Gak ada Environment Variables di Vercel sama sekali -- semua value diambil
// langsung dari sini pas server jalan.
//
// PENTING: file ini isinya kunci rahasia asli (FIREBASE_PRIVATE_KEY = akses
// PENUH ke seluruh database). Pastikan repo GitHub tempat kode ini di-push
// statusnya PRIVATE, bukan public. Kalau bocor, siapapun bisa hapus/ambil
// semua data user (termasuk password/email/no.telp yang kesimpen plaintext).
// ============================================================================

module.exports = {
  FIREBASE_PROJECT_ID: 'echonoteein',
  FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk-fbsvc@echonoteein.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDecJw8AfYNCc8a
AKrVPWCbOdowXeP5ou44qUKPWHgVYjLXidNiraZwaqER6uMFl4hUFWp/yPtedn5r
3DhjPvNoPrW1OKSRrTekc8vu0EAoy6wPAiHKfR2Wvzxd9yIC412NL6jYf0bp8nrF
wimiSpfnwzeR8TN60Trc3q1ktADjE1+4XqP77VEzsG2sKYSEu9LDg2WPd/d0ztZi
H74DoNK8bktCMxTPVcMwUxSQvslIVaCOgfmXmy7np71E5bnOILrXyt++cngzBR6q
sui1yDuM+kWbIbV/cM4YciQIUls3f5Cw92AeFHgBjMuepfpu5RaFulcueyVnHVet
RrC89ovvAgMBAAECggEAV2zvGu6yZEF8sn2cpx7uf1Pnm6brWUxeUMrFrE1bNRxZ
WzmCaYBSsFBYahBllecO3+1i5EJ7+Y6c9YuiZe9x/4DWLhnLJK5t9ibE+mHDNcWH
JIbz/P/bx0n2UgA1z+jI9hrLQ/wSRRTWiC9d6bljpuWlS6j/UMA3YGPsxm2xA434
M4S14IyWDMjifD3tMKCKf+rJYPRpUPfkKA+IQsCz81zSIoK4OB2F02VzmiqRjG7O
OV7NLKdA4PjLBjEL6vJ6RbWxtMIPsYaw0oxrNcd5hXQNbrjRI7xjCVPmHJl9fw+g
0Gr3kGedNxp3yb/j/tlb0piuHDGmNGzmZDqHjT6SQQKBgQDxRZ9SlnODJNoH2qY4
kQqyc0XhnpCn7+rXBPJJuVVUIPeKzg55yjiYny29yrVFKBlpyeQVITvCbBXJWiv4
nWqkXuAJSAcL+rdmmCu9y2yuPUzCVL7JPmRiZBZ/sPn76WTiLFtTN/ssdxbYpdCO
7utKou76rE1h99ud7fMn1z+tkQKBgQDsBLKK9+1itPFl/HGcjIgCPAg7NmWRk925
mFXmwsgZNmFKDRcpRg5CRX/9Tz+lF6ohBT9j5rwn9p0u+4Vvu6tw+M7vkCm+W2xJ
cVmw07Xmv/0nBECJVsyMFmdLrvLRb2hNy2UW+50+l/XpEikbIOix/HiLoQLI4Vdx
gIE8IiPhfwKBgFB/tDqv6/ZzkzNPpmn1KqaDg2tVploB2E7JXbVvWqLpJO5w9a94
4w04/t/2BCkAygnbzHeoUPH7cgFuToFytCQHa6RtHbzHd+2JE/8NIkO4PCYSdF1c
rc2OK1uLRrzgEELOHeJUKT+atEqweDdYS7TpS+bjGiZ3thSpUZmXXa2hAoGAQRUq
htfHRijPSGhMi/bUqokTXACsEXDM+5jeVzvvIcS1H05szJzc4bl4icmIq2XTLDfe
OxYtXHfM8F+7dAw0QnrZ1YXTfQKI4de3++LljjPzAwdRJI4i6Z5j7aLYopguEwW7
YpMP0WrmDNdNLoXspOgR9a74rZw2GL5u5L4lVtECgYEAyOtm0YltW7wev79cW8Cj
CKCek7H4qmznTxretE4rnDt76/w98TjxdtYeZsaOl4ASiqLfogDkSMYKjRTuL7Ak
McSJnkI7+p9kudrj0nRdBoOHnv/Yx7xw/2/4pXvcIdjyS6YrHZCIMUsPxnTRGDfh
J5UVWna30XuM7uHdwyJxBcU=
-----END PRIVATE KEY-----
`,

  // Kalau ternyata URL Realtime Database lu beda dari ini, cek di Firebase
  // Console > Realtime Database (URL di bagian atas halaman) dan ganti baris
  // di bawah ini.
  FIREBASE_DATABASE_URL: 'https://echonoteein-default-rtdb.asia-southeast1.firebasedatabase.app',

  FIREBASE_STORAGE_BUCKET: 'echonoteein.firebasestorage.app',

  // Password buat masuk panel Admin. Sudah digenerate otomatis biar kuat,
  // boleh diganti kapan aja kalau mau pakai password sendiri yang gampang diinget.
  ADMIN_SECRET: 'GCmXpnOIAf8PQVgTzW0Ns0Bh',
};
