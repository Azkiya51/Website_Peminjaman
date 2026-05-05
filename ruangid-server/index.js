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
// HELPER: Cek konflik jadwal & peminjaman
// =============================================================================

// Konversi "HH:MM" ke menit sejak tengah malam
function toMenit(jam) {
  const [h, m] = jam.split(':').map(Number);
  return h * 60 + m;
}

// Cek apakah dua rentang waktu overlap
// A: [mulaiA, selesaiA], B: [mulaiB, selesaiB]
function isOverlap(mulaiA, selesaiA, mulaiB, selesaiB) {
  return toMenit(mulaiA) < toMenit(selesaiB) &&
         toMenit(selesaiA) > toMenit(mulaiB);
}

// Nama hari Indonesia dari tanggal (YYYY-MM-DD)
function getNamaHari(tanggal) {
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  return HARI[new Date(tanggal).getDay()];
}

// Cari semua ruangan yang KOSONG pada hari & jam tertentu
async function cariRuanganKosong(tanggal, mulai, selesai, ruanganDiminta) {
  const SEMUA_RUANGAN = ['4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','4.10'];
  const hari = getNamaHari(tanggal);
  const kosong = [];

  for (const ruangan of SEMUA_RUANGAN) {
    if (ruangan === ruanganDiminta) continue; // skip ruangan yang bentrok

    // Cek konflik jadwal reguler
    const konflikJadwal = await Jadwal.findOne({
      ruangan,
      hari,
      $expr: {
        $and: [
          { $lt: [{ $toInt: { $replaceAll: { input: '$mulai',   find: ':', replacement: '' } } }, parseInt(selesai.replace(':', ''))] },
          { $gt: [{ $toInt: { $replaceAll: { input: '$selesai', find: ':', replacement: '' } } }, parseInt(mulai.replace(':', ''))] }
        ]
      }
    });

    // Cek konflik peminjaman yang approved
    const konflikPeminjaman = await Peminjaman.findOne({
      ruangan,
      tanggal,
      status: 'approved',
      $expr: {
        $and: [
          { $lt: [{ $toInt: { $replaceAll: { input: '$mulai',   find: ':', replacement: '' } } }, parseInt(selesai.replace(':', ''))] },
          { $gt: [{ $toInt: { $replaceAll: { input: '$selesai', find: ':', replacement: '' } } }, parseInt(mulai.replace(':', ''))] }
        ]
      }
    });

    if (!konflikJadwal && !konflikPeminjaman) {
      kosong.push(ruangan);
    }
  }

  return kosong;
}

