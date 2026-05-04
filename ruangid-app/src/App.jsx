import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast from './components/Toast';
import AdminGate from './components/AdminGate';

import Beranda from './pages/Beranda';
import Peminjaman from './pages/Peminjaman';
import Jadwal from './pages/Jadwal';
import Pesan from './pages/Pesan';
import Admin from './pages/Admin';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : 'https://websitepeminjaman-production.up.railway.app/api';
const ADMIN_PASSWORD = 'Zeckganteng';

// ─── API Helper ───────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return null;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage] = useState('beranda');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [toast, setToast] = useState(null);

  // Global data state
  const [peminjaman, setPeminjaman] = useState([]);
  const [pesan, setPesan] = useState([]);
  const [jadwal, setJadwal] = useState([]);
  const [pemetaan, setPemetaan] = useState({});

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
  }, []);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadPemetaan = useCallback(async () => {
    const data = await apiFetch('/pemetaan');
    if (data) {
      const map = {};
      data.forEach(r => { map[r.kode] = r; });
      setPemetaan(map);
    }
  }, []);

  const loadJadwal = useCallback(async () => {
    const data = await apiFetch('/jadwal');
    if (data) setJadwal(data);
  }, []);

  const loadPeminjaman = useCallback(async () => {
    const data = await apiFetch('/peminjaman');
    if (data) setPeminjaman(data);
  }, []);

  const loadPesan = useCallback(async () => {
    const data = await apiFetch('/pesan');
    if (data) setPesan(data);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([loadPemetaan(), loadJadwal(), loadPeminjaman(), loadPesan()]);
  }, [loadPemetaan, loadJadwal, loadPeminjaman, loadPesan]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigateTo = useCallback(async (page) => {
    if (page === 'admin' && !isAdmin) {
      setShowAdminGate(true);
      return;
    }
    setActivePage(page);
    if (window.innerWidth < 900) setSidebarOpen(false);
    if (page === 'pesan') {
      await apiFetch('/pesan/read-all', { method: 'PATCH' });
      setPesan(prev => prev.map(p => ({ ...p, read: true })));
    }
  }, [isAdmin]);

  // ── Admin Gate ────────────────────────────────────────────────────────────
  const handleAdminLogin = useCallback((password) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminGate(false);
      setActivePage('admin');
      showToast('✅ Masuk sebagai Admin', 'success');
      return true;
    }
    return false;
  }, [showToast]);

  const handleAdminLogout = useCallback(() => {
    setIsAdmin(false);
    setActivePage('beranda');
    showToast('ℹ️ Keluar dari panel admin', 'info');
  }, [showToast]);

  // ── API actions (passed as props) ─────────────────────────────────────────
  const submitPeminjaman = useCallback(async (formData) => {
    const result = await apiFetch('/peminjaman', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    if (result) {
      await Promise.all([loadPeminjaman(), loadPesan()]);
      showToast('✅ Permohonan berhasil diajukan!', 'success');
      return true;
    }
    showToast('❌ Gagal terhubung ke server', 'error');
    return false;
  }, [loadPeminjaman, loadPesan, showToast]);

  const approveReject = useCallback(async (id, action) => {
    const result = await apiFetch(`/peminjaman/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: action }),
    });
    if (result) {
      await Promise.all([loadPeminjaman(), loadPesan()]);
      showToast(
        action === 'approved' ? '✅ Peminjaman disetujui!' : '❌ Peminjaman ditolak!',
        action === 'approved' ? 'success' : 'error'
      );
    }
  }, [loadPeminjaman, loadPesan, showToast]);

  const sendMessage = useCallback(async (pinjamId, subject, body) => {
    const result = await apiFetch('/pesan', {
      method: 'POST',
      body: JSON.stringify({ pinjam_id: pinjamId, subject, body }),
    });
    if (result) {
      await loadPesan();
      showToast('✅ Pesan berhasil dikirim!', 'success');
      return true;
    }
    return false;
  }, [loadPesan, showToast]);

  const savePemetaan = useCallback(async (data) => {
    const result = await apiFetch('/pemetaan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result) {
      await loadPemetaan();
      showToast(`✅ Pemetaan Kelas ${data.kode} disimpan!`, 'success');
    }
  }, [loadPemetaan, showToast]);

  const saveJadwal = useCallback(async (data) => {
    const result = await apiFetch('/jadwal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result) {
      await loadJadwal();
      showToast(`✅ Jadwal Kelas ${data.ruangan} – ${data.hari} ditambahkan!`, 'success');
    }
  }, [loadJadwal, showToast]);

  const deleteJadwal = useCallback(async (id) => {
    const result = await apiFetch(`/jadwal/${id}`, { method: 'DELETE' });
    if (result !== null) {
      await loadJadwal();
      showToast('🗑️ Jadwal dihapus', 'info');
    }
  }, [loadJadwal, showToast]);

  const markPesanRead = useCallback(async (id) => {
    await apiFetch(`/pesan/${id}/read`, { method: 'PATCH' });
    setPesan(prev => prev.map(p => p.id === id ? { ...p, read: true } : p));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const unreadCount = pesan.filter(p => !p.read).length;

  // ── Page renderer ─────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activePage) {
      case 'beranda':
        return <Beranda peminjaman={peminjaman} pemetaan={pemetaan} />;
      case 'peminjaman':
        return <Peminjaman peminjaman={peminjaman} pemetaan={pemetaan} onSubmit={submitPeminjaman} showToast={showToast} />;
      case 'jadwal':
        return <Jadwal jadwal={jadwal} />;
      case 'pesan':
        return <Pesan pesan={pesan} onMarkRead={markPesanRead} peminjaman={peminjaman} />;
      case 'admin':
        return (
          <Admin
            peminjaman={peminjaman}
            pemetaan={pemetaan}
            jadwal={jadwal}
            onApproveReject={approveReject}
            onSendMessage={sendMessage}
            onSavePemetaan={savePemetaan}
            onSaveJadwal={saveJadwal}
            onDeleteJadwal={deleteJadwal}
            onLogout={handleAdminLogout}
            showToast={showToast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Admin Gate Modal */}
      {showAdminGate && (
        <AdminGate
          onLogin={handleAdminLogin}
          onCancel={() => setShowAdminGate(false)}
        />
      )}

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="overlay show" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        isAdmin={isAdmin}
        unreadCount={unreadCount}
        sidebarOpen={sidebarOpen}
        onNavigate={navigateTo}
      />

      {/* Mobile Topbar */}
      <Topbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />

      {/* Main Content */}
      <main className="main-content">
        {renderPage()}
      </main>

      {/* Toast */}
      <Toast toast={toast} />
    </>
  );
}