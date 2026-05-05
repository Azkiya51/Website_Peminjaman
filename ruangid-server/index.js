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
  nama:        { type: String, required: true },
  nim:         { type: String, required: true },
  ruangan:     { type: String, required: true },
  tanggal:     { type: String, required: true },
  mulai:       { type: String, required: true },
  selesai:     { type: String, required: true },
  alasan:      { type: String, required: true },
  status:      { type: String, default: 'pending' },
  // ✅ Simpan alasan konflik supaya admin bisa lihat langsung di tabel
  konflik_info: { type: String, default: '' }
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
// HELPERS
// =============================================================================

function toMenit(jam) {
  const [h, m] = jam.split(':').map(Number);
  return h * 60 + m;
}

function isOverlap(mulaiA, selesaiA, mulaiB, selesaiB) {
  return toMenit(mulaiA) < toMenit(selesaiB) &&
         toMenit(selesaiA) > toMenit(mulaiB);
}

// ✅ Pakai UTC+7 agar hari tidak meleset (timezone WIB)
function getNamaHari(tanggal) {
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const d = new Date(tanggal + 'T00:00:00+07:00');
  return HARI[d.getDay()];
}

async function cariRuanganKosong(tanggal, mulai, selesai, kecuali) {
  const SEMUA = ['4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','4.10'];
  const hari  = getNamaHari(tanggal);
  const kosong = [];

  for (const r of SEMUA) {
    if (r === kecuali) continue;
    const jadwals   = await Jadwal.find({ ruangan: r, hari });
    const pinjamans = await Peminjaman.find({ ruangan: r, tanggal, status: 'approved' });
    const bentrok   = [...jadwals, ...pinjamans].some(x => isOverlap(mulai, selesai, x.mulai, x.selesai));
    if (!bentrok) kosong.push(r);
  }
  return kosong;
}

async function cariSlotKosong(ruangan, tanggal) {
  const hari     = getNamaHari(tanggal);
  const jadwals  = await Jadwal.find({ ruangan, hari });
  const pinjamans = await Peminjaman.find({ ruangan, tanggal, status: 'approved' });

  const sibuk = [...jadwals, ...pinjamans]
    .map(x => ({ mulai: x.mulai, selesai: x.selesai }))
    .sort((a, b) => toMenit(a.mulai) - toMenit(b.mulai));

  const BUKA = 7 * 60, TUTUP = 21 * 60;
  const slots = [];
  let cursor = BUKA;

  for (const s of sibuk) {
    if (cursor < toMenit(s.mulai)) {
      const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
      slots.push(`${fmt(cursor)}–${fmt(toMenit(s.mulai))}`);
    }
    cursor = Math.max(cursor, toMenit(s.selesai));
  }
  if (cursor < TUTUP) {
    const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    slots.push(`${fmt(cursor)}–21:00`);
  }
  return slots;
}

// =============================================================================
// ENDPOINTS PEMINJAMAN
// =============================================================================

app.get('/api/peminjaman', async (req, res) => {
  try {
    const results = await Peminjaman.find().sort({ createdAt: 1 });
    res.json(results.map(p => ({
      id:           p._id.toString(),
      nama:         p.nama,
      nim:          p.nim,
      ruangan:      p.ruangan,
      tanggal:      p.tanggal,
      mulai:        p.mulai,
      selesai:      p.selesai,
      alasan:       p.alasan,
      status:       p.status,
      konflik_info: p.konflik_info || ''
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST peminjaman — cek konflik otomatis, TANPA pesan otomatis saat bentrok
app.post('/api/peminjaman', async (req, res) => {
  try {
    const { nama, nim, ruangan, tanggal, mulai, selesai, alasan } = req.body;

    // Cek 1: status pemetaan ruangan
    const peta = await Pemetaan.findOne({ kode: ruangan });
    if (peta && peta.status === 'maintenance') {
      const simpan = await new Peminjaman({
        nama, nim, ruangan, tanggal, mulai, selesai, alasan,
        status: 'rejected',
        konflik_info: '🔧 Ruangan sedang maintenance'
      }).save();
      return res.json({ message: 'Ditolak: ruangan maintenance', status: 'rejected', id: simpan._id.toString() });
    }

    if (peta && peta.status === 'reserved') {
      const simpan = await new Peminjaman({
        nama, nim, ruangan, tanggal, mulai, selesai, alasan,
        status: 'rejected',
        konflik_info: '🔒 Ruangan reservasi tetap'
      }).save();
      return res.json({ message: 'Ditolak: ruangan reserved', status: 'rejected', id: simpan._id.toString() });
    }

    // Cek 2: konflik jadwal reguler
    const hari = getNamaHari(tanggal);
    const semuaJadwal = await Jadwal.find({ ruangan, hari });
    const konflikJadwal = semuaJadwal.find(j => isOverlap(mulai, selesai, j.mulai, j.selesai)) || null;

    // Cek 3: konflik peminjaman lain yang approved
    const semuaPinjaman = await Peminjaman.find({ ruangan, tanggal, status: 'approved' });
    const konflikPinjaman = semuaPinjaman.find(p => isOverlap(mulai, selesai, p.mulai, p.selesai)) || null;

    if (konflikJadwal || konflikPinjaman) {
      let konflik_info = '';
      if (konflikJadwal) {
        konflik_info = `📚 Bentrok: ${konflikJadwal.matkul} (${konflikJadwal.dosen}) ${konflikJadwal.mulai}–${konflikJadwal.selesai}`;
      } else {
        konflik_info = `👥 Bentrok peminjaman: ${konflikPinjaman.nama} ${konflikPinjaman.mulai}–${konflikPinjaman.selesai}`;
      }

      const simpan = await new Peminjaman({
        nama, nim, ruangan, tanggal, mulai, selesai, alasan,
        status: 'rejected',
        konflik_info
      }).save();

      // Hitung saran untuk dikirim ke response (admin bisa pakai sebagai referensi)
      const ruanganKosong = await cariRuanganKosong(tanggal, mulai, selesai, ruangan);
      const slotKosong    = await cariSlotKosong(ruangan, tanggal);

      return res.json({
        message: 'Ditolak otomatis: ruangan sudah terisi',
        status: 'rejected',
        id: simpan._id.toString(),
        saran: { ruanganKosong, slotKosong }
      });
    }

    // Tidak bentrok → pending, tunggu admin
    const simpan = await new Peminjaman({ nama, nim, ruangan, tanggal, mulai, selesai, alasan }).save();
    res.json({ message: 'Berhasil! Menunggu persetujuan admin.', status: 'pending', id: simpan._id.toString() });

  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH approve/reject manual oleh admin + auto pesan
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
// ENDPOINTS PESAN — read-all HARUS di atas /:id/read
// =============================================================================

app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Pesan.find().sort({ createdAt: 1 });
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
    await new Jadwal({ ruangan, hari, mulai, selesai, matkul, dosen }).save();
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