// pages/Beranda.jsx
// Halaman utama — statistik & status ruangan

export default function Beranda({ peminjaman, pemetaan }) {
  const pending  = peminjaman.filter(p => p.status === 'pending').length;
  const approved = peminjaman.filter(p => p.status === 'approved').length;
  const rejected = peminjaman.filter(p => p.status === 'rejected').length;

  const statusLabel = {
    available:   'Tersedia',
    maintenance: 'Maintenance',
    reserved:    'Reservasi',
    busy:        'Dipakai',
  };

  const recent = [...peminjaman].reverse().slice(0, 6);

  const statusIcon = {
    pending:  <i className="ph-fill ph-hourglass-medium" style={{ color: 'var(--amber-500)' }} />,
    approved: <i className="ph-fill ph-check-circle"     style={{ color: 'var(--emerald-500)' }} />,
    rejected: <i className="ph-fill ph-x-circle"         style={{ color: 'var(--rose-500)' }} />,
  };
  const statusTextLabel = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

  return (
    <section className="page active" id="page-beranda">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Selamat Datang <span className="wave">👋</span></h1>
          <p>Sistem Informasi Peminjaman Kelas — Fakultas Sains Dan Teknologi</p>
        </div>
        <div className="header-badge">
          <i className="ph-duotone ph-lightning" /> Realtime
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard color="blue"    icon="ph-door"             value={Object.keys(pemetaan).length || 9} label="Total Ruangan" />
        <StatCard color="amber"   icon="ph-hourglass-medium" value={pending}  label="Menunggu" />
        <StatCard color="emerald" icon="ph-check-circle"     value={approved} label="Disetujui" />
        <StatCard color="rose"    icon="ph-x-circle"         value={rejected} label="Ditolak" />
      </div>

      {/* Grid */}
      <div className="beranda-grid">
        {/* Status Ruangan */}
        <div className="card room-status-card">
          <h3><i className="ph-duotone ph-map-trifold" /> Status Ruangan</h3>
          <div className="room-list">
            {Object.keys(pemetaan).length === 0 ? (
              <div className="empty-state">
                <i className="ph-duotone ph-folder-open" />
                <p>Belum ada data ruangan</p>
              </div>
            ) : (
              Object.entries(pemetaan).map(([kode, d]) => (
                <div className="room-chip" key={kode}>
                  <div className={`room-chip-dot ${d.status}`} />
                  <div>
                    <div className="room-chip-name">Kelas {kode}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>{d.nama}</div>
                  </div>
                  <span className="room-chip-status">{statusLabel[d.status] || d.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Aktivitas Terbaru */}
        <div className="card recent-card">
          <h3><i className="ph-duotone ph-clock-counter-clockwise" /> Aktivitas Terbaru</h3>
          <div className="recent-list">
            {recent.length === 0 ? (
              <div className="empty-state">
                <i className="ph-duotone ph-folder-open" />
                <p>Belum ada peminjaman</p>
              </div>
            ) : (
              recent.map(p => (
                <div className="recent-item" key={p.id}>
                  <div className="ri-top">
                    <span className="ri-name">{p.nama}</span>
                    <span className="ri-nim">{p.nim}</span>
                  </div>
                  <div className="ri-info">
                    <i className="ph ph-door" style={{ fontSize: '13px' }} /> Kelas {p.ruangan}&nbsp;·&nbsp;
                    <i className="ph ph-calendar" style={{ fontSize: '13px' }} /> {p.tanggal}&nbsp;·&nbsp;
                    {statusIcon[p.status]} {statusTextLabel[p.status] || p.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────────
function StatCard({ color, icon, value, label }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon"><i className={`ph-duotone ${icon}`} /></div>
      <div className="stat-info">
        <span className="stat-num">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-glow" />
    </div>
  );
}