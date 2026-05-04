const NAV_ITEMS = [
  { id: 'beranda',    icon: 'ri-home-5-line',          label: 'Beranda' },
  { id: 'peminjaman', icon: 'ri-calendar-check-line',  label: 'Peminjaman' },
  { id: 'jadwal',     icon: 'ri-time-line',             label: 'Jadwal' },
  { id: 'pesan',      icon: 'ri-message-3-line',        label: 'Pesan' },
  { id: 'admin',      icon: 'ri-settings-4-line',       label: 'Admin' },
];

export default function Sidebar({ activePage, isAdmin, unreadCount, sidebarOpen, onNavigate }) {
  return (
    <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <i className="ri-building-4-fill" />
        </div>
        <div>
          <span className="logo-title">Ruang.id</span>
          <span className="logo-sub">Sistem Peminjaman Ruangan</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const isAdminItem = item.id === 'admin';
          const showBadge = item.id === 'pesan' && unreadCount > 0;

          return (
            <button
              key={item.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={isAdminItem && !isAdmin ? 'Login sebagai admin dahulu' : item.label}
            >
              <i className={item.icon} />
              {item.label}
              {isAdminItem && isAdmin && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  background: 'rgba(20,184,166,0.2)',
                  color: 'var(--teal-400)',
                  padding: '2px 7px',
                  borderRadius: '99px',
                  fontWeight: 700,
                  letterSpacing: '.3px',
                }}>
                  AKTIF
                </span>
              )}
              {showBadge && (
                <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="sidebar-bottom">
        <div className="sidebar-version">
          <i className="ri-circle-fill" style={{ color: 'var(--teal-400)', fontSize: 8 }} />
          SiPinjem v1.0
          {isAdmin && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: 'var(--teal-400)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <i className="ri-shield-check-line" />
              Admin
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}