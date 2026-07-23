import { supabase } from '../supabaseClient';
import type { UserProfile } from '../../types/user';

export async function createUser(email: string, password: string, fullName: string, role: 'admin' | 'employee', officeId: string) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Tidak terautentikasi');

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action: 'createUser', email, password, fullName, role, officeId },
  });
  if (error) throw new Error(error.message || 'Gagal membuat akun');
  return data;
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

export async function updateUser(userId: string, data: { full_name?: string; office_id?: string; role?: 'admin' | 'employee' }) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Tidak terautentikasi');

  const { error } = await supabase.functions.invoke('admin-api', {
    body: { action: 'updateUser', userId, updates: data },
  });
  if (error) throw new Error(error.message || 'Gagal mengupdate user');
}

export async function deleteUser(userId: string) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Tidak terautentikasi');

  const { error } = await supabase.functions.invoke('admin-api', {
    body: { action: 'deleteUser', userId },
  });
  if (error) throw new Error(error.message || 'Gagal menghapus user');
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
