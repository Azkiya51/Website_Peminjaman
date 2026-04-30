-- ============================================================
-- SiPinjam — Supabase Database Schema
-- Jalankan SQL ini di Supabase SQL Editor
-- (https://app.supabase.com → Project → SQL Editor)
-- ============================================================

-- ===== TABLE: pemetaan =====
CREATE TABLE IF NOT EXISTS pemetaan (
  id         SERIAL PRIMARY KEY,
  kode       VARCHAR(10) UNIQUE NOT NULL,  -- e.g. '4.2', '4.10'
  nama       VARCHAR(100) NOT NULL,
  kapasitas  INTEGER NOT NULL DEFAULT 30,
  fasilitas  TEXT NOT NULL DEFAULT '',
  status     VARCHAR(20) NOT NULL DEFAULT 'available'
             CHECK (status IN ('available', 'maintenance', 'reserved', 'busy')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TABLE: jadwal =====
CREATE TABLE IF NOT EXISTS jadwal (
  id         SERIAL PRIMARY KEY,
  ruangan    VARCHAR(10) NOT NULL,
  hari       VARCHAR(10) NOT NULL
             CHECK (hari IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')),
  mulai      TIME NOT NULL,
  selesai    TIME NOT NULL,
  matkul     VARCHAR(100) NOT NULL,
  dosen      VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TABLE: peminjaman =====
CREATE TABLE IF NOT EXISTS peminjaman (
  id         SERIAL PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  nim        VARCHAR(20) NOT NULL,
  ruangan    VARCHAR(10) NOT NULL,
  tanggal    DATE NOT NULL,
  mulai      TIME NOT NULL,
  selesai    TIME NOT NULL,
  alasan     TEXT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TABLE: pesan =====
CREATE TABLE IF NOT EXISTS pesan (
  id            SERIAL PRIMARY KEY,
  pinjam_id     INTEGER REFERENCES peminjaman(id) ON DELETE SET NULL,
  subject       VARCHAR(200) NOT NULL,
  body          TEXT NOT NULL,
  status_pinjam VARCHAR(20),
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ===== SEED DATA: Pemetaan Default =====
-- ============================================================
INSERT INTO pemetaan (kode, nama, kapasitas, fasilitas, status) VALUES
  ('4.2',  'Lab Komputer Dasar', 30, 'AC, Komputer, Proyektor',          'available'),
  ('4.3',  'Lab Jaringan',       25, 'AC, Komputer, Server Rack',        'available'),
  ('4.4',  'Kelas Teori A',      40, 'AC, Proyektor, Whiteboard',        'available'),
  ('4.5',  'Kelas Teori B',      40, 'AC, Proyektor, Whiteboard',        'available'),
  ('4.6',  'Lab Multimedia',     28, 'AC, Komputer, Studio Mini',        'available'),
  ('4.7',  'Ruang Seminar',      60, 'AC, Proyektor, Podium, Sound',     'available'),
  ('4.8',  'Lab Pemrograman',    30, 'AC, Komputer, Internet',           'available'),
  ('4.9',  'Kelas Diskusi',      20, 'AC, TV, Whiteboard',               'available'),
  ('4.10', 'Lab Hardware',       25, 'AC, Perangkat HW, Alat Ukur',      'available')
ON CONFLICT (kode) DO NOTHING;

-- ============================================================
-- ===== SEED DATA: Jadwal Default =====
-- ============================================================
INSERT INTO jadwal (ruangan, hari, mulai, selesai, matkul, dosen) VALUES
  ('4.2',  'Senin',  '07:00', '09:00', 'Algoritma & Pemrograman',  'Dr. Andi Wijaya'),
  ('4.3',  'Senin',  '09:00', '11:00', 'Jaringan Komputer',        'Ir. Siti Rahayu, M.T.'),
  ('4.4',  'Selasa', '07:00', '09:00', 'Basis Data',               'Dr. Hendra Kusuma'),
  ('4.5',  'Selasa', '10:00', '12:00', 'Sistem Operasi',           'Dr. Maya Putri'),
  ('4.6',  'Rabu',   '13:00', '15:00', 'Desain Multimedia',        'M. Rizky, S.Kom, M.T.'),
  ('4.7',  'Rabu',   '08:00', '10:00', 'Seminar Proposal',         'Prof. Bambang S.'),
  ('4.8',  'Kamis',  '07:00', '09:00', 'Pemrograman Web',          'Dewi Lestari, M.Kom'),
  ('4.9',  'Kamis',  '11:00', '13:00', 'Metode Penelitian',        'Dr. Ahmad Fauzi'),
  ('4.10', 'Jumat',  '07:00', '09:00', 'Arsitektur Komputer',      'Ir. Budi Santoso'),
  ('4.2',  'Jumat',  '10:00', '12:00', 'Kecerdasan Buatan',        'Dr. Rina Maharani'),
  ('4.5',  'Sabtu',  '07:30', '09:30', 'Etika Profesi IT',         'Drs. Supono, M.Si'),
  ('4.3',  'Sabtu',  '10:00', '12:00', 'Keamanan Jaringan',        'Dr. Fajar Nugroho');

-- ============================================================
-- ===== ROW LEVEL SECURITY (opsional tapi dianjurkan) =====
-- ============================================================
-- Aktifkan RLS pada semua tabel
ALTER TABLE pemetaan   ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal     ENABLE ROW LEVEL SECURITY;
ALTER TABLE peminjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesan      ENABLE ROW LEVEL SECURITY;

-- Izinkan akses public (anon) untuk SELECT
CREATE POLICY "Public read pemetaan"   ON pemetaan   FOR SELECT USING (true);
CREATE POLICY "Public read jadwal"     ON jadwal     FOR SELECT USING (true);
CREATE POLICY "Public read peminjaman" ON peminjaman FOR SELECT USING (true);
CREATE POLICY "Public read pesan"      ON pesan      FOR SELECT USING (true);

-- Izinkan INSERT/UPDATE/DELETE hanya dari service_role (server backend)
-- Di server.js gunakan SUPABASE_SERVICE_ROLE_KEY untuk operasi write
CREATE POLICY "Service write pemetaan"   ON pemetaan   FOR ALL USING (true);
CREATE POLICY "Service write jadwal"     ON jadwal     FOR ALL USING (true);
CREATE POLICY "Service write peminjaman" ON peminjaman FOR ALL USING (true);
CREATE POLICY "Service write pesan"      ON pesan      FOR ALL USING (true);
