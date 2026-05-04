require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- 1. PENGATURAN CORS (HARUS DI ATAS) ---
// Ini untuk mengatasi error "blocked by CORS policy" di browser
app.use(cors({
  origin: 'https://website-peminjaman.vercel.app', // Domain Vercel Anda
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Tambahan middleware untuk memastikan header CORS selalu terkirim
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://website-peminjaman.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(express.json());

// --- 2. KONEKSI MONGODB ---
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Atlas Terkoneksi!'))
  .catch(err => console.error('Gagal koneksi database:', err));

// --- 3. DEFINE SCHEMA & MODEL ---
const PeminjamanSchema = new mongoose.Schema({
  nama: String,
  ruang: String,
  tanggal: String,
  jam: String,
  keperluan: String,
  status: { type: String, default: 'pending' }
});
const Peminjaman = mongoose.model('Peminjaman', PeminjamanSchema);

const JadwalSchema = new mongoose.Schema({
  hari: String,
  ruang: String,
  kegiatan: String
});
const Jadwal = mongoose.model('Jadwal', JadwalSchema);

// --- 4. ENDPOINTS ---

// Mengambil semua data peminjaman
app.get('/api/peminjaman', async (req, res) => {
  try {
    const results = await Peminjaman.find().sort({ _id: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Menambah data peminjaman baru
app.post('/api/peminjaman', async (req, res) => {
  try {
    const baru = new Peminjaman(req.body);
    const simpan = await baru.save();
    res.json({ message: 'Berhasil simpan!', id: simpan._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mengambil data jadwal
app.get('/api/jadwal', async (req, res) => {
  try {
    const results = await Jadwal.find();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Update Status (Admin)
app.patch('/api/peminjaman/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await Peminjaman.findByIdAndUpdate(id, { status });
    res.json({ message: 'Status diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Pemetaan (Approved Only)
app.get('/api/pemetaan', async (req, res) => {
  try {
    const results = await Peminjaman.find({ status: 'approved' });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Pesan/Notifikasi (Terbaru)
app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Peminjaman.find().sort({ _id: -1 }).limit(5);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});