// pages/Jadwal.jsx
// Halaman jadwal kelas dengan filter ruangan & hari

import { useState, useMemo } from 'react';

const ROOMS = ['4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','4.10','4.11','4.12'];
const DAYS   = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

export default function Jadwal({ jadwal }) {
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterHari, setFilterHari] = useState('all');

  const filtered = useMemo(() => {
    let data = jadwal;
    if (filterRoom !== 'all') data = data.filter(j => j.ruangan === filterRoom);
    if (filterHari !== 'all') data = data.filter(j => j.hari === filterHari);
    return data;
  }, [jadwal, filterRoom, filterHari]);

  // Group by hari
  const grouped = useMemo(() => {
    const g = {};
    DAYS.forEach(d => { g[d] = filtered.filter(j => j.hari === d); });
    return g;
  }, [filtered]);

  return (
    <section className="page active" id="page-jadwal">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Jadwal Seluruh Kelas</h1>
          <p>Lihat jadwal penggunaan ruangan kelas 4.2 – 4.12</p>
        </div>
      </div>

      <div className="card">
        {/* Controls */}
        <div className="jadwal-controls">
          {/* Room tabs */}
          <div className="jadwal-filter">
            <label><i className="ph ph-door" /> Ruangan:</label>
            <div className="room-tabs">
              <button
                className={`room-tab ${filterRoom === 'all' ? 'active' : ''}`}
                onClick={() => setFilterRoom('all')}
              >
                Semua
              </button>
              {ROOMS.map(r => (
                <button
                  key={r}
                  className={`room-tab ${filterRoom === r ? 'active' : ''}`}
                  onClick={() => setFilterRoom(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Hari select */}
          <div className="jadwal-filter">
            <label><i className="ph ph-calendar-blank" /> Hari:</label>
            <select value={filterHari} onChange={e => setFilterHari(e.target.value)}>
              <option value="all">Semua Hari</option>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="jadwal-table-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <i className="ph-duotone ph-calendar-x" />
              <p>Tidak ada jadwal ditemukan</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Hari</th>
                  <th>Ruangan</th>
                  <th>Jam</th>
                  <th>Mata Kuliah</th>
                  <th>Dosen</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => {
                  const items = grouped[day];
                  if (!items || items.length === 0) return null;
                  return items.map((j, i) => (
                    <tr key={j.id}>
                      {i === 0 && (
                        <td
                          rowSpan={items.length}
                          style={{ fontWeight: 700, color: 'var(--teal-600)', background: 'var(--teal-50)' }}
                        >
                          {day}
                        </td>
                      )}
                      <td>
                        <span style={{ background: 'var(--teal-100)', color: 'var(--teal-700)', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                          Kelas {j.ruangan}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{j.mulai} – {j.selesai}</td>
                      <td>{j.matkul}</td>
                      <td style={{ color: 'var(--text-3)' }}>{j.dosen}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}