// Cari slot jam kosong di ruangan yang sama pada hari yang sama
async function cariSlotKosong(ruangan, tanggal) {
  const hari = getNamaHari(tanggal);

  // Kumpulkan semua slot sibuk
  const jadwalHari = await Jadwal.find({ ruangan, hari });
  const peminjamanHari = await Peminjaman.find({ ruangan, tanggal, status: 'approved' });

  const sibuk = [
    ...jadwalHari.map(j => ({ mulai: j.mulai, selesai: j.selesai })),
    ...peminjamanHari.map(p => ({ mulai: p.mulai, selesai: p.selesai }))
  ].sort((a, b) => toMenit(a.mulai) - toMenit(b.mulai));

  // Cari celah kosong antara jam 07:00 - 21:00
  const BUKA = 7 * 60;   // 420 menit
  const TUTUP = 21 * 60; // 1260 menit
  const slots = [];
  let cursor = BUKA;

  for (const s of sibuk) {
    const sMulai  = toMenit(s.mulai);
    const sSelesai = toMenit(s.selesai);
    if (cursor < sMulai) {
      // Ada celah sebelum slot ini
      const jamMulai   = `${String(Math.floor(cursor / 60)).padStart(2,'0')}:${String(cursor % 60).padStart(2,'0')}`;
      const jamSelesai = `${String(Math.floor(sMulai / 60)).padStart(2,'0')}:${String(sMulai % 60).padStart(2,'0')}`;
      slots.push(`${jamMulai}–${jamSelesai}`);
    }
    cursor = Math.max(cursor, sSelesai);
  }

  // Celah setelah slot terakhir
  if (cursor < TUTUP) {
    const jamMulai   = `${String(Math.floor(cursor / 60)).padStart(2,'0')}:${String(cursor % 60).padStart(2,'0')}`;
    slots.push(`${jamMulai}–21:00`);
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

// POST peminjaman — dengan cek konflik otomatis
app.post('/api/peminjaman', async (req, res) => {
  try {
    const { nama, nim, ruangan, tanggal, mulai, selesai, alasan } = req.body;

    // ── Cek 1: status pemetaan ruangan (maintenance / reserved) ──────────────
    const peta = await Pemetaan.findOne({ kode: ruangan });
    if (peta && peta.status === 'maintenance') {
      const baru = new Peminjaman({ nama, nim, ruangan, tanggal, mulai, selesai, alasan, status: 'rejected' });
      const simpan = await baru.save();
      await new Pesan({
        pinjam_id: simpan._id,
        subject: `❌ Peminjaman Kelas ${ruangan} Ditolak Otomatis`,
        body: `Halo ${nama},\n\nPermohonan peminjaman Kelas ${ruangan} pada ${tanggal} pukul ${mulai}–${selesai} ditolak otomatis karena:\n\n🔧 Ruangan sedang dalam perbaikan (maintenance).\n\nSilakan tunggu informasi dari admin atau pilih ruangan lain.\n\nTerima kasih.`
      }).save();
      return res.json({ message: 'Ditolak otomatis: ruangan maintenance', status: 'rejected', id: simpan._id.toString() });
    }

    if (peta && peta.status === 'reserved') {
      const baru = new Peminjaman({ nama, nim, ruangan, tanggal, mulai, selesai, alasan, status: 'rejected' });
      const simpan = await baru.save();
      await new Pesan({
        pinjam_id: simpan._id,
        subject: `❌ Peminjaman Kelas ${ruangan} Ditolak Otomatis`,
        body: `Halo ${nama},\n\nPermohonan peminjaman Kelas ${ruangan} pada ${tanggal} pukul ${mulai}–${selesai} ditolak otomatis karena:\n\n🔒 Ruangan memiliki reservasi tetap dan tidak dapat dipinjam.\n\nSilakan pilih ruangan lain.\n\nTerima kasih.`
      }).save();
      return res.json({ message: 'Ditolak otomatis: ruangan reserved', status: 'rejected', id: simpan._id.toString() });
    }

    // ── Cek 2: konflik dengan jadwal reguler ─────────────────────────────────
    const hari = getNamaHari(tanggal);
    const jadwalBentrok = await Jadwal.findOne({ ruangan, hari });
    let konflikJadwal = null;
    if (jadwalBentrok) {
      // Cek manual overlap karena $expr dengan string jam tidak reliable
      const semuaJadwal = await Jadwal.find({ ruangan, hari });
      konflikJadwal = semuaJadwal.find(j => isOverlap(mulai, selesai, j.mulai, j.selesai)) || null;
    }

    // ── Cek 3: konflik dengan peminjaman lain yang approved ──────────────────
    const semuaPeminjaman = await Peminjaman.find({ ruangan, tanggal, status: 'approved' });
    const konflikPeminjaman = semuaPeminjaman.find(p => isOverlap(mulai, selesai, p.mulai, p.selesai)) || null;

    // ── Ada konflik → auto rejected ──────────────────────────────────────────
    if (konflikJadwal || konflikPeminjaman) {
      const baru = new Peminjaman({ nama, nim, ruangan, tanggal, mulai, selesai, alasan, status: 'rejected' });
      const simpan = await baru.save();

      // Bangun pesan detail konflik
      let infoKonflik = '';
      if (konflikJadwal) {
        infoKonflik = `📚 Jadwal kuliah reguler: ${konflikJadwal.matkul} (${konflikJadwal.dosen}) pukul ${konflikJadwal.mulai}–${konflikJadwal.selesai}`;
      } else {
        infoKonflik = `👥 Sudah ada peminjaman lain yang disetujui pada pukul ${konflikPeminjaman.mulai}–${konflikPeminjaman.selesai}`;
      }

      // Cari alternatif: ruangan kosong & slot kosong di ruangan yg sama
      const ruanganKosong = await cariRuanganKosong(tanggal, mulai, selesai, ruangan);
      const slotKosong    = await cariSlotKosong(ruangan, tanggal);

      let saranText = '\n\n💡 Admin akan segera memberikan saran alternatif waktu atau ruangan yang tersedia.';
      if (ruanganKosong.length > 0) {
        saranText += `\n\nℹ️ Info awal: Ruangan lain yang kosong pada jam tersebut: Kelas ${ruanganKosong.join(', ')}`;
      }
      if (slotKosong.length > 0) {
        saranText += `\n\nℹ️ Info awal: Slot kosong di Kelas ${ruangan} pada ${tanggal}: ${slotKosong.join(', ')}`;
      }

      await new Pesan({
        pinjam_id: simpan._id,
        subject: `❌ Peminjaman Kelas ${ruangan} Ditolak Otomatis`,
        body: `Halo ${nama},\n\nPermohonan peminjaman Kelas ${ruangan} pada ${tanggal} pukul ${mulai}–${selesai} ditolak otomatis karena ruangan sudah terisi:\n\n${infoKonflik}${saranText}\n\nTerima kasih.`
      }).save();

      return res.json({ message: 'Ditolak otomatis: ruangan sudah terisi', status: 'rejected', id: simpan._id.toString() });
    }

    // ── Tidak ada konflik → pending, tunggu admin ─────────────────────────────
    const baru = new Peminjaman({ nama, nim, ruangan, tanggal, mulai, selesai, alasan });
    const simpan = await baru.save();
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
// ENDPOINTS PESAN
// read-all HARUS di atas /:id/read
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