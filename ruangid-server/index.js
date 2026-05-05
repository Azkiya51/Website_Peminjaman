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

const PesanSchema = new mongoose.Schema({
  pinjam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Peminjaman', default: null },
  subject:   { type: String, default: 'Informasi Peminjaman' },
  body:      { type: String, default: '' },
  read:      { type: Boolean, default: false }
}, { timestamps: true });

const PemetaanSchema = new mongoose.Schema({
  kode:      { type: String, required: true, unique: true },
  nama:      { type: String, required: true },
  kapasitas: { type: Number, required: true },
  fasilitas: { type: String, required: true },
  status:    { type: String, default: 'available' }
}, { timestamps: true });

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

// =============================================================================
// ENDPOINTS PEMINJAMAN
// =============================================================================

app.get('/api/peminjaman', async (req, res) => {
  try {
    const results = await Peminjaman.find().sort({ createdAt: 1 });
    // ✅ FIX: semua _id di-toString() agar frontend bisa compare dengan ===
    res.json(results.map(p => ({
      id:      p._id.toString(),
      nama:    p.nama,
      nim:     p.nim,
      ruangan: p.ruangan,
      tanggal: p.tanggal,
      mulai:   p.mulai,
      selesai: p.selesai,
      alasan:  p.alasan,
      status:  p.status
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/peminjaman', async (req, res) => {
  try {
    const { nama, nim, ruangan, tanggal, mulai, selesai, alasan } = req.body;
    const baru = new Peminjaman({ nama, nim, ruangan, tanggal, mulai, selesai, alasan });
    const simpan = await baru.save();
    res.json({ message: 'Berhasil!', id: simpan._id.toString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ Auto kirim pesan saat approve/reject
app.patch('/api/peminjaman/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Peminjaman.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Peminjaman tidak ditemukan' });

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

// =============================================================================
// ENDPOINTS PESAN
// ✅ FIX: read-all HARUS di atas /:id/read agar tidak bentrok
// =============================================================================

app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Pesan.find().sort({ createdAt: 1 });
    // ✅ FIX: toString() pada id dan pinjam_id agar === di frontend berfungsi
    res.json(results.map(p => ({
      id:         p._id.toString(),
      pinjam_id:  p.pinjam_id ? p.pinjam_id.toString() : null,
      subject:    p.subject,
      body:       p.body || '',
      read:       p.read,
      created_at: p.createdAt
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pesan', async (req, res) => {
  try {
    const { pinjam_id, subject, body } = req.body;
    const pesan = new Pesan({ pinjam_id: pinjam_id || null, subject, body });
    await pesan.save();
    res.json({ message: 'Pesan terkirim!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ FIX: read-all WAJIB sebelum /:id/read — kalau terbalik Express salah routing
app.patch('/api/pesan/read-all', async (req, res) => {
  try {
    await Pesan.updateMany({ read: false }, { read: true });
    res.json({ message: 'Read all' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/pesan/:id/read', async (req, res) => {
  try {
    await Pesan.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================================
// ENDPOINTS JADWAL
// =============================================================================

app.get('/api/jadwal', async (req, res) => {
  try {
    const results = await Jadwal.find().sort({ hari: 1, mulai: 1 });
    res.json(results.map(j => ({
      id:      j._id.toString(),
      ruangan: j.ruangan,
      hari:    j.hari,
      mulai:   j.mulai,
      selesai: j.selesai,
      matkul:  j.matkul,
      dosen:   j.dosen
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/jadwal', async (req, res) => {
  try {
    const { ruangan, hari, mulai, selesai, matkul, dosen } = req.body;
    const jadwal = new Jadwal({ ruangan, hari, mulai, selesai, matkul, dosen });
    await jadwal.save();
    res.json({ message: 'Jadwal ditambahkan!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/jadwal/:id', async (req, res) => {
  try {
    await Jadwal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Jadwal dihapus!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================================
// ENDPOINTS PEMETAAN
// =============================================================================

app.get('/api/pemetaan', async (req, res) => {
  try {
    const results = await Pemetaan.find().sort({ kode: 1 });
    res.json(results.map(p => ({
      id:        p._id.toString(),
      kode:      p.kode,
      nama:      p.nama,
      kapasitas: p.kapasitas,
      fasilitas: p.fasilitas,
      status:    p.status
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

// =============================================================================
// START SERVER
// =============================================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));