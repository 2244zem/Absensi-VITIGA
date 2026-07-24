Skrip SQL yang kamu tulis sudah sangat bagus dan terstruktur! Namun, agar 100% siap dipakai di Supabase (Production Ready), ada 2 komponen krusial yang perlu ditambahkan:

Row Level Security (RLS) & Policies: Di Supabase, RLS wajib diaktifkan agar data tidak bisa diakses secara bebas dari frontend/API client.

Dukungan office_id pada Trigger: Agar saat Admin buat akun baru di Supabase Auth dengan metadata office_id, lokasinya langsung terhubung otomatis ke tabel profiles.

Storage Bucket Script: Kebijakan akses untuk bucket penyimpanan foto/dokumen surat dokter (medical-documents).

Skrip SQL Lengkap Supabase (Termasuk RLS Policies & Storage)
Silakan salin skrip utuh di bawah ini dan jalankan langsung di SQL Editor Supabase:

SQL
-- ==========================================
-- 1. ENUM TYPES CREATION
-- ==========================================
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE attendance_status AS ENUM ('hadir', 'hadir_lembur', 'sakit', 'izin');

-- ==========================================
-- 2. TABLES CREATION
-- ==========================================

-- TABEL: OFFICES
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABEL: PROFILES (Extension 1-to-1 dari auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABEL: QR_SESSIONS (Sesi Token QR Dinamis Kantor)
CREATE TABLE qr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABEL: ATTENDANCES (Transaksi Presensi Karyawan)
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
    check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out TIMESTAMP WITH TIME ZONE,
    status attendance_status NOT NULL DEFAULT 'hadir',
    is_overtime BOOLEAN DEFAULT FALSE,
    checkin_lat DOUBLE PRECISION,
    checkin_lng DOUBLE PRECISION,
    proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==========================================
CREATE INDEX idx_profiles_office_id ON profiles(office_id);
CREATE INDEX idx_qr_sessions_token ON qr_sessions(token);
CREATE INDEX idx_qr_sessions_office_id ON qr_sessions(office_id);
CREATE INDEX idx_attendances_user_id ON attendances(user_id);
CREATE INDEX idx_attendances_office_id ON attendances(office_id);
CREATE INDEX idx_attendances_created_at ON attendances(created_at);

-- ==========================================
-- 4. SEED DATA INITIAL OFFICES
-- ==========================================
INSERT INTO offices (name, address, latitude, longitude, radius_meters) VALUES
('Kantor Bandung', 'Jl. Setra Dago Bar. No.9, Antapani Kulon, Kec. Antapani, Kota Bandung, Jawa Barat 40291', -6.91101, 107.65880, 150),
('Kantor Bantul', '69F2+R78 Perumahan Taman Griya Indah VI Blok D No.8A, Kembang, Ngestiharjo, Kec. Kasihan, Kabupaten Bantul, Daerah Istimewa Yogyakarta 55184', -7.774667459372824, 110.35088313068701, 150),
('Kantor Jakarta Utara', 'Jl. Janur Elok VI Blok QE13 No.5, Klp. Gading Bar., Kec. Klp. Gading, Jakarta Utara 14240', -6.147154900526737, 106.90235294503209, 150),
('Kantor Surabaya', 'Central Park Ahmad Yani Residence Kav. 5, Kec. Gayungan, Surabaya, Jawa Timur 60231', -7.321009344809286, 112.72827778011273, 150);

-- ==========================================
-- 5. AUTOMATIC PROFILE CREATION TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, office_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'::user_role),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'office_id') IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'office_id')::uuid 
      ELSE NULL 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Helper Function untuk cek apakah user adalah Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- POLICIES: OFFICES ---
CREATE POLICY "Semua user terautentikasi bisa membaca lokasi kantor"
ON offices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hanya Admin yang bisa kelola kantor"
ON offices FOR ALL TO authenticated USING (is_admin());

-- --- POLICIES: PROFILES ---
CREATE POLICY "User bisa melihat profil sendiri atau Admin bisa lihat semua"
ON profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR is_admin());

CREATE POLICY "User bisa update profil sendiri atau Admin bisa update semua"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR is_admin());

-- --- POLICIES: QR_SESSIONS ---
CREATE POLICY "Semua user terautentikasi bisa membaca QR Session active"
ON qr_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hanya Admin yang bisa membuat dan menghapus QR Session"
ON qr_sessions FOR ALL TO authenticated USING (is_admin());

-- --- POLICIES: ATTENDANCES ---
CREATE POLICY "Karyawan bisa melihat data presensi sendiri, Admin bisa melihat semua"
ON attendances FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Karyawan bisa mencatat presensi/izin milik sendiri"
ON attendances FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Karyawan bisa update absen pulang sendiri, Admin bisa update semua"
ON attendances FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_admin());

-- ==========================================
-- 7. SUPABASE STORAGE SETUP (MEDICAL PROOF)
-- ==========================================

-- Buat Bucket untuk menyimpan berkas/foto surat dokter
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "User authenticated bisa upload bukti surat sakit/izin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-documents');

CREATE POLICY "User dan Admin bisa melihat berkas bukti"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-documents');
Cara Menjalankannya di Supabase:
Buka Dashboard Supabase proyek kamu.

Klik menu SQL Editor pada navigasi sebelah kiri.

Klik New Query, tempel seluruh isi skrip SQL di atas.

Klik tombol Run.