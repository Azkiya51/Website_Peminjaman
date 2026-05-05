// pages/Admin.jsx
import { useState } from 'react';

const ROOMS = ['4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','4.10'];
const DAYS  = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const STATUS_LABEL  = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const STATUS_COLORS = { available: 'var(--emerald-500)', maintenance: 'var(--amber-500)', reserved: 'var(--rose-500)' };

export default function Admin({
  peminjaman, pemetaan, jadwal,
  onApproveReject, onSendMessage, onSavePemetaan,
  onSaveJadwal, onDeleteJadwal, onLogout, showToast,
}) {
  const [activeTab, setActiveTab] = useState('permohonan');

  return (
    <section className="page active" id="page-admin">
      <div className="page-header">
        <div className="page-header-text">
          <h1><i className="ph-duotone ph-shield-star" /> Panel Admin</h1>
          <p>Kelola pemetaan kelas dan persetujuan peminjaman</p>
        </div>
        <button className="btn-ghost-sm" onClick={onLogout}>
          <i className="ph ph-sign-out" /> Keluar
        </button>
      </div>

      <div className="admin-tabs">
        {[
          { key: 'permohonan',   icon: 'ph-inbox',           label: 'Permohonan' },
          { key: 'pemetaan',     icon: 'ph-map-pin-area',    label: 'Pemetaan Kelas' },
          { key: 'jadwal-admin', icon: 'ph-calendar-check',  label: 'Atur Jadwal' },
        ].map(t => (
          <button
            key={t.key}
            className={`atab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <i className={`ph-duotone ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'permohonan' && (
        <PermohonanPanel
          peminjaman={peminjaman}
          onApproveReject={onApproveReject}
          onSendMessage={onSendMessage}
          showToast={showToast}
        />
      )}
      {activeTab === 'pemetaan' && (
        <PemetaanPanel
          pemetaan={pemetaan}
          onSavePemetaan={onSavePemetaan}
          showToast={showToast}
        />
      )}
      {activeTab === 'jadwal-admin' && (
        <JadwalAdminPanel
          jadwal={jadwal}
          onSaveJadwal={onSaveJadwal}
          onDeleteJadwal={onDeleteJadwal}
          showToast={showToast}
        />
      )}
    </section>
  );
}

// ── Panel: Permohonan ─────────────────────────────────────────────────────────
function PermohonanPanel({ peminjaman, onApproveReject, onSendMessage, showToast }) {
  const [msgModal, setMsgModal] = useState(null);
  const [msgForm, setMsgForm]   = useState({ subject: '', body: '' });

  const openMsg = (p) => {
    setMsgModal({ pinjamId: p.id, nama: p.nama, ruangan: p.ruangan });

    // ✅ Pre-fill pesan dengan info konflik + saran (jika ditolak otomatis)
    const defaultSubject = `Re: Peminjaman Kelas ${p.ruangan}`;
    let defaultBody = '';
    if (p.konflik_info) {
      defaultBody = `Halo ${p.nama},\n\nPermohonan peminjaman Kelas ${p.ruangan} pada ${p.tanggal} pukul ${p.mulai}–${p.selesai} ditolak karena:\n\n${p.konflik_info}\n\nSaran alternatif:\n- Ruangan lain: (isi manual)\n- Jam lain: (isi manual)\n\nTerima kasih.`;
    }
    setMsgForm({ subject: defaultSubject, body: defaultBody });
  };

  const handleSend = async () => {
    if (!msgForm.subject.trim() || !msgForm.body.trim()) {
      showToast('⚠️ Isi subjek dan pesan!', 'error');
      return;
    }
    const ok = await onSendMessage(msgModal.pinjamId, msgForm.subject, msgForm.body);
    if (ok) setMsgModal(null);
  };

  return (
    <div className="admin-panel active">
      <div className="card">
        <h3><i className="ph-duotone ph-clipboard-text" /> Daftar Permohonan Peminjaman</h3>
        <div className="table-wrapper">
          {peminjaman.length === 0 ? (
            <div className="empty-state">
              <i className="ph-duotone ph-folder-open" />
              <p>Belum ada permohonan</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Peminjam</th><th>Ruangan</th>
                  <th>Waktu</th><th>Alasan</th><th>Keterangan</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {[...peminjaman].reverse().map(p => (
                  <tr key={p.id}>
                    <td>{p.id.slice(-4)}</td>
                    <td><strong>{p.nama}</strong><br /><small style={{ color: 'var(--text-3)' }}>{p.nim}</small></td>
                    <td>Kelas {p.ruangan}</td>
                    <td>{p.tanggal}<br /><small>{p.mulai}–{p.selesai}</small></td>
                    <td style={{ maxWidth: '140px', fontSize: '12px' }}>{p.alasan}</td>
                    {/* ✅ Kolom keterangan konflik — tampil merah kalau ada */}
                    <td style={{ maxWidth: '160px', fontSize: '11px', color: p.konflik_info ? 'var(--rose-500)' : 'var(--text-3)' }}>
                      {p.konflik_info || <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td><span className={`status-badge ${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span></td>
                    <td>
                      {p.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-sm btn-approve" onClick={() => onApproveReject(p.id, 'approved')}>
                            <i className="ph ph-check" /> Setuju
                          </button>
                          <button className="btn-sm btn-reject" onClick={() => onApproveReject(p.id, 'rejected')}>
                            <i className="ph ph-x" /> Tolak
                          </button>
                        </div>
                      ) : (
                        // ✅ Tombol Pesan selalu tampil untuk rejected (termasuk auto-reject)
                        <button className="btn-sm btn-msg" onClick={() => openMsg(p)}>
                          <i className="ph ph-paper-plane-tilt" /> Pesan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {msgModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              <i className="ph-duotone ph-paper-plane-tilt" style={{ color: 'var(--teal-500)' }} />
              {' '}Kirim Pesan ke {msgModal.nama}
            </h3>
            <div className="form-group">
              <label>Subjek</label>
              <input
                type="text"
                value={msgForm.subject}
                onChange={e => setMsgForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Pesan</label>
              <textarea
                rows={7}
                placeholder="Tulis pesan..."
                value={msgForm.body}
                onChange={e => setMsgForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setMsgModal(null)}>Batal</button>
              <button className="btn-primary" style={{ marginTop: 0 }} onClick={handleSend}>
                <i className="ph ph-paper-plane-tilt" /> Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel: Pemetaan ───────────────────────────────────────────────────────────
function PemetaanPanel({ pemetaan, onSavePemetaan, showToast }) {
  const [form, setForm] = useState({ kode: '4.2', nama: '', kapasitas: '', fasilitas: '', status: 'available' });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const editPemetaan = (code) => {
    const d = pemetaan[code];
    if (!d) return;
    setForm({ kode: code, nama: d.nama, kapasitas: d.kapasitas, fasilitas: d.fasilitas, status: d.status });
  };

  const handleSave = async () => {
    if (!form.nama || !form.kapasitas || !form.fasilitas) {
      showToast('⚠️ Harap isi semua data!', 'error');
      return;
    }
    await onSavePemetaan({ ...form, kapasitas: parseInt(form.kapasitas) });
    setForm(f => ({ ...f, nama: '', kapasitas: '', fasilitas: '' }));
  };

  return (
    <div className="admin-panel active">
      <div className="pemetaan-grid">
        <div className="card">
          <h3><i className="ph-duotone ph-pencil-ruler" /> Tambah / Edit Pemetaan</h3>
          <div className="form-group">
            <label>Kode Ruangan</label>
            <select value={form.kode} onChange={set('kode')}>
              {ROOMS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Nama / Fungsi Ruangan</label>
            <input type="text" value={form.nama} onChange={set('nama')} placeholder="cth: Lab Jaringan, Kelas Teori..." />
          </div>
          <div className="form-group">
            <label>Kapasitas</label>
            <input type="number" value={form.kapasitas} onChange={set('kapasitas')} placeholder="Jumlah kursi" />
          </div>
          <div className="form-group">
            <label>Fasilitas</label>
            <input type="text" value={form.fasilitas} onChange={set('fasilitas')} placeholder="cth: AC, Proyektor, WiFi..." />
          </div>
          <div className="form-group">
            <label>Status Default</label>
            <select value={form.status} onChange={set('status')}>
              <option value="available">Tersedia</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reservasi Tetap</option>
            </select>
          </div>
          <button className="btn-primary" onClick={handleSave}>
            <i className="ph ph-floppy-disk" /> Simpan Pemetaan
          </button>
        </div>

        <div className="card">
          <h3><i className="ph-duotone ph-list-bullets" /> Daftar Ruangan</h3>
          <div className="room-map-list">
            {Object.entries(pemetaan).map(([code, d]) => (
              <div className="room-map-item" key={code}>
                <div className="rmi-code">{code}</div>
                <div className="rmi-info">
                  <div className="rmi-name">{d.nama}</div>
                  <div className="rmi-detail">
                    <i className="ph ph-users" style={{ fontSize: '11px' }} /> {d.kapasitas} kursi &nbsp;·&nbsp; {d.fasilitas}
                  </div>
                </div>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: STATUS_COLORS[d.status] || '#ccc', flexShrink: 0 }} />
                <div className="rmi-actions">
                  <button className="btn-sm btn-msg" onClick={() => editPemetaan(code)}>
                    <i className="ph ph-pencil-simple" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel: Jadwal Admin ───────────────────────────────────────────────────────
function JadwalAdminPanel({ jadwal, onSaveJadwal, onDeleteJadwal, showToast }) {
  const [form, setForm] = useState({ ruangan: '4.2', hari: 'Senin', mulai: '', selesai: '', matkul: '', dosen: '' });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    const { mulai, selesai, matkul, dosen } = form;
    if (!mulai || !selesai || !matkul || !dosen) {
      showToast('⚠️ Harap isi semua field!', 'error');
      return;
    }
    if (mulai >= selesai) {
      showToast('⚠️ Jam selesai harus lebih dari jam mulai!', 'error');
      return;
    }
    await onSaveJadwal(form);
    setForm(f => ({ ...f, mulai: '', selesai: '', matkul: '', dosen: '' }));
  };

  return (
    <div className="admin-panel active">
      <div className="card">
        <h3><i className="ph-duotone ph-plus-circle" /> Tambah Jadwal Kelas Reguler</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Ruangan</label>
            <select value={form.ruangan} onChange={set('ruangan')}>
              {ROOMS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Hari</label>
            <select value={form.hari} onChange={set('hari')}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Jam Mulai</label>
            <input type="time" value={form.mulai} onChange={set('mulai')} />
          </div>
          <div className="form-group">
            <label>Jam Selesai</label>
            <input type="time" value={form.selesai} onChange={set('selesai')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Mata Kuliah</label>
            <input type="text" value={form.matkul} onChange={set('matkul')} placeholder="Nama mata kuliah..." />
          </div>
          <div className="form-group">
            <label>Dosen</label>
            <input type="text" value={form.dosen} onChange={set('dosen')} placeholder="Nama dosen..." />
          </div>
        </div>
        <button className="btn-primary" onClick={handleSave}>
          <i className="ph ph-plus" /> Tambah Jadwal
        </button>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <h3><i className="ph-duotone ph-table" /> Jadwal Tersimpan</h3>
        <div className="table-wrapper">
          {jadwal.length === 0 ? (
            <div className="empty-state">
              <i className="ph-duotone ph-calendar-x" />
              <p>Belum ada jadwal</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ruangan</th><th>Hari</th><th>Jam</th><th>Mata Kuliah</th><th>Dosen</th><th>Hapus</th>
                </tr>
              </thead>
              <tbody>
                {jadwal.map(j => (
                  <tr key={j.id}>
                    <td>
                      <span style={{ background: 'var(--teal-100)', color: 'var(--teal-700)', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                        Kelas {j.ruangan}
                      </span>
                    </td>
                    <td>{j.hari}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{j.mulai} – {j.selesai}</td>
                    <td>{j.matkul}</td>
                    <td style={{ color: 'var(--text-3)' }}>{j.dosen}</td>
                    <td>
                      <button className="btn-sm btn-del" onClick={() => onDeleteJadwal(j.id)}>
                        <i className="ph ph-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}