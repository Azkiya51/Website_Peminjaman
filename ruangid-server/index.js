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
  .then(() => console.log('MongoDB Atlas Terkoneksi!'))
  .catch(err => console.error('Gagal koneksi database:', err));

// --- 3. SCHEMAS & MODELS ---
const PeminjamanSchema = new mongoose.Schema({
  nama: String,
  ruang: String,
  tanggal: String,
  jam: String,
  keperluan: String,
  status: { type: String, default: 'pending' }
}, { timestamps: true });

// Schema Pesan yang sesuai dengan kebutuhan Frontend
const PesanSchema = new mongoose.Schema({
  pinjam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Peminjaman' },
  subject: { type: String, default: "Informasi Peminjaman" },
  body: { type: String, default: "" }, // Default string kosong agar .substring tidak error
  read: { type: Boolean, default: false }
}, { timestamps: true });

const Peminjaman = mongoose.model('Peminjaman', PeminjamanSchema);
const Pesan = mongoose.model('Pesan', PesanSchema);

// --- 4. ENDPOINTS PESAN ---

// Get All Messages (Digunakan oleh loadPesan di App.jsx)
app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Pesan.find().sort({ createdAt: -1 });
    // Mapping field agar sesuai dengan p.id dan p.created_at di frontend
    const formatted = results.map(p => ({
      id: p._id,
      pinjam_id: p.pinjam_id,
      subject: p.subject,
      body: p.body || "", // Pastikan body tidak undefined
      read: p.read,
      created_at: p.createdAt
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIX ERROR 404: Read All (Digunakan saat pindah ke page pesan)
app.patch('/api/pesan/read-all', async (req, res) => {
  try {
    await Pesan.updateMany({ read: false }, { read: true });
    res.json({ message: 'Semua pesan ditandai telah dibaca' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark Single Message Read
app.patch('/api/pesan/:id/read', async (req, res) => {
  try {
    await Pesan.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Pesan dibaca' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send Message (Dari Admin)
app.post('/api/pesan', async (req, res) => {
  try {
    const baru = new Pesan(req.body);
    await baru.save();
    res.json({ message: 'Pesan berhasil dikirim' });
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

app.post('/api/peminjaman', async (req, res) => {
  try {
    const baru = new Peminjaman(req.body);
    const simpan = await baru.save();
    res.json({ message: 'Berhasil!', id: simpan._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));