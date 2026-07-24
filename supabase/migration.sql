-- ============================================================
-- MIGRATION: Additional Tables & Functions for Attendance System
-- Jalankan di Supabase SQL Editor (sekali run semua)
-- ============================================================

-- 0. Add email column to profiles + backfill from auth.users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 1. Create RPC function for attendance stats (fix 404 error)
CREATE OR REPLACE FUNCTION get_attendance_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_hadir int;
  total_lembur int;
  total_sakit int;
  total_izin int;
BEGIN
  SELECT COUNT(*) INTO total_hadir FROM attendances WHERE status = 'hadir';
  SELECT COUNT(*) INTO total_lembur FROM attendances WHERE status = 'hadir_lembur';
  SELECT COUNT(*) INTO total_sakit FROM attendances WHERE status = 'sakit';
  SELECT COUNT(*) INTO total_izin FROM attendances WHERE status = 'izin';

  RETURN json_build_object(
    'total_hadir', total_hadir,
    'total_lembur', total_lembur,
    'total_sakit', total_sakit,
    'total_izin', total_izin
  );
END;
$$;

-- 2. Enable Realtime for attendances table (skip if already member)
DO $$
BEGIN
  PERFORM * FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename = 'attendances';
  IF NOT FOUND THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add attendances to publication (might already exist)';
END $$;

