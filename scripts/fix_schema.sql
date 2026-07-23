-- ==========================================
-- FIX TRIGGER: Drop & Recreate handle_new_user
-- ==========================================

-- Drop trigger & function lama
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Buat ulang function (lebih robust, handle NULL metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_full_name text;
  v_role text;
  v_office_id text;
BEGIN
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_role := NEW.raw_user_meta_data->>'role';
  v_office_id := NEW.raw_user_meta_data->>'office_id';

  INSERT INTO public.profiles (id, full_name, role, office_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(v_full_name, ''), NEW.email, 'Unknown'),
    COALESCE(NULLIF(v_role, ''), 'employee'),
    NULLIF(v_office_id, '')::uuid
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error tapi jangan gagalkan user creation
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Pasang trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- ALTER TABLE: pastikan role column TEXT
-- ==========================================
ALTER TABLE public.profiles 
  ALTER COLUMN role TYPE text USING role::text,
  ALTER COLUMN role SET DEFAULT 'employee';

-- ==========================================
-- RLS POLICIES (jika belum ada)
-- ==========================================
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Offices
DROP POLICY IF EXISTS "Semua user terautentikasi bisa membaca lokasi kantor" ON offices;
CREATE POLICY "Semua user terautentikasi bisa membaca lokasi kantor"
ON offices FOR SELECT TO authenticated USING (true);

-- Profiles
DROP POLICY IF EXISTS "User bisa melihat profil sendiri atau Admin bisa lihat semua" ON profiles;
CREATE POLICY "User bisa melihat profil sendiri atau Admin bisa lihat semua"
ON profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR is_admin());

-- Attendances
DROP POLICY IF EXISTS "Karyawan bisa melihat data presensi sendiri" ON attendances;
CREATE POLICY "Karyawan bisa melihat data presensi sendiri"
ON attendances FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Karyawan bisa mencatat presensi" ON attendances;
CREATE POLICY "Karyawan bisa mencatat presensi"
ON attendances FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- QR Sessions
DROP POLICY IF EXISTS "Semua user bisa membaca QR" ON qr_sessions;
CREATE POLICY "Semua user bisa membaca QR"
ON qr_sessions FOR SELECT TO authenticated USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- BUAT AKUN DEMO VIA API (gunakan seed.mjs)
-- ==========================================
-- Setelah menjalankan SQL di atas, jalankan:
-- node scripts/seed.mjs
  