// ===== CONFIG =====
const API_BASE = 'http://localhost:3000/api';
const ADMIN_PASSWORD = 'Zeckganteng'; // Sama dengan di server.js

// ===== STATE =====
const state = {
  peminjaman: [],
  pesan: [],
  jadwal: [],
  pemetaan: {},
  isAdmin: false,
};

// ===== API HELPER =====
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
    showToast('❌ Gagal terhubung ke server', 'error');
    return null;
  }
}

// ===== INIT =====
async function init() {
  setupNav();
  setupMobile();
  setupAdminGate();

  await Promise.all([
    loadPemetaan(),
    loadJadwal(),
    loadPeminjaman(),
    loadPesan(),
  ]);

  renderBeranda();
  renderPemetaan();
  renderJadwal();
  renderPesan();
  renderAdminPermohonan();
  renderAdminJadwal();
  renderRiwayat();
  setupForm();
  setupAdminControls();
  updateBadges();
  setupJadwalFilters();
}

// ===== LOAD DATA FROM API =====
async function loadPemetaan() {
  const data = await apiFetch('/pemetaan');
  if (data) {
    state.pemetaan = {};
    data.forEach(r => { state.pemetaan[r.kode] = r; });
  }
}

async function loadJadwal() {
  const data = await apiFetch('/jadwal');
  if (data) state.jadwal = data;
}

async function loadPeminjaman() {
  const data = await apiFetch('/peminjaman');
  if (data) state.peminjaman = data;
}

async function loadPesan() {
  const data = await apiFetch('/pesan');
  if (data) state.pesan = data;
}

// ===== NAVIGATION =====
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async e => {
      e.preventDefault();
      const page = item.dataset.page;

      if (page === 'admin') {
        if (!state.isAdmin) {
          openAdminGate();
          return;
        }
      }

      navigateTo(page);
      if (page === 'pesan') await markPesanRead();
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  if (window.innerWidth < 900) closeSidebar();
}

function setupMobile() {
  const toggle  = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', closeSidebar);
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ===== ADMIN GATE =====
function setupAdminGate() {
  const gate      = document.getElementById('admin-gate');
  const input     = document.getElementById('admin-password-input');
  const submitBtn = document.getElementById('gate-submit');
  const cancelBtn = document.getElementById('gate-cancel');
  const togglePw  = document.getElementById('toggle-pw');
  const errEl     = document.getElementById('gate-error');

  submitBtn.addEventListener('click', () => {
    if (input.value === ADMIN_PASSWORD) {
      state.isAdmin = true;
      gate.classList.remove('show');
      input.value = '';
      errEl.classList.add('hidden');
      navigateTo('admin');
      showToast('✅ Masuk sebagai Admin', 'success');
    } else {
      errEl.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  });

  input.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });

  cancelBtn.addEventListener('click', () => {
    gate.classList.remove('show');
    input.value = '';
    errEl.classList.add('hidden');
  });

  togglePw.addEventListener('click', () => {
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    togglePw.innerHTML = isText ? '<i class="ph ph-eye"></i>' : '<i class="ph ph-eye-slash"></i>';
  });

  document.getElementById('btn-logout-admin')?.addEventListener('click', () => {
    state.isAdmin = false;
    navigateTo('beranda');
    showToast('ℹ️ Keluar dari panel admin', 'info');
  });
}

