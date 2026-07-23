import { supabase } from '../supabaseClient';
import type { UserProfile } from '../../types/user';

async function invokeEdge(action: string, body: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Sesi habis, silakan login ulang');

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...body },
  });

  if (error) {
    const msg = error.context?.message || error.message || ''
    // Coba parse response body jika error dari edge function
    if (msg && typeof msg === 'string') {
      try {
        const parsed = JSON.parse(msg)
        if (parsed.error) throw new Error(parsed.error)
      } catch (e) {
        if (e instanceof Error && e.message !== msg) throw e
      }
    }
    throw new Error(msg || `Gagal ${action}`)
  }

  return data
}

export async function createUser(email: string, password: string, fullName: string, role: 'admin' | 'employee', officeId: string) {
  return invokeEdge('createUser', { email, password, fullName, role, officeId });
}

export async function updateUser(userId: string, data: { full_name?: string; office_id?: string; role?: 'admin' | 'employee'; password?: string }) {
  return invokeEdge('updateUser', { userId, updates: data });
}

export async function deleteUser(userId: string) {
  return invokeEdge('deleteUser', { userId });
}

export async function getUsers() {
  const [profilesResult, officesResult] = await Promise.allSettled([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('offices').select('id, name'),
  ]);

  const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
  const officesRaw = officesResult.status === 'fulfilled' ? officesResult.value.data || [] : [];
  const officeMap: Record<string, string> = {};
  for (const o of officesRaw) officeMap[o.id] = o.name;

  return profiles.map((p: any) => ({
    ...p,
    offices: p.office_id && officeMap[p.office_id] ? { name: officeMap[p.office_id] } : undefined,
  })) as (UserProfile & { offices?: { name: string } })[];
}

export async function getUserCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export async function getUsersByOffice() {
  const [profilesResult, officesResult] = await Promise.allSettled([
    supabase.from('profiles').select('*'),
    supabase.from('offices').select('id, name'),
  ]);

  const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
  const offices = officesResult.status === 'fulfilled' ? officesResult.value.data || [] : [];

  const counts: Record<string, { name: string; count: number }> = { 'unassigned': { name: 'Tanpa Kantor', count: 0 } };
  for (const o of offices) counts[o.id] = { name: o.name, count: 0 };

  for (const p of profiles) {
    const key = p.office_id || 'unassigned';
    if (counts[key]) counts[key].count++;
  }

  return Object.values(counts);
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  let officeName: string | undefined;
  if (data.office_id) {
    const { data: office } = await supabase.from('offices').select('name').eq('id', data.office_id).single();
    officeName = office?.name;
  }

  return { ...data, offices: officeName ? { name: officeName } : undefined };
}
