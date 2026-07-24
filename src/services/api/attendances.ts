import { supabase } from '../supabaseClient';
import type { AttendanceStatus, UserAttendanceStats } from '../../types/attendance';
import { getJakartaHour, LATE_THRESHOLD_HOUR, getTodayJakartaBounds, getJakartaDayBounds } from '../../utils/timezone';

export async function getServerCooldown(userId: string): Promise<{ can_checkout: boolean; remaining_seconds: number }> {
  const { data, error } = await supabase.rpc('check_cooldown', { p_user_id: userId });
  if (error) {
    return { can_checkout: true, remaining_seconds: 0 };
  }
  return data;
}

export async function checkIn(userId: string, officeId: string, lat: number, lng: number, status: AttendanceStatus = 'hadir', isOvertime = false) {
  const { data, error } = await supabase.rpc('check_in_rpc', {
    p_user_id: userId,
    p_office_id: officeId,
    p_lat: lat,
    p_lng: lng,
    p_status: status,
    p_is_overtime: isOvertime,
  });
  if (error) throw error;
  return data;
}

export async function checkOut(attendanceId: string, lat: number, lng: number) {
  const { data, error } = await supabase.rpc('check_out_rpc', {
    p_attendance_id: attendanceId,
    p_lat: lat,
    p_lng: lng,
  });
  if (error) throw error;
  return data;
}

export async function getTodayAttendance(userId: string) {
  const { start } = getTodayJakartaBounds();
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitOvertime(attendanceId: string) {
  const { data, error } = await supabase
    .from('attendances')
    .update({ status: 'hadir_lembur', is_overtime: true })
    .eq('id', attendanceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAttendanceHistory(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getAllAttendances(options?: { status?: string; officeId?: string; startDate?: string; endDate?: string; search?: string }) {
  let query = supabase
    .from('attendances')
    .select('*')
    .order('check_in', { ascending: false });
  if (options?.status && options.status !== 'Semua Status') {
    const statusMap: Record<string, AttendanceStatus> = {
      'Hadir': 'hadir', 'Hadir (Lembur)': 'hadir_lembur', 'Sakit': 'sakit', 'Izin': 'izin',
    };
    const mappedStatus = Object.entries(statusMap).find(([k]) => k === options.status)?.[1];
    if (mappedStatus) query = query.eq('status', mappedStatus);
  }
  if (options?.officeId) query = query.eq('office_id', options.officeId);
  if (options?.startDate) query = query.gte('check_in', options.startDate);
  if (options?.endDate) query = query.lte('check_in', options.endDate);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAttendanceStats() {
  try {
    const { data, error } = await supabase.rpc('get_attendance_stats');
    if (error) throw error;
    return data;
  } catch {
    const { data: all } = await supabase.from('attendances').select('status');
    if (all) {
      return {
        total_hadir: all.filter(a => a.status === 'hadir').length,
        total_lembur: all.filter(a => a.status === 'hadir_lembur').length,
        total_sakit: all.filter(a => a.status === 'sakit').length,
        total_izin: all.filter(a => a.status === 'izin').length,
      };
    }
    return { total_hadir: 0, total_lembur: 0, total_sakit: 0, total_izin: 0 };
  }
}

export async function getUserMonthlyStats(userId: string, year?: number, month?: number): Promise<UserAttendanceStats> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month !== undefined ? month + 1 : now.getMonth() + 1;

  const [statsResult, profileResult] = await Promise.allSettled([
    supabase.rpc('get_user_monthly_stats', { p_user_id: userId, p_year: y, p_month: m }),
    supabase.from('profiles').select('full_name, email, office_id').eq('id', userId).single(),
  ]);

  const statsData = statsResult.status === 'fulfilled' ? statsResult.value.data : null;
  const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;

  const total_hadir = statsData?.total_hadir ?? 0;
  const total_lembur = statsData?.total_lembur ?? 0;
  const total_sakit = statsData?.total_sakit ?? 0;
  const total_izin = statsData?.total_izin ?? 0;
  const total_terlambat = statsData?.total_terlambat ?? 0;

  const total_hari = total_hadir + total_lembur + total_sakit + total_izin;
  const hadir_effective = total_hadir + total_lembur;
  const persentase_kehadiran = total_hari > 0 ? Math.round((hadir_effective / total_hari) * 100) : 0;

  let full_name = 'Unknown';
  let email: string | undefined;
  let office_name: string | undefined;
  if (profile) {
    full_name = profile.full_name;
    email = profile.email;
    if (profile.office_id) {
      const { data: office } = await supabase.from('offices').select('name').eq('id', profile.office_id).single();
      office_name = office?.name;
    }
  }

  const { data: records } = await supabase
    .from('attendances')
    .select('*')
    .eq('user_id', userId)
    .order('check_in', { ascending: false });

  return {
    user_id: userId,
    full_name,
    email,
    office_name,
    total_hadir,
    total_lembur,
    total_sakit,
    total_izin,
    total_terlambat,
    total_hari,
    persentase_kehadiran,
    records: records || [],
  };
}

export async function submitLeave(params: {
  userId: string; officeId: string; status: 'sakit' | 'izin';
  startDate: string; endDate: string; startTime: string; endTime: string;
  notes: string; proofUrl?: string | null;
}) {
  const { data, error } = await supabase.rpc('submit_leave_rpc', {
    p_user_id: params.userId,
    p_office_id: params.officeId,
    p_status: params.status,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_start_time: params.startTime,
    p_end_time: params.endTime,
    p_notes: params.notes,
    p_proof_url: params.proofUrl || null,
  });
  if (error) throw error;
  return data;
}

async function invokeEdge(action: string, body: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.access_token) throw new Error('Sesi habis, silakan login ulang');

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...body },
  });

  if (error) {
    const ctx = error.context as Record<string, unknown> | undefined;
    const responseBody = ctx?.data as Record<string, unknown> | undefined;

    if (responseBody?.error && typeof responseBody.error === 'string') {
      throw new Error(responseBody.error);
    }
    if (ctx?.error && typeof ctx.error === 'string') {
      throw new Error(ctx.error);
    }
    if (error.message?.includes('non-2xx') || error.message?.includes('Failed to send')) {
      throw new Error('Edge function tidak merespon. Pastikan sudah di-deploy: supabase functions deploy admin-api');
    }
    throw new Error(error.message || `Gagal ${action}`);
  }

  return data;
}