function openAdminGate() {
  document.getElementById('admin-gate').classList.add('show');
  setTimeout(() => document.getElementById('admin-password-input').focus(), 100);
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ===== BERANDA =====
function renderBeranda() {
  const pending  = state.peminjaman.filter(p => p.status === 'pending').length;
  const approved = state.peminjaman.filter(p => p.status === 'approved').length;
  const rejected = state.peminjaman.filter(p => p.status === 'rejected').length;
  document.getElementById('stat-pending').textContent  = pending;
  document.getElementById('stat-approved').textContent = approved;
  document.getElementById('stat-rejected').textContent = rejected;

  // Room chips
  const el = document.getElementById('beranda-rooms');
  const rooms = Object.keys(state.pemetaan);
  const label = { available: 'Tersedia', maintenance: 'Maintenance', reserved: 'Reservasi', busy: 'Dipakai' };
  el.innerHTML = rooms.map(r => {
    const d = state.pemetaan[r];
    const s = d.status;
    return `<div class="room-chip">
      <div class="room-chip-dot ${s}"></div>
      <div>
        <div class="room-chip-name">Kelas ${r}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${d.nama}</div>
      </div>
      <span class="room-chip-status">${label[s] || s}</span>
    </div>`;
  }).join('');

  // Recent
  const recentEl = document.getElementById('recent-list');
  if (state.peminjaman.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><i class="ph-duotone ph-folder-open"></i><p>Belum ada peminjaman</p></div>`;
  } else {
    const recent = [...state.peminjaman].reverse().slice(0, 6);
    const sIcon = { pending:'<i class="ph-fill ph-hourglass-medium" style="color:var(--amber-500)"></i>', approved:'<i class="ph-fill ph-check-circle" style="color:var(--emerald-500)"></i>', rejected:'<i class="ph-fill ph-x-circle" style="color:var(--rose-500)"></i>' };
    const sLabel = { pending:'Menunggu', approved:'Disetujui', rejected:'Ditolak' };
    recentEl.innerHTML = recent.map(p => `
      <div class="recent-item">
        <div class="ri-top">
          <span class="ri-name">${p.nama}</span>
          <span class="ri-nim">${p.nim}</span>
        </div>
        <div class="ri-info">
          <i class="ph ph-door" style="font-size:13px"></i> Kelas ${p.ruangan} &nbsp;·&nbsp;
          <i class="ph ph-calendar" style="font-size:13px"></i> ${p.tanggal} &nbsp;·&nbsp;
          ${sIcon[p.status] || ''} ${sLabel[p.status] || p.status}
        </div>
      </div>`).join('');
  }
}

// ===== FORM PEMINJAMAN =====
function setupForm() {
  document.getElementById('f-tanggal').min = new Date().toISOString().split('T')[0];
  document.getElementById('btn-pinjam').addEventListener('click', submitPeminjaman);

  document.getElementById('cek-ruangan').addEventListener('change', function () {
    const r = this.value;
    const res = document.getElementById('cek-result');
    if (!r) { res.className = 'cek-result hidden'; return; }
    const peta = state.pemetaan[r];
    if (!peta) return;
    const statusText = { available: '✅ Tersedia untuk dipinjam', maintenance: '⚠️ Sedang maintenance', reserved: '🔒 Reservasi tetap', busy: '🔴 Sedang digunakan' };
    res.textContent = statusText[peta.status] || peta.status;
    res.className = 'cek-result ' + (peta.status === 'available' ? 'available' : 'busy');
  });
}

async function submitPeminjaman() {
  const nama    = document.getElementById('f-nama').value.trim();
  const nim     = document.getElementById('f-nim').value.trim();
  const ruangan = document.getElementById('f-ruangan').value;
  const tanggal = document.getElementById('f-tanggal').value;
  const mulai   = document.getElementById('f-mulai').value;
  const selesai = document.getElementById('f-selesai').value;
  const alasan  = document.getElementById('f-alasan').value.trim();

  if (!nama || !nim || !ruangan || !tanggal || !mulai || !selesai || !alasan) {
    showToast('⚠️ Harap isi semua field!', 'error'); return;
  }
  if (mulai >= selesai) {
    showToast('⚠️ Jam selesai harus lebih dari jam mulai!', 'error'); return;
  }

  const result = await apiFetch('/peminjaman', {
    method: 'POST',
    body: JSON.stringify({ nama, nim, ruangan, tanggal, mulai, selesai, alasan }),
  });

  if (result) {
    ['f-nama','f-nim','f-ruangan','f-tanggal','f-mulai','f-selesai','f-alasan'].forEach(id => {
      document.getElementById(id).value = '';
    });
    await loadPeminjaman();
    renderBeranda();
    renderRiwayat();
    renderAdminPermohonan();
    updateBadges();
    showToast('✅ Permohonan berhasil diajukan!', 'success');
  }
}

function renderRiwayat() {
  const el = document.getElementById('riwayat-list');
  if (state.peminjaman.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="ph-duotone ph-folder-open"></i><p>Belum ada riwayat</p></div>`;
    return;
  }
  const sLabel = { pending:'Menunggu', approved:'Disetujui', rejected:'Ditolak' };
  const rows = [...state.peminjaman].reverse().map(p => `<tr>
    <td>${p.id}</td>
    <td>${p.nama}</td>
    <td>${p.nim}</td>
    <td>Kelas ${p.ruangan}</td>
    <td>${p.tanggal}</td>
    <td>${p.mulai} – ${p.selesai}</td>
    <td><span class="status-badge ${p.status}">${sLabel[p.status]||p.status}</span></td>
    <td style="font-size:12px;color:var(--text-3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.alasan}</td>
  </tr>`).join('');
  el.innerHTML = `<table><thead><tr><th>#</th><th>Nama</th><th>NIM</th><th>Ruangan</th><th>Tanggal</th><th>Waktu</th><th>Status</th><th>Alasan</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ===== JADWAL =====
function renderJadwal(filterRoom = 'all', filterHari = 'all') {
  const wrap = document.getElementById('jadwal-table-wrap');
  const days = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  let filtered = state.jadwal;
  if (filterRoom !== 'all') filtered = filtered.filter(j => j.ruangan === filterRoom);
  if (filterHari !== 'all') filtered = filtered.filter(j => j.hari === filterHari);

  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><i class="ph-duotone ph-calendar-x"></i><p>Tidak ada jadwal ditemukan</p></div>`;
    return;
  }

  const grouped = {};
  days.forEach(d => { grouped[d] = filtered.filter(j => j.hari === d); });

  let html = `<table><thead><tr><th>Hari</th><th>Ruangan</th><th>Jam</th><th>Mata Kuliah</th><th>Dosen</th></tr></thead><tbody>`;
  days.forEach(day => {
    const items = grouped[day];
    if (!items || items.length === 0) return;
    items.forEach((j, i) => {
      html += `<tr>
        ${i === 0 ? `<td rowspan="${items.length}" style="font-weight:700;color:var(--teal-600);background:var(--teal-50)">${day}</td>` : ''}
        <td><span style="background:var(--teal-100);color:var(--teal-700);padding:3px 10px;border-radius:6px;font-weight:700;font-size:12px">Kelas ${j.ruangan}</span></td>
        <td style="white-space:nowrap;font-weight:600">${j.mulai} – ${j.selesai}</td>
        <td>${j.matkul}</td>
        <td style="color:var(--text-3)">${j.dosen}</td>
      </tr>`;
    });
  });
  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

function setupJadwalFilters() {
  document.getElementById('room-tabs').addEventListener('click', e => {
    if (!e.target.classList.contains('room-tab')) return;
    document.querySelectorAll('.room-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    renderJadwal(e.target.dataset.room, document.getElementById('filter-hari').value);
  });
  document.getElementById('filter-hari').addEventListener('change', function () {
    const activeRoom = document.querySelector('.room-tab.active')?.dataset.room || 'all';
    renderJadwal(activeRoom, this.value);
  });
}

// ===== PESAN =====
function renderPesan() {
  const el = document.getElementById('pesan-items');
  document.getElementById('pesan-count').textContent = state.pesan.length;

  if (state.pesan.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="ph-duotone ph-envelope-open"></i><p>Belum ada pesan</p></div>`;
    return;
  }
  el.innerHTML = [...state.pesan].reverse().map(p => `
    <div class="pesan-item ${!p.read ? 'unread' : ''}" data-id="${p.id}" onclick="showPesanDetail(${p.id})">
      <div class="pi-top">
        <span class="pi-title">${p.subject}</span>
        <span class="pi-time">${new Date(p.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
      </div>
      <div class="pi-preview">${p.body.substring(0, 60)}...</div>
    </div>`).join('');
}

async function showPesanDetail(id) {
  const p = state.pesan.find(x => x.id === id);
  if (!p) return;

  if (!p.read) {
    await apiFetch(`/pesan/${id}/read`, { method: 'PATCH' });
    p.read = true;
    updateBadges();
  }

  document.querySelectorAll('.pesan-item').forEach(el => el.classList.remove('active-msg'));
  const itemEl = document.querySelector(`.pesan-item[data-id="${id}"]`);
  if (itemEl) { itemEl.classList.add('active-msg'); itemEl.classList.remove('unread'); }

  const statusMap = { pending:'Menunggu', approved:'Disetujui', rejected:'Ditolak' };
  const sClass = { pending:'pending', approved:'approved', rejected:'rejected' };
  document.getElementById('pesan-detail').innerHTML = `
    <div class="msg-detail-header">
      <h3>${p.subject}</h3>
      <div class="msg-detail-meta"><i class="ph ph-user-circle"></i> Dari: Admin &nbsp;·&nbsp; <i class="ph ph-clock"></i> ${new Date(p.created_at).toLocaleString('id-ID')}</div>
    </div>
    <div class="msg-detail-body">${p.body}</div>
    ${p.pinjam_id ? `<div class="msg-status-box">
      <i class="ph-duotone ph-info" style="color:var(--teal-500);font-size:16px"></i>
      <strong>Status Peminjaman #${p.pinjam_id}:</strong>
      <span class="status-badge ${sClass[p.status_pinjam]}" style="margin-left:6px">${statusMap[p.status_pinjam] || p.status_pinjam}</span>
    </div>` : ''}
  `;
}

async function markPesanRead() {
  await apiFetch('/pesan/read-all', { method: 'PATCH' });
  state.pesan.forEach(p => p.read = true);
  updateBadges();
}

function updateBadges() {
  const unread = state.pesan.filter(p => !p.read).length;
  const badge = document.getElementById('msg-badge');
  badge.textContent = unread;
  badge.classList.toggle('hidden', unread === 0);
}

// ===== ADMIN CONTROLS =====
function setupAdminControls() {
  document.querySelectorAll('.atab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.atab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById('apanel-' + t.dataset.atab).classList.add('active');
    });
  });
  document.getElementById('btn-save-peta').addEventListener('click', savePemetaan);
  document.getElementById('btn-save-jadwal').addEventListener('click', saveJadwalAdmin);
}

// ===== ADMIN: PERMOHONAN =====
function renderAdminPermohonan() {
  const el = document.getElementById('admin-permohonan-list');
  if (state.peminjaman.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="ph-duotone ph-folder-open"></i><p>Belum ada permohonan</p></div>`;
    return;
  }
  const sLabel = { pending:'Menunggu', approved:'Disetujui', rejected:'Ditolak' };
  const rows = [...state.peminjaman].reverse().map(p => `<tr>
    <td>${p.id}</td>
    <td><strong>${p.nama}</strong><br><small style="color:var(--text-3)">${p.nim}</small></td>
    <td>Kelas ${p.ruangan}</td>
    <td>${p.tanggal}<br><small>${p.mulai}–${p.selesai}</small></td>
    <td style="max-width:160px;font-size:12px">${p.alasan}</td>
    <td><span class="status-badge ${p.status}">${sLabel[p.status]||p.status}</span></td>
    <td>
      ${p.status === 'pending' ? `
        <button class="btn-sm btn-approve" onclick="approveReject(${p.id},'approved')"><i class="ph ph-check"></i> Setuju</button>
        <button class="btn-sm btn-reject"  onclick="approveReject(${p.id},'rejected')"><i class="ph ph-x"></i> Tolak</button>
      ` : `<button class="btn-sm btn-msg" onclick="openSendMsg(${p.id})"><i class="ph ph-paper-plane-tilt"></i> Pesan</button>`}
    </td>
  </tr>`).join('');
  el.innerHTML = `<table><thead><tr><th>#</th><th>Peminjam</th><th>Ruangan</th><th>Waktu</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function approveReject(id, action) {
  const result = await apiFetch(`/peminjaman/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: action }),
  });
  if (result) {
    await Promise.all([loadPeminjaman(), loadPesan()]);
    renderBeranda();
    renderAdminPermohonan();
    renderPesan();
    updateBadges();
    showToast(action === 'approved' ? '✅ Peminjaman disetujui!' : '❌ Peminjaman ditolak!', action === 'approved' ? 'success' : 'error');
  }
}

