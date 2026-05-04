import { useState, useEffect } from 'react';

/**
 * SendMsgModal
 *
 * Props:
 *   pinjamId   – ID peminjaman yang akan dikirim pesannya
 *   peminjaman – Array semua data peminjaman (untuk menampilkan info konteks)
 *   onSend     – async (pinjamId, subject, body) => boolean
 *   onClose    – () => void
 */
export default function SendMsgModal({ pinjamId, peminjaman = [], onSend, onClose }) {
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);

  // Find context data for the selected pinjaman
  const record = peminjaman.find((p) => p.id === pinjamId);

  // Reset state when modal opens
  useEffect(() => {
    setSubject('');
    setBody('');
    setSending(false);
  }, [pinjamId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    const ok = await onSend(pinjamId, subject.trim(), body.trim());
    setSending(false);
    if (ok) onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        {/* Header */}
        <h3>
          <i className="ri-send-plane-2-line" style={{ color: 'var(--teal-500)' }} />
          Kirim Pesan
        </h3>

        {/* Context info */}
        {record && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--slate-50)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 16,
            fontSize: 13,
          }}>
            <i className="ri-user-3-line" style={{ color: 'var(--teal-500)', fontSize: 16 }} />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{record.nama_peminjam ?? '—'}</span>
              <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
                {record.ruangan ?? ''} · {record.tanggal ?? ''}
              </span>
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="form-group">
          <label className="form-label">Subjek</label>
          <input
            className="form-control"
            placeholder="Masukkan subjek pesan…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            autoFocus
            maxLength={120}
          />
        </div>

        {/* Body */}
        <div className="form-group">
          <label className="form-label">Isi Pesan</label>
          <textarea
            className="form-control"
            placeholder="Tulis pesan di sini…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            style={{ resize: 'vertical', minHeight: 110 }}
          />
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={sending}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!subject.trim() || !body.trim() || sending}
          >
            {sending
              ? <><i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> Mengirim…</>
              : <><i className="ri-send-plane-fill" /> Kirim</>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}