export async function deleteAttendance(id: string) {
  await invokeEdge('deleteAttendance', { id });
}

export async function updateAttendance(id: string, updates: Record<string, unknown>) {
  await invokeEdge('updateAttendance', { id, updates });
}

export async function getDailyAttendance(dateStr?: string) {
  const { start: startOfDay, end: endOfDay } = dateStr
    ? getJakartaDayBounds(dateStr)
    : getTodayJakartaBounds();

  const auditDate = dateStr || (() => {
    const { year, month, day } = getJakartaDateParts();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  })();

  const [attResult, leaveResult, profilesResult, officesResult] = await Promise.allSettled([
    supabase.from('attendances').select('*').gte('check_in', startOfDay).lte('check_in', endOfDay),
    supabase.from('attendances').select('*').in('status', ['sakit', 'izin']).lte('start_date', auditDate).gte('end_date', auditDate),
    supabase.from('profiles').select('id, full_name, email, office_id, role, avatar_url'),
    supabase.from('offices').select('id, name'),
  ]);

  const checkInAtt = attResult.status === 'fulfilled' ? attResult.value.data || [] : [];
  const leaveAtt = leaveResult.status === 'fulfilled' ? leaveResult.value.data || [] : [];
  const allAttendances = [...checkInAtt, ...leaveAtt];

  const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
  const officesRaw = officesResult.status === 'fulfilled' ? officesResult.value.data || [] : [];
  const officeMap: Record<string, string> = {};
  for (const o of officesRaw) officeMap[o.id] = o.name;

  const attByUser: Record<string, any> = {};
  for (const a of allAttendances) {
    if (!attByUser[a.user_id]) attByUser[a.user_id] = a;
    else if (a.check_out && !attByUser[a.user_id].check_out) attByUser[a.user_id] = a;
  }

  const result = [];
  for (const p of profiles) {
    const att = attByUser[p.id];
    let isLate = false;
    if (att?.check_in && att.status !== 'sakit' && att.status !== 'izin') {
      const checkInDate = new Date(att.check_in);
      const checkInHour = parseInt(checkInDate.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }), 10);
      isLate = checkInHour >= LATE_THRESHOLD_HOUR;
    }

    result.push({
      user_id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      avatar_url: p.avatar_url || null,
      office_name: officeMap[p.office_id] || '-',
      status: att?.status || 'alpha',
      check_in: att?.check_in || null,
      check_out: att?.check_out || null,
      is_late: isLate,
      is_overtime: att?.is_overtime || false,
      notes: att?.notes || null,
      start_date: att?.start_date || null,
      start_time: att?.start_time || null,
      end_date: att?.end_date || null,
      end_time: att?.end_time || null,
    });
  }

  return result;
}


