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
    check_in_hour := EXTRACT(HOUR FROM NEW.check_in);
    IF check_in_hour >= 8 AND check_in_hour < 18 THEN
      FOR admin_record IN SELECT id FROM profiles WHERE role = 'admin' LOOP
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES (admin_record.id, 'Terlambat', emp_name || ' datang terlambat', 'terlambat', NEW.id);
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
