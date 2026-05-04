require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- 1. CORS CONFIG ---
// Mengizinkan akses dari domain Vercel Anda
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

// --- 4. ENDPOINTS PEMINJAMAN ---

// Ambil semua data (Sinkronisasi ID agar tidak 'undefined' di Frontend)
app.get('/api/peminjaman', async (req, res) => {
  try {
    const results = await Peminjaman.find().sort({ createdAt: -1 });
    // Mapping _id ke id agar bisa dibaca oleh App.jsx
    const formatted = results.map(p => ({
      id: p._id, // Sangat Penting: Frontend mencari .id bukan ._id
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

// Endpoint untuk Setuju/Tolak (Sesuai rute /api/peminjaman/${id}/status)
app.patch('/api/peminjaman/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Peminjaman.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: "Data tidak ditemukan" });
    res.json({ message: `Status berhasil diperbarui menjadi ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/peminjaman', async (req, res) => {
  try {
    const baru = new Peminjaman(req.body);
    const simpan = await baru.save();
    res.json({ message: 'Peminjaman berhasil dikirim!', id: simpan._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. ENDPOINTS PESAN ---

// Get All Messages (Perbaikan substring error)
app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Pesan.find().sort({ createdAt: -1 });
    const formatted = results.map(p => ({
      id: p._id,
      pinjam_id: p.pinjam_id,
      subject: p.subject,
      body: p.body || "", // Memberikan string kosong jika body undefined
      read: p.read,
      created_at: p.createdAt
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Endpoint Tandai Semua Dibaca
app.patch('/api/pesan/read-all', async (req, res) => {
  try {
    await Pesan.updateMany({ read: false }, { read: true });
    res.json({ message: 'Semua pesan ditandai telah dibaca' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Kirim Pesan Baru
app.post('/api/pesan', async (req, res) => {
  try {
    const baru = new Pesan(req.body);
    await baru.save();
    res.json({ message: 'Pesan berhasil terkirim' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 6. LISTEN ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));