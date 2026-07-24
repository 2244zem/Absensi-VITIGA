export type AttendanceStatus = 'hadir' | 'hadir_lembur' | 'sakit' | 'izin';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  office_id: string;
  check_in: string;
  check_out?: string | null;
  status: AttendanceStatus;
  is_overtime: boolean;
  checkin_lat: number;
  checkin_lng: number;
  proof_url?: string | null;
  notes?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  offices?: {
    name: string;
  };
}

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceInMeters: number;
  userLat: number;
  userLng: number;
  officeRadius: number;
}

export interface AttendanceStats {
  total_hadir: number;
  total_lembur: number;
  total_sakit: number;
  total_izin: number;
}

export interface UserAttendanceStats {
  user_id: string;
  full_name: string;
  email?: string;
  office_name?: string;
  total_hadir: number;
  total_lembur: number;
  total_sakit: number;
  total_izin: number;
  total_terlambat: number;
  total_hari: number;
  persentase_kehadiran: number;
  records: AttendanceRecord[];
}
