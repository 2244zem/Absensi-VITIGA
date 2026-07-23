import { supabase } from '../supabaseClient';
import type { UserProfile } from '../../types/user';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;

  let officeName: string | undefined;
  if (data.office_id) {
    const { data: office } = await supabase.from('offices').select('name').eq('id', data.office_id).single();
    officeName = office?.name;
  }

  return { ...data, offices: officeName ? { name: officeName } : undefined } as UserProfile;
}

export async function getAllProfiles() {
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

export async function updateProfile(userId: string, updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as UserProfile;
}

export async function updateName(userId: string, fullName: string) {
  return updateProfile(userId, { full_name: fullName });
}