function openSendMsg(pinjamId) {
  const p = state.peminjaman.find(x => x.id === pinjamId);
  if (!p) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3><i class="ph-duotone ph-paper-plane-tilt" style="color:var(--teal-500)"></i> Kirim Pesan ke ${p.nama}</h3>
      <div class="form-group"><label>Subjek</label>
        <input type="text" id="msg-subject" value="Re: Peminjaman Kelas ${p.ruangan}" /></div>
      <div class="form-group"><label>Pesan</label>
        <textarea id="msg-body" rows="5" placeholder="Tulis pesan..."></textarea></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Batal</button>
        <button class="btn-primary" style="margin-top:0" onclick="sendCustomMsg(${pinjamId},this)">
          <i class="ph ph-paper-plane-tilt"></i> Kirim
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function sendCustomMsg(pinjamId, btn) {
  const subject = document.getElementById('msg-subject').value.trim();
  const body    = document.getElementById('msg-body').value.trim();
  if (!subject || !body) { showToast('⚠️ Isi subjek dan pesan!', 'error'); return; }

  const result = await apiFetch('/pesan', {
    method: 'POST',
    body: JSON.stringify({ pinjam_id: pinjamId, subject, body }),
  });
  if (result) {
    btn.closest('.modal-overlay').remove();
    await loadPesan();
    renderPesan();
    updateBadges();
    showToast('✅ Pesan berhasil dikirim!', 'success');
  }
}

// ===== PEMETAAN =====
function renderPemetaan() {
  const el = document.getElementById('peta-list');
  const statusColor = { available:'var(--emerald-500)', maintenance:'var(--amber-500)', reserved:'var(--rose-500)' };
  el.innerHTML = Object.entries(state.pemetaan).map(([code, d]) => `
    <div class="room-map-item">
      <div class="rmi-code">${code}</div>
      <div class="rmi-info">
        <div class="rmi-name">${d.nama}</div>
        <div class="rmi-detail"><i class="ph ph-users" style="font-size:11px"></i> ${d.kapasitas} kursi &nbsp;·&nbsp; ${d.fasilitas}</div>
      </div>
      <div style="width:9px;height:9px;border-radius:50%;background:${statusColor[d.status]||'#ccc'};flex-shrink:0"></div>
      <div class="rmi-actions">
        <button class="btn-sm btn-msg" onclick="editPemetaan('${code}')"><i class="ph ph-pencil-simple"></i></button>
      </div>
    </div>`).join('');
}

function editPemetaan(code) {
  const d = state.pemetaan[code];
  if (!d) return;
  document.getElementById('peta-ruangan').value   = code;
  document.getElementById('peta-nama').value      = d.nama;
  document.getElementById('peta-kapasitas').value = d.kapasitas;
  document.getElementById('peta-fasilitas').value = d.fasilitas;
  document.getElementById('peta-status').value    = d.status;
}

async function savePemetaan() {
  const kode      = document.getElementById('peta-ruangan').value;
  const nama      = document.getElementById('peta-nama').value.trim();
  const kapasitas = parseInt(document.getElementById('peta-kapasitas').value);
  const fasilitas = document.getElementById('peta-fasilitas').value.trim();
  const status    = document.getElementById('peta-status').value;

  if (!nama || !kapasitas || !fasilitas) { showToast('⚠️ Harap isi semua data!', 'error'); return; }

  const result = await apiFetch('/pemetaan', {
    method: 'POST',
    body: JSON.stringify({ kode, nama, kapasitas, fasilitas, status }),
  });
  if (result) {
    await loadPemetaan();
    renderPemetaan();
    renderBeranda();
    showToast(`✅ Pemetaan Kelas ${kode} disimpan!`, 'success');
  }
}

// ===== JADWAL ADMIN =====
async function saveJadwalAdmin() {
  const ruangan = document.getElementById('aj-ruangan').value;
  const hari    = document.getElementById('aj-hari').value;
  const mulai   = document.getElementById('aj-mulai').value;
  const selesai = document.getElementById('aj-selesai').value;
  const matkul  = document.getElementById('aj-matkul').value.trim();
  const dosen   = document.getElementById('aj-dosen').value.trim();

  if (!mulai || !selesai || !matkul || !dosen) { showToast('⚠️ Harap isi semua field!', 'error'); return; }
  if (mulai >= selesai) { showToast('⚠️ Jam selesai harus lebih dari jam mulai!', 'error'); return; }

  const result = await apiFetch('/jadwal', {
    method: 'POST',
    body: JSON.stringify({ ruangan, hari, mulai, selesai, matkul, dosen }),
  });
  if (result) {
    await loadJadwal();
    renderJadwal();
    renderAdminJadwal();
    showToast(`✅ Jadwal Kelas ${ruangan} – ${hari} ditambahkan!`, 'success');
  }
}

function renderAdminJadwal() {
  const el = document.getElementById('admin-jadwal-list');
  if (state.jadwal.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="ph-duotone ph-calendar-x"></i><p>Belum ada jadwal</p></div>`;
    return;
  }
  const rows = state.jadwal.map(j => `
    <tr>
      <td><span style="background:var(--teal-100);color:var(--teal-700);padding:3px 10px;border-radius:6px;font-weight:700;font-size:12px">Kelas ${j.ruangan}</span></td>
      <td>${j.hari}</td>
      <td>${j.mulai} – ${j.selesai}</td>
      <td>${j.matkul}</td>
      <td style="color:var(--text-3)">${j.dosen}</td>
      <td><button class="btn-sm btn-del" onclick="deleteJadwal(${j.id})"><i class="ph ph-trash"></i></button></td>
    </tr>`).join('');
  el.innerHTML = `<table><thead><tr><th>Ruangan</th><th>Hari</th><th>Jam</th><th>Mata Kuliah</th><th>Dosen</th><th>Hapus</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function deleteJadwal(id) {
  const result = await apiFetch(`/jadwal/${id}`, { method: 'DELETE' });
  if (result !== null) {
    await loadJadwal();
    renderJadwal();
    renderAdminJadwal();
    showToast('🗑️ Jadwal dihapus', 'info');
  }
}

// ===== RUN =====
document.addEventListener('DOMContentLoaded', init);
