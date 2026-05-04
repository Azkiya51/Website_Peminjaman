// pages/Peminjaman.jsx
// Halaman form peminjaman & riwayat

import { useState } from 'react';

const ROOMS = ['4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','4.10'];

const STATUS_LABEL = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

const today = new Date().toISOString().split('T')[0];

export default function Peminjaman({ peminjaman, pemetaan, onSubmit, showToast }) {
  const [form, setForm] = useState({
    nama: '', nim: '', ruangan: '', tanggal: '', mulai: '', selesai: '', alasan: '',
  });
  const [cekRuangan, setCekRuangan] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const cekStatus = () => {
    if (!cekRuangan) return null;
    const peta = pemetaan[cekRuangan];
    if (!peta) return null;
    const statusText = {
      available:   '✅ Tersedia untuk dipinjam',
      maintenance: '⚠️ Sedang maintenance',
      reserved:    '🔒 Reservasi tetap',
      busy:        '🔴 Sedang digunakan',
    };
    return { text: statusText[peta.status] || peta.status, available: peta.status === 'available' };
  };

  const handleSubmit = async () => {
    const { nama, nim, ruangan, tanggal, mulai, selesai, alasan } = form;
    if (!nama || !nim || !ruangan || !tanggal || !mulai || !selesai || !alasan) {
      showToast('⚠️ Harap isi semua field!', 'error');
      return;
    }
    if (mulai >= selesai) {
      showToast('⚠️ Jam selesai harus lebih dari jam mulai!', 'error');
      return;
    }
    setLoading(true);
    const ok = await onSubmit(form);
    if (ok) setForm({ nama: '', nim: '', ruangan: '', tanggal: '', mulai: '', selesai: '', alasan: '' });
    setLoading(false);
  };

  const cekResult = cekStatus();

  return (
    <section className="page active" id="page-peminjaman">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Form Peminjaman</h1>
          <p>Isi formulir di bawah untuk meminjam ruangan kelas</p>
        </div>
      </div>

      <div className="form-layout">
        {/* ── Form Card ─────────────────────────────────────── */}
        <div className="card form-card">
          <div className="form-section-title">
            <i className="ph-duotone ph-user-circle" /> Data Peminjam
          </div>

          <div className="form-group">
            <label><i className="ph ph-user" /> Nama Lengkap</label>
            <input type="text" value={form.nama} onChange={set('nama')} placeholder="Masukkan nama lengkap Anda..." />
          </div>
          <div className="form-group">
            <label><i className="ph ph-identification-card" /> NIM</label>
            <input type="text" value={form.nim} onChange={set('nim')} placeholder="Contoh: 2201234567" />
          </div>

          <div className="form-section-title" style={{ marginTop: '20px' }}>
            <i className="ph-duotone ph-door-open" /> Detail Ruangan
          </div>

          <div className="form-row">
            <div className="form-group">
              <label><i className="ph ph-door" /> Ruangan</label>
              <select value={form.ruangan} onChange={set('ruangan')}>
                <option value="">Pilih ruangan...</option>
                {ROOMS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label><i className="ph ph-calendar" /> Tanggal</label>
              <input type="date" value={form.tanggal} min={today} onChange={set('tanggal')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label><i className="ph ph-clock" /> Jam Mulai</label>
              <input type="time" value={form.mulai} onChange={set('mulai')} />
            </div>
            <div className="form-group">
              <label><i className="ph ph-clock-countdown" /> Jam Selesai</label>
              <input type="time" value={form.selesai} onChange={set('selesai')} />
            </div>
          </div>

          <div className="form-group">
            <label><i className="ph ph-pencil-line" /> Alasan Peminjaman</label>
            <textarea value={form.alasan} onChange={set('alasan')} rows={4} placeholder="Jelaskan keperluan peminjaman ruangan..." />
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            <i className="ph ph-paper-plane-tilt" /> {loading ? 'Mengirim...' : 'Ajukan Peminjaman'}
          </button>
        </div>

        {/* ── Side Info ─────────────────────────────────────── */}
        <div className="card side-info">
          <h3><i className="ph-duotone ph-info" /> Informasi Penting</h3>
          <ul className="info-list">
            <li><i className="ph-fill ph-check-circle" /> Peminjaman diproses maksimal 1x24 jam</li>
            <li><i className="ph-fill ph-check-circle" /> Ruangan dapat dipinjam Senin–Sabtu</li>
            <li><i className="ph-fill ph-check-circle" /> Jam operasional 07.00 – 21.00</li>
            <li><i className="ph-fill ph-check-circle" /> Bawa KTM saat menggunakan ruangan</li>
            <li><i className="ph-fill ph-check-circle" /> Jaga kebersihan dan kembalikan kunci</li>
          </ul>

          <div className="form-section-title" style={{ marginTop: '20px' }}>
            <i className="ph-duotone ph-magnifying-glass" /> Cek Ketersediaan
          </div>
          <div className="form-group">
            <label><i className="ph ph-door" /> Pilih Ruangan</label>
            <select value={cekRuangan} onChange={e => setCekRuangan(e.target.value)}>
              <option value="">Pilih ruangan...</option>
              {ROOMS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {cekResult && (
            <div className={`cek-result ${cekResult.available ? 'available' : 'busy'}`}>
              {cekResult.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Riwayat ──────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3><i className="ph-duotone ph-archive" /> Riwayat Peminjaman Saya</h3>
        <div className="table-wrapper">
          {peminjaman.length === 0 ? (
            <div className="empty-state">
              <i className="ph-duotone ph-folder-open" />
              <p>Belum ada riwayat</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Nama</th><th>NIM</th><th>Ruangan</th>
                  <th>Tanggal</th><th>Waktu</th><th>Status</th><th>Alasan</th>
                </tr>
              </thead>
              <tbody>
                {[...peminjaman].reverse().map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.nama}</td>
                    <td>{p.nim}</td>
                    <td>Kelas {p.ruangan}</td>
                    <td>{p.tanggal}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{p.mulai} – {p.selesai}</td>
                    <td><span className={`status-badge ${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.alasan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}