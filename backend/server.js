// ===== server.js =====
// Node.js + Express backend untuk SiPinjam
// Database: Supabase (PostgreSQL)
//
// Install dependencies:
//   npm install express cors @supabase/supabase-js dotenv
//
// Buat file .env:
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
//   PORT=3000
//   ADMIN_PASSWORD=admin123

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const PORT = process.env.PORT || 3000;

// ===== SUPABASE CLIENT =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ===== MIDDLEWARE =====
app.use(cors({ origin: '*' }));
app.use(express.json());

// Sajikan file frontend statis dari folder ini
app.use(express.static('.'));

// ===== ADMIN PASSWORD CHECK =====
// Middleware sederhana — untuk produksi gunakan JWT
function requireAdmin(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================================
// ===== ROUTES: PEMETAAN RUANGAN =====
// ============================================================

// GET semua pemetaan
app.get('/api/pemetaan', async (req, res) => {
  const { data, error } = await supabase
    .from('pemetaan')
    .select('*')
    .order('kode');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST tambah/update pemetaan (upsert by kode)
app.post('/api/pemetaan', async (req, res) => {
  const { kode, nama, kapasitas, fasilitas, status } = req.body;
  if (!kode || !nama || !kapasitas || !fasilitas || !status)
    return res.status(400).json({ error: 'Semua field wajib diisi' });

  const { data, error } = await supabase
    .from('pemetaan')
    .upsert({ kode, nama, kapasitas, fasilitas, status }, { onConflict: 'kode' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ============================================================
// ===== ROUTES: JADWAL =====
// ============================================================

// GET semua jadwal
app.get('/api/jadwal', async (req, res) => {
  const { data, error } = await supabase
    .from('jadwal')
    .select('*')
    .order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST tambah jadwal baru
app.post('/api/jadwal', async (req, res) => {
  const { ruangan, hari, mulai, selesai, matkul, dosen } = req.body;
  if (!ruangan || !hari || !mulai || !selesai || !matkul || !dosen)
    return res.status(400).json({ error: 'Semua field wajib diisi' });

  const { data, error } = await supabase
    .from('jadwal')
    .insert({ ruangan, hari, mulai, selesai, matkul, dosen })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE hapus jadwal
app.delete('/api/jadwal/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('jadwal')
    .delete()
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ============================================================
// ===== ROUTES: PEMINJAMAN =====
// ============================================================

// GET semua peminjaman
app.get('/api/peminjaman', async (req, res) => {
  const { data, error } = await supabase
    .from('peminjaman')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST buat peminjaman baru
app.post('/api/peminjaman', async (req, res) => {
  const { nama, nim, ruangan, tanggal, mulai, selesai, alasan } = req.body;
  if (!nama || !nim || !ruangan || !tanggal || !mulai || !selesai || !alasan)
    return res.status(400).json({ error: 'Semua field wajib diisi' });

  // Validasi: cek konflik jadwal
  const { data: konflik } = await supabase
    .from('peminjaman')
    .select('id')
    .eq('ruangan', ruangan)
    .eq('tanggal', tanggal)
    .eq('status', 'approved')
    .or(`mulai.lt.${selesai},selesai.gt.${mulai}`);

  if (konflik && konflik.length > 0)
    return res.status(409).json({ error: 'Ruangan sudah dipesan pada waktu tersebut' });

  const { data, error } = await supabase
    .from('peminjaman')
    .insert({ nama, nim, ruangan, tanggal, mulai, selesai, alasan, status: 'pending' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH update status peminjaman (approve/reject)
app.patch('/api/peminjaman/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status harus approved atau rejected' });

  // Update status peminjaman
  const { data: pinjam, error: errUpdate } = await supabase
    .from('peminjaman')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (errUpdate) return res.status(500).json({ error: errUpdate.message });

  // Auto kirim pesan notifikasi
  const subject = status === 'approved'
    ? `✅ Peminjaman Kelas ${pinjam.ruangan} Disetujui`
    : `❌ Peminjaman Kelas ${pinjam.ruangan} Ditolak`;

  const body = status === 'approved'
    ? `Halo ${pinjam.nama},\n\nPermohonan peminjaman Kelas ${pinjam.ruangan} pada tanggal ${pinjam.tanggal} pukul ${pinjam.mulai}–${pinjam.selesai} telah DISETUJUI.\n\nHarap menjaga kebersihan dan ketertiban ruangan. Kembalikan kunci ke petugas setelah selesai.\n\nSalam,\nAdmin`
    : `Halo ${pinjam.nama},\n\nPermohonan peminjaman Kelas ${pinjam.ruangan} pada tanggal ${pinjam.tanggal} pukul ${pinjam.mulai}–${pinjam.selesai} tidak dapat dikabulkan.\n\nAlasan: Jadwal bentrok atau ruangan tidak tersedia. Silahkan ajukan permohonan pada waktu yang lain.\n\nSalam,\nAdmin`;

  await supabase.from('pesan').insert({
    pinjam_id: pinjam.id,
    subject,
    body,
    status_pinjam: status,
    read: false,
  });

  res.json(pinjam);
});

// ============================================================
// ===== ROUTES: PESAN =====
// ============================================================

// GET semua pesan
app.get('/api/pesan', async (req, res) => {
  const { data, error } = await supabase
    .from('pesan')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST kirim pesan manual dari admin
app.post('/api/pesan', async (req, res) => {
  const { pinjam_id, subject, body } = req.body;
  if (!subject || !body)
    return res.status(400).json({ error: 'Subject dan body wajib diisi' });

  const { data: pinjam } = pinjam_id
    ? await supabase.from('peminjaman').select('status').eq('id', pinjam_id).single()
    : { data: null };

  const { data, error } = await supabase
    .from('pesan')
    .insert({
      pinjam_id: pinjam_id || null,
      subject,
      body,
      status_pinjam: pinjam?.status || null,
      read: false,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH tandai satu pesan sebagai dibaca
app.patch('/api/pesan/:id/read', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('pesan')
    .update({ read: true })
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// PATCH tandai semua pesan sebagai dibaca
app.patch('/api/pesan/read-all', async (req, res) => {
  const { error } = await supabase
    .from('pesan')
    .update({ read: true })
    .eq('read', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== START SERVER ===== 
app.listen(PORT, () => {
  console.log(`✅ SiPinjam server berjalan di http://localhost:${PORT}`);
  console.log(`📦 Supabase URL: ${process.env.SUPABASE_URL}`);
});

module.exports = app;