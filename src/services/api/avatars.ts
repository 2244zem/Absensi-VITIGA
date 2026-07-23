import { supabase } from '../supabaseClient';

const AVATAR_BUCKET = 'avatars';

export async function getAvatar(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .maybeSingle();
  return data?.avatar_url || null;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (dbError) throw dbError;

  return publicUrl;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (data?.avatar_url) {
    const parts = data.avatar_url.split('/');
    const filename = parts.pop();
    if (filename) {
      await supabase.storage.from(AVATAR_BUCKET).remove([`${userId}/${filename}`]);
    }
  }

  await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
}

export async function getAvatars(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', userIds);
  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (row.avatar_url) map[row.id] = row.avatar_url;
  }
  return map;
}
