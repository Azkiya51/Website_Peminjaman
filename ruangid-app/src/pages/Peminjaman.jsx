// pages/Peminjaman.jsx
import { useState } from 'react';

const ROOMS = ['4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','4.10'];
const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const STATUS_LABEL = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const today = new Date().toISOString().split('T')[0];

// ✅ Hitung hari di frontend (browser) pakai timezone lokal user — akurat 100%
function getHariFromTanggal(tanggal) {
  if (!tanggal) return '';
  const [y, m, d] = tanggal.split('-').map(Number);
  const date = new Date(y, m - 1, d); // local time, tidak ada timezone shift
  return NAMA_HARI[date.getDay()];
}

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

    // ✅ Hitung hari di frontend, kirim ke backend
    const hari = getHariFromTanggal(tanggal);

    setLoading(true);
    const ok = await onSubmit({ ...form, hari });
    if (ok) setForm({ nama: '', nim: '', ruangan: '', tanggal: '', mulai: '', selesai: '', alasan: '' });
    setLoading(false);
  };

  const cekResult = cekStatus();

  // Tampilkan hari yang dipilih secara realtime
  const hariDipilih = getHariFromTanggal(form.tanggal);

  return (
    <section className="page active" id="page-peminjaman">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Form Peminjaman</h1>
          <p>Isi formulir di bawah untuk meminjam ruangan kelas</p>
        </div>
      </div>

      <div className="form-layout">
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
              <label>
                <i className="ph ph-calendar" /> Tanggal
                {/* ✅ Tampilkan hari realtime */}
                {hariDipilih && (
                  <span style={{ marginLeft: '8px', color: 'var(--teal-600)', fontWeight: 600, fontSize: '12px' }}>
                    ({hariDipilih})
                  </span>
                )}
              </label>
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
                  <th>Tanggal</th><th>Waktu</th><th>Status</th><th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {[...peminjaman].reverse().map(p => (
                  <tr key={p.id}>
                    <td>{p.id.slice(-4)}</td>
                    <td>{p.nama}</td>
                    <td>{p.nim}</td>
                    <td>Kelas {p.ruangan}</td>
                    <td>{p.tanggal}{p.hari ? <><br /><small style={{ color: 'var(--text-3)' }}>{p.hari}</small></> : ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{p.mulai} – {p.selesai}</td>
                    <td><span className={`status-badge ${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span></td>
                    {/* ✅ Tampilkan info konflik kalau ada */}
                    <td style={{ fontSize: '11px', color: p.konflik_info ? 'var(--rose-500)' : 'var(--text-3)', maxWidth: '180px' }}>
                      {p.konflik_info || '—'}
                    </td>
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