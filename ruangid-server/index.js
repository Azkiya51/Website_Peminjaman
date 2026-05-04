require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- 1. CORS CONFIG ---
app.use(cors({
  origin: 'https://website-peminjaman.vercel.app',
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
  nama: String,
  ruang: String,
  tanggal: String,
  jam: String,
  keperluan: String,
  status: { type: String, default: 'pending' }
}, { timestamps: true });

const PesanSchema = new mongoose.Schema({
  pinjam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Peminjaman' },
  subject: { type: String, default: "Informasi Peminjaman" },
  body: { type: String, default: "" }, 
  read: { type: Boolean, default: false }
}, { timestamps: true });

const Peminjaman = mongoose.model('Peminjaman', PeminjamanSchema);
const Pesan = mongoose.model('Pesan', PesanSchema);

// --- 4. NEW ENDPOINTS (Fixing 404 Jadwal & Pemetaan) ---

// Get Jadwal (Dibutuhkan oleh App.jsx)
app.get('/api/jadwal', async (req, res) => {
  try {
    // Mengambil data peminjaman yang sudah disetujui sebagai jadwal
    const results = await Peminjaman.find({ status: 'disetujui' }).sort({ tanggal: 1 });
    const formatted = results.map(p => ({
      id: p._id,
      nama: p.nama,
      ruang: p.ruang,
      tanggal: p.tanggal,
      jam: p.jam,
      status: p.status
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Pemetaan Ruang (Dibutuhkan oleh App.jsx)
app.get('/api/pemetaan', async (req, res) => {
  try {
    // Contoh data statis untuk pemetaan jika belum ada koleksi khusus
    const dataPemetaan = [
      { id: 1, nama_ruang: 'Lab Komputer 1', status: 'tersedia' },
      { id: 2, nama_ruang: 'Lab Komputer 2', status: 'digunakan' },
      { id: 3, nama_ruang: 'Ruang Teori 1', status: 'tersedia' }
    ];
    res.json(dataPemetaan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. ENDPOINTS PEMINJAMAN ---
app.get('/api/peminjaman', async (req, res) => {
  try {
    const results = await Peminjaman.find().sort({ createdAt: -1 });
    const formatted = results.map(p => ({
      id: p._id,
      nama: p.nama,
      ruang: p.ruang,
      tanggal: p.tanggal,
      jam: p.jam,
      keperluan: p.keperluan,
      status: p.status
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/peminjaman/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Peminjaman.findByIdAndUpdate(id, { status }, { new: true });
    res.json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/peminjaman', async (req, res) => {
  try {
    const baru = new Peminjaman(req.body);
    const simpan = await baru.save();
    res.json({ message: 'Berhasil!', id: simpan._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 6. ENDPOINTS PESAN ---
app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Pesan.find().sort({ createdAt: -1 });
    const formatted = results.map(p => ({
      id: p._id,
      body: p.body || "",
      subject: p.subject,
      read: p.read,
      created_at: p.createdAt
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/pesan/read-all', async (req, res) => {
  try {
    await Pesan.updateMany({ read: false }, { read: true });
    res.json({ message: 'Read all' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LISTEN ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));