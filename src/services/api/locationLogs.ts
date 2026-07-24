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
  if (!error && data) return data;
  if (error) console.error('RPC log_location_rpc error, insert langsung:', error);
  const { error: insertError } = await supabase.from('location_logs').insert({
    user_id: params.userId,
    attendance_id: params.attendanceId || null,
    office_id: params.officeId || null,
    action: params.action,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracy: params.accuracy ?? null,
    distance_to_office: params.distanceToOffice ?? null,
  });
  if (insertError) console.error('Gagal insert location_logs:', insertError);
}

export async function getAttendanceLocationLogs(attendanceId: string) {
  const { data, error } = await supabase.rpc('get_attendance_location_logs_rpc', {
    p_attendance_id: attendanceId,
  });
  if (!error && data) return data as any[];
  if (error) console.error('RPC get_attendance_location_logs_rpc error, query langsung:', error);
  const { data: fallback, error: fbErr } = await supabase
    .from('location_logs')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('created_at', { ascending: true });
  if (fbErr) {
    console.error('Gagal query location_logs:', fbErr);
    return [];
  }
  return fallback || [];
}