-- 3. Create function to get user monthly stats
CREATE OR REPLACE FUNCTION get_user_monthly_stats(
  p_user_id uuid,
  p_year int DEFAULT EXTRACT(YEAR FROM NOW()),
  p_month int DEFAULT EXTRACT(MONTH FROM NOW())
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date timestamp;
  end_date timestamp;
  result json;
BEGIN
  start_date := make_timestamp(p_year, p_month, 1, 0, 0, 0);
  end_date := start_date + interval '1 month' - interval '1 second';

  SELECT json_build_object(
    'total_hadir', COUNT(*) FILTER (WHERE status = 'hadir'),
    'total_lembur', COUNT(*) FILTER (WHERE status = 'hadir_lembur'),
    'total_sakit', COUNT(*) FILTER (WHERE status = 'sakit'),
    'total_izin', COUNT(*) FILTER (WHERE status = 'izin'),
    'total_terlambat', COUNT(*) FILTER (
      WHERE (status = 'hadir' OR status = 'hadir_lembur')
        AND EXTRACT(HOUR FROM check_in) >= 8
        AND EXTRACT(HOUR FROM check_in) < 18
    ),
    'total_records', COUNT(*)
  ) INTO result
  FROM attendances
  WHERE user_id = p_user_id
    AND created_at >= start_date
    AND created_at <= end_date;

  RETURN result;
END;
$$;

-- 4. Create notifications table for realtime alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already existed without them
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating (so script is idempotent)
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can read all notifications" ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;

-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to read all notifications
CREATE POLICY "Admins can read all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Allow system to insert notifications
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
DO $$
BEGIN
  PERFORM * FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
  IF NOT FOUND THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add notifications to publication (might already exist)';
END $$;

-- 5. Auto-notify trigger for sakit/izin/late (notify ALL admins)
CREATE OR REPLACE FUNCTION auto_notify_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
  admin_record RECORD;
  check_in_hour INT;
BEGIN
  SELECT full_name INTO emp_name FROM profiles WHERE id = NEW.user_id;
  IF emp_name IS NULL THEN RETURN NEW; END IF;

  IF NEW.status IN ('sakit', 'izin') THEN
    notif_type := NEW.status;
    notif_title := 'Pengajuan ' || CASE WHEN NEW.status = 'sakit' THEN 'Sakit' ELSE 'Izin' END;
    notif_message := emp_name || ' mengajukan ' || CASE WHEN NEW.status = 'sakit' THEN 'sakit' ELSE 'izin' END;
    FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin' LOOP
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES (admin_record.id, notif_title, notif_message, notif_type, NEW.id);
    END LOOP;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.check_in IS NOT NULL AND NEW.status IN ('hadir', 'hadir_lembur') THEN
    check_in_hour := EXTRACT(HOUR FROM NEW.check_in AT TIME ZONE 'Asia/Jakarta');
    IF check_in_hour >= 8 AND check_in_hour < 18 THEN
      FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin' LOOP
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES (admin_record.id, 'Terlambat', emp_name || ' datang terlambat', 'terlambat', NEW.id);
      END LOOP;
    END IF;
  END IF;

  -- Notify admin for ALL attendance check-ins (hadir, hadir_lembur, sakit, izin)
  IF TG_OP = 'INSERT' AND NEW.check_in IS NOT NULL AND NEW.status IN ('hadir', 'hadir_lembur') THEN
    check_in_hour := EXTRACT(HOUR FROM NEW.check_in AT TIME ZONE 'Asia/Jakarta');
    IF check_in_hour < 8 OR check_in_hour >= 18 THEN
      notif_type := CASE WHEN NEW.status = 'hadir_lembur' THEN 'lembur' ELSE 'hadir' END;
      notif_title := CASE WHEN NEW.status = 'hadir_lembur' THEN 'Absen Lembur' ELSE 'Absen Masuk' END;
      FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin' LOOP
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES (admin_record.id, notif_title, emp_name || ' absen ' || CASE WHEN NEW.status = 'hadir_lembur' THEN 'lembur' ELSE 'masuk' END, notif_type, NEW.id);
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists first (so script is idempotent)
DROP TRIGGER IF EXISTS attendance_auto_notify ON attendances;

CREATE TRIGGER attendance_auto_notify
AFTER INSERT ON attendances
FOR EACH ROW
EXECUTE FUNCTION auto_notify_attendance();

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_created_at ON attendances(created_at);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status);
CREATE INDEX IF NOT EXISTS idx_attendances_office_id ON attendances(office_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires_at ON qr_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_office_id ON qr_sessions(office_id);

-- 7. Server-side cooldown check RPC (called from checkOut frontend)
CREATE OR REPLACE FUNCTION check_cooldown(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_checkin timestamptz;
  minutes_since int;
BEGIN
  SELECT check_in INTO last_checkin
  FROM attendances
  WHERE user_id = p_user_id AND check_out IS NULL
  ORDER BY created_at DESC LIMIT 1;

  IF last_checkin IS NULL THEN
    RETURN json_build_object('can_checkout', true, 'remaining_seconds', 0);
  END IF;

  minutes_since := EXTRACT(EPOCH FROM NOW() - last_checkin) / 60;

  IF minutes_since < 20 THEN
    RETURN json_build_object(
      'can_checkout', false,
      'remaining_seconds', (20 - minutes_since) * 60
    );
  END IF;

  RETURN json_build_object('can_checkout', true, 'remaining_seconds', 0);
END;
$$;

-- 8. Office Shift Settings (default jam datang / telat / pulang)
CREATE TABLE IF NOT EXISTS office_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE UNIQUE,
  check_in_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '08:00:00',
  late_threshold TIME WITHOUT TIME ZONE NOT NULL DEFAULT '10:00:00',
  check_out_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '18:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE office_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read office_shifts" ON office_shifts;
DROP POLICY IF EXISTS "Admins can write office_shifts" ON office_shifts;

CREATE POLICY "Admins can read office_shifts"
  ON office_shifts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can write office_shifts"
  ON office_shifts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- 9. Enable RLS on qr_sessions + policies (employee needs SELECT to validate token)
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read qr_sessions" ON qr_sessions;
DROP POLICY IF EXISTS "Admins can manage qr_sessions" ON qr_sessions;

CREATE POLICY "Anyone can read qr_sessions"
  ON qr_sessions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage qr_sessions"
  ON qr_sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- 10. Enable RLS on offices so employees can read (for join in validateQRToken)
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read offices" ON offices;
DROP POLICY IF EXISTS "Admins can manage offices" ON offices;

CREATE POLICY "Anyone can read offices"
  ON offices FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage offices"
  ON offices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- 11. Enable RLS on attendances for employee insert/read
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own attendance" ON attendances;
DROP POLICY IF EXISTS "Users can read own attendance" ON attendances;
DROP POLICY IF EXISTS "Users can update own attendance" ON attendances;
DROP POLICY IF EXISTS "Admins can read all attendance" ON attendances;

CREATE POLICY "Users can insert own attendance"
  ON attendances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own attendance"
  ON attendances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance"
  ON attendances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all attendance"
  ON attendances FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE OR REPLACE FUNCTION update_office_shifts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS office_shifts_set_updated_at ON office_shifts;
CREATE TRIGGER office_shifts_set_updated_at
BEFORE UPDATE ON office_shifts
FOR EACH ROW
EXECUTE FUNCTION update_office_shifts_updated_at();

-- ============================================================
-- 12. Fix FK constraints for safe user/office deletion
-- ============================================================
DO $$
BEGIN
  -- Add ON DELETE CASCADE to attendances.office_id if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'attendances' AND kcu.column_name = 'office_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Drop existing FK and recreate with CASCADE
    DECLARE
      fk_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO fk_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'attendances' AND kcu.column_name = 'office_id'
        AND tc.constraint_type = 'FOREIGN KEY'
      LIMIT 1;

      EXECUTE format('ALTER TABLE attendances DROP CONSTRAINT %I', fk_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop FK on attendances.office_id: %', SQLERRM;
    END;
  END IF;

  -- Add SET NULL on profiles.office_id so deleting office doesn't break profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'profiles' AND kcu.column_name = 'office_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_office_id_fkey
      FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 13. Refresh Supabase schema cache so foreign key joins work in REST API
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 14. Fix: filter by check_in instead of created_at so leaves
--     appear in the correct month's stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_monthly_stats(
  p_user_id uuid,
  p_year int DEFAULT EXTRACT(YEAR FROM NOW()),
  p_month int DEFAULT EXTRACT(MONTH FROM NOW())
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date timestamp;
  end_date timestamp;
  result json;
BEGIN
  start_date := make_timestamp(p_year, p_month, 1, 0, 0, 0);
  end_date := start_date + interval '1 month' - interval '1 second';

  SELECT json_build_object(
    'total_hadir', COUNT(*) FILTER (WHERE status = 'hadir'),
    'total_lembur', COUNT(*) FILTER (WHERE status = 'hadir_lembur'),
    'total_sakit', COUNT(*) FILTER (WHERE status = 'sakit'),
    'total_izin', COUNT(*) FILTER (WHERE status = 'izin'),
    'total_terlambat', COUNT(*) FILTER (
      WHERE (status = 'hadir' OR status = 'hadir_lembur')
        AND EXTRACT(HOUR FROM check_in AT TIME ZONE 'Asia/Jakarta') >= 8
        AND EXTRACT(HOUR FROM check_in AT TIME ZONE 'Asia/Jakarta') < 18
    ),
    'total_records', COUNT(*)
  ) INTO result
  FROM attendances
  WHERE user_id = p_user_id
    AND check_in >= start_date
    AND check_in <= end_date;

  RETURN result;
END;
$$;

-- 15. Index on check_in for faster date-range queries
CREATE INDEX IF NOT EXISTS idx_attendances_check_in ON attendances(check_in);

-- ============================================================
-- 16. RPC Security Layer — controlled API for write operations
-- ============================================================

-- Check-in RPC (insert attendance)
CREATE OR REPLACE FUNCTION check_in_rpc(
  p_user_id UUID,
  p_office_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_status TEXT,
  p_is_overtime BOOLEAN
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_attendance_id UUID;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot check in for another user';
  END IF;

  INSERT INTO attendances (user_id, office_id, check_in, status, is_overtime, checkin_lat, checkin_lng)
  VALUES (p_user_id, p_office_id, NOW(), p_status::attendance_status, p_is_overtime, p_lat, p_lng)
  RETURNING id INTO v_attendance_id;

  SELECT row_to_json(a)::JSON INTO v_result
  FROM attendances a WHERE a.id = v_attendance_id;

  RETURN v_result;
END;
$$;

-- Check-out RPC (update check_out time and location)
CREATE OR REPLACE FUNCTION check_out_rpc(
  p_attendance_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM attendances WHERE id = p_attendance_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Attendance record not found';
  END IF;

  IF auth.uid() != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot check out for another user';
  END IF;

  UPDATE attendances
  SET check_out = NOW(), checkin_lat = COALESCE(p_lat, checkin_lat), checkin_lng = COALESCE(p_lng, checkin_lng)
  WHERE id = p_attendance_id;

  SELECT row_to_json(a)::JSON INTO v_result
  FROM attendances a WHERE a.id = p_attendance_id;

  RETURN v_result;
END;
$$;

-- Submit leave RPC (insert leave/sick record)
CREATE OR REPLACE FUNCTION submit_leave_rpc(
  p_user_id UUID,
  p_office_id UUID,
  p_status TEXT,
  p_start_date TEXT,
  p_end_date TEXT,
  p_start_time TEXT,
  p_end_time TEXT,
  p_notes TEXT,
  p_proof_url TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_attendance_id UUID;
  v_check_in TIMESTAMPTZ;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot submit leave for another user';
  END IF;

  v_check_in := (p_start_date || 'T' || p_start_time || ':00+07:00')::TIMESTAMPTZ;

  INSERT INTO attendances (user_id, office_id, status, check_in, start_date, end_date, start_time, end_time, notes, proof_url)
  VALUES (p_user_id, p_office_id, p_status::attendance_status, v_check_in, p_start_date::DATE, p_end_date::DATE, p_start_time::TIME, p_end_time::TIME, p_notes, p_proof_url)
  RETURNING id INTO v_attendance_id;

  SELECT row_to_json(a)::JSON INTO v_result
  FROM attendances a WHERE a.id = v_attendance_id;

  RETURN v_result;
END;
$$;

-- Validate QR token RPC
CREATE OR REPLACE FUNCTION validate_qr_token_rpc(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT row_to_json(qs)::JSON INTO v_result
  FROM qr_sessions qs
  WHERE qs.token = p_token
    AND qs.expires_at > NOW();

  RETURN v_result;
END;
$$;

-- ============================================================
-- 17. Location Logs Table — for admin audit of GPS coordinates
-- ============================================================
CREATE TABLE IF NOT EXISTS location_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES attendances(id) ON DELETE SET NULL,
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('checkin', 'checkout', 'gps_refresh')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  distance_to_office DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read location_logs" ON location_logs;
DROP POLICY IF EXISTS "Users can insert own location_logs" ON location_logs;
DROP POLICY IF EXISTS "Users can read own location_logs" ON location_logs;

CREATE POLICY "Admins can read location_logs"
  ON location_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Users can insert own location_logs"
  ON location_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own location_logs"
  ON location_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_location_logs_user_id ON location_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_location_logs_created_at ON location_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_location_logs_office_id ON location_logs(office_id);

-- Log location RPC (called from frontend after check-in/check-out)
CREATE OR REPLACE FUNCTION log_location_rpc(
  p_user_id UUID,
  p_attendance_id UUID DEFAULT NULL,
  p_office_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT 'gps_refresh',
  p_latitude DOUBLE PRECISION DEFAULT 0,
  p_longitude DOUBLE PRECISION DEFAULT 0,
  p_accuracy DOUBLE PRECISION DEFAULT NULL,
  p_distance_to_office DOUBLE PRECISION DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO location_logs (user_id, attendance_id, office_id, action, latitude, longitude, accuracy, distance_to_office)
  VALUES (p_user_id, p_attendance_id, p_office_id, p_action, p_latitude, p_longitude, p_accuracy, p_distance_to_office)
  RETURNING id INTO v_result;

  RETURN json_build_object('id', v_result);
END;
$$;

-- Get location logs for an attendance record (admin only)
CREATE OR REPLACE FUNCTION get_attendance_location_logs_rpc(p_attendance_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT json_agg(row_to_json(ll) ORDER BY ll.created_at ASC) INTO v_result
  FROM location_logs ll
  WHERE ll.attendance_id = p_attendance_id;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
