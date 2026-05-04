require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- 1. CORS CONFIG (Fixing blocked by CORS policy) ---
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

const PesanSchema = new mongoose.Schema({
  pinjam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Peminjaman' },
  subject: { type: String, default: "Status Peminjaman" },
  body: { type: String, default: "" },
  read: { type: Boolean, default: false }
}, { timestamps: true });

const Peminjaman = mongoose.model('Peminjaman', PeminjamanSchema);
const Pesan = mongoose.model('Pesan', PesanSchema);

// --- 4. ENDPOINTS PESAN (Sesuai App.jsx & Pesan.jsx) ---

// Get All Messages
app.get('/api/pesan', async (req, res) => {
  try {
    const results = await Pesan.find().sort({ createdAt: -1 });
    // Map to match frontend field names (id, created_at)
    const formatted = results.map(p => ({
      id: p._id,
      pinjam_id: p.pinjam_id,
      subject: p.subject,
      body: p.body || "", // Fix for .substring error
      read: p.read,
      created_at: p.createdAt
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fix 404: Read All Messages (PATCH)
app.patch('/api/pesan/read-all', async (req, res) => {
  try {
    await Pesan.updateMany({ read: false }, { read: true });
    res.json({ message: 'Semua pesan ditandai dibaca' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark Single Message as Read
app.patch('/api/pesan/:id/read', async (req, res) => {
  try {
    await Pesan.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Pesan dibaca' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send New Message (From Admin)
app.post('/api/pesan', async (req, res) => {
  try {
    const baru = new Pesan(req.body);
    await baru.save();
    res.json({ message: 'Pesan terkirim' });
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

// Port & Listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));