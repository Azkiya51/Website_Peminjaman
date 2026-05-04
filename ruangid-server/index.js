require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- 1. CORS CONFIG ---
app.use(cors({
  origin: [
    'https://website-peminjaman.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// --- 2. KONEKSI MONGODB ---
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Terkoneksi!'))
  .catch(err => console.error('❌ Gagal koneksi database:', err));

// --- 3. SCHEMAS & MODELS ---

// ✅ FIX: field disesuaikan dengan yang dikirim frontend (nama, nim, ruangan, tanggal, mulai, selesai, alasan)
const PeminjamanSchema = new mongoose.Schema({
  nama:    { type: String, required: true },
  nim:     { type: String, required: true },
  ruangan: { type: String, required: true },
  tanggal: { type: String, required: true },
  mulai:   { type: String, required: true },
  selesai: { type: String, required: true },
  alasan:  { type: String, required: true },
  status:  { type: String, default: 'pending' }
}, { timestamps: true });

// ✅ FIX: tambah field pinjam_id agar pesan bisa direlasikan ke peminjaman
const PesanSchema = new mongoose.Schema({
  pinjam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Peminjaman', default: null },
  subject:   { type: String, default: 'Informasi Peminjaman' },
  body:      { type: String, default: '' },
  read:      { type: Boolean, default: false }
}, { timestamps: true });

// ✅ NEW: Schema Pemetaan Ruangan
const PemetaanSchema = new mongoose.Schema({
  kode:       { type: String, required: true, unique: true },
  nama:       { type: String, required: true },
  kapasitas:  { type: Number, required: true },
  fasilitas:  { type: String, required: true },
  status:     { type: String, default: 'available' }
}, { timestamps: true });

// ✅ NEW: Schema Jadwal Kelas Reguler
const JadwalSchema = new mongoose.Schema({
  ruangan: { type: String, required: true },
  hari:    { type: String, required: true },
  mulai:   { type: String, required: true },
  selesai: { type: String, required: true },
  matkul:  { type: String, required: true },
  dosen:   { type: String, required: true }
}, { timestamps: true });

const Peminjaman = mongoose.model('Peminjaman', PeminjamanSchema);
const Pesan      = mongoose.model('Pesan',      PesanSchema);
const Pemetaan   = mongoose.model('Pemetaan',   PemetaanSchema);
const Jadwal     = mongoose.model('Jadwal',      JadwalSchema);

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS PEMINJAMAN
// ─────────────────────────────────────────────────────────────────────────────

// GET semua peminjaman
app.get('/api/peminjaman', async (req, res) => {
  try {
    const results = await Peminjaman.find().sort({ createdAt: 1 });
    const formatted = results.map(p => ({
      id:      p._id,
      nama:    p.nama,
      nim:     p.nim,
      ruangan: p.ruangan,
      tanggal: p.tanggal,
      mulai:   p.mulai,
      selesai: p.selesai,
      alasan:  p.alasan,
      status:  p.status
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST buat peminjaman baru
app.post('/api/peminjaman', async (req, res) => {
  try {
    const { nama, nim, ruangan, tanggal, mulai, selesai, alasan } = req.body;
    const baru = new Peminjaman({ nama, nim, ruangan, tanggal, mulai, selesai, alasan });
    const simpan = await baru.save();
    res.json({ message: 'Berhasil!', id: simpan._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH update status peminjaman (approve/reject) + auto kirim pesan
app.patch('/api/peminjaman/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Peminjaman.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Peminjaman tidak ditemukan' });

    // ✅ Auto-buat pesan notifikasi
    const isApproved = status === 'approved';
    const subject = isApproved
      ? `✅ Peminjaman Kelas ${updated.ruangan} Disetujui`
      : `❌ Peminjaman Kelas ${updated.ruangan} Ditolak`;
    const body = isApproved
      ? `Halo ${updated.nama},\n\nPermohonan peminjaman Kelas ${updated.ruangan} pada tanggal ${updated.tanggal} pukul ${updated.mulai}–${updated.selesai} telah DISETUJUI.\n\nHarap bawa KTM saat menggunakan ruangan dan jaga kebersihan.\n\nTerima kasih.`
      : `Halo ${updated.nama},\n\nPermohonan peminjaman Kelas ${updated.ruangan} pada tanggal ${updated.tanggal} pukul ${updated.mulai}–${updated.selesai} DITOLAK.\n\nSilakan hubungi admin untuk informasi lebih lanjut.\n\nTerima kasih.`;

    await new Pesan({ pinjam_id: updated._id, subject, body }).save();

    res.json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS PESAN
// ─────────────────────────────────────────────────────────────────────────────

// GET semua pesan
app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Pesan.find().sort({ createdAt: 1 });
    const formatted = results.map(p => ({
      id:         p._id,
      pinjam_id:  p.pinjam_id,
      subject:    p.subject,
      body:       p.body || '',
      read:       p.read,
      created_at: p.createdAt
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: POST kirim pesan dari admin ke peminjam
app.post('/api/pesan', async (req, res) => {
  try {
    const { pinjam_id, subject, body } = req.body;
    const pesan = new Pesan({ pinjam_id: pinjam_id || null, subject, body });
    await pesan.save();
    res.json({ message: 'Pesan terkirim!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: PATCH tandai satu pesan sebagai sudah dibaca
app.patch('/api/pesan/:id/read', async (req, res) => {
  try {
    await Pesan.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH tandai semua pesan sudah dibaca
app.patch('/api/pesan/read-all', async (req, res) => {
  try {
    await Pesan.updateMany({ read: false }, { read: true });
    res.json({ message: 'Read all' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS JADWAL
// ─────────────────────────────────────────────────────────────────────────────

// GET semua jadwal
app.get('/api/jadwal', async (req, res) => {
  try {
    const results = await Jadwal.find().sort({ hari: 1, mulai: 1 });
    const formatted = results.map(j => ({
      id:      j._id,
      ruangan: j.ruangan,
      hari:    j.hari,
      mulai:   j.mulai,
      selesai: j.selesai,
      matkul:  j.matkul,
      dosen:   j.dosen
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: POST tambah jadwal baru
app.post('/api/jadwal', async (req, res) => {
  try {
    const { ruangan, hari, mulai, selesai, matkul, dosen } = req.body;
    const jadwal = new Jadwal({ ruangan, hari, mulai, selesai, matkul, dosen });
    await jadwal.save();
    res.json({ message: 'Jadwal ditambahkan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: DELETE hapus jadwal
app.delete('/api/jadwal/:id', async (req, res) => {
  try {
    await Jadwal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Jadwal dihapus!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS PEMETAAN
// ─────────────────────────────────────────────────────────────────────────────

// GET semua pemetaan — ✅ FIX: format response pakai { kode, nama, kapasitas, fasilitas, status }
app.get('/api/pemetaan', async (req, res) => {
  try {
    const results = await Pemetaan.find().sort({ kode: 1 });
    const formatted = results.map(p => ({
      id:        p._id,
      kode:      p.kode,
      nama:      p.nama,
      kapasitas: p.kapasitas,
      fasilitas: p.fasilitas,
      status:    p.status
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: POST simpan/update pemetaan (upsert berdasarkan kode)
app.post('/api/pemetaan', async (req, res) => {
  try {
    const { kode, nama, kapasitas, fasilitas, status } = req.body;
    await Pemetaan.findOneAndUpdate(
      { kode },
      { kode, nama, kapasitas, fasilitas, status },
      { upsert: true, new: true }
    );
    res.json({ message: `Pemetaan kelas ${kode} disimpan!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));