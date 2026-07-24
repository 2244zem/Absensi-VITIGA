import { supabase } from '../supabaseClient';

export async function logLocation(params: {
  userId: string;
  attendanceId?: string | null;
  officeId?: string | null;
  action: 'checkin' | 'checkout' | 'gps_refresh';
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  distanceToOffice?: number | null;
}) {
  const { data, error } = await supabase.rpc('log_location_rpc', {
    p_user_id: params.userId,
    p_attendance_id: params.attendanceId || null,
    p_office_id: params.officeId || null,
    p_action: params.action,
    p_latitude: params.latitude,
    p_longitude: params.longitude,
    p_accuracy: params.accuracy ?? null,
    p_distance_to_office: params.distanceToOffice ?? null,
  });
  if (error) throw error;
  return data;
}

export async function getAttendanceLocationLogs(attendanceId: string) {
  const { data, error } = await supabase.rpc('get_attendance_location_logs_rpc', {
    p_attendance_id: attendanceId,
  });
  if (error) throw error;
  return data as any[];
}
