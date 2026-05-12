// pages/Pesan.jsx
// Halaman kotak pesan dari admin

import { useState } from 'react';

const STATUS_MAP   = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const STATUS_CLASS = { pending: 'pending',  approved: 'approved',  rejected: 'rejected' };

function formatDate(str) {
  return new Date(str).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function Pesan({ pesan, onMarkRead, peminjaman }) {
  const [selectedId, setSelectedId] = useState(null);

  const selected = pesan.find(p => p.id === selectedId);

  const handleSelect = async (id) => {
    setSelectedId(id);
    const msg = pesan.find(p => p.id === id);
    if (msg && !msg.read) await onMarkRead(id);
  };

  // Find related peminjaman entry
  const relatedPinjam = selected?.pinjam_id
    ? peminjaman.find(p => p.id === selected.pinjam_id)
    : null;

  return (
    <section className="page active" id="page-pesan">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Kotak Pesan</h1>
          <p>Pesan dari admin terkait status peminjaman Anda</p>
        </div>
      </div>

      <div className="pesan-layout">
        {/* ── List ──────────────────────────────────────────── */}
        <div className="pesan-list-col card" id="pesan-list">
          <div className="pesan-header-row">
            <span><i className="ph ph-tray" /> Semua Pesan</span>
            <span className="badge-accent">{pesan.length}</span>
          </div>
          <div id="pesan-items">
            {pesan.length === 0 ? (
              <div className="empty-state">
                <i className="ph-duotone ph-envelope-open" />
                <p>Belum ada pesan</p>
              </div>
            ) : (
              [...pesan].reverse().map(p => (
                <div
                  key={p.id}
                  className={`pesan-item ${!p.read ? 'unread' : ''} ${selectedId === p.id ? 'active-msg' : ''}`}
                  onClick={() => handleSelect(p.id)}
                >
                  <div className="pi-top">
                    <span className="pi-title">{p.subject}</span>
                    <span className="pi-time">{formatDate(p.created_at)}</span>
                  </div>
                  <div className="pi-preview">{p.body.substring(0, 60)}...</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Detail ────────────────────────────────────────── */}
        <div className="pesan-detail-col card" id="pesan-detail">
          {!selected ? (
            <div className="empty-state tall">
              <i className="ph-duotone ph-chat-dots" />
              <p>Pilih pesan untuk melihat detail</p>
            </div>
          ) : (
            <>
              <div className="msg-detail-header">
                <h3>{selected.subject}</h3>
                <div className="msg-detail-meta">
                  <i className="ph ph-user-circle" /> Dari: Admin &nbsp;·&nbsp;
                  <i className="ph ph-clock" /> {new Date(selected.created_at).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="msg-detail-body">{selected.body}</div>

              {relatedPinjam && (
                <div className="msg-status-box">
                  <i className="ph-duotone ph-info" style={{ color: 'var(--teal-500)', fontSize: '16px' }} />
                  <div>
                    <strong>Status Peminjaman :</strong>
                    <span
                      className={`status-badge ${STATUS_CLASS[relatedPinjam.status]}`}
                      style={{ marginLeft: '6px' }}
                    >
                      {STATUS_MAP[relatedPinjam.status] || relatedPinjam.status}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}