import { supabase } from '../supabaseClient';

const AVATAR_BUCKET = 'avatars';

export async function getAvatar(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_avatars')
    .select('url')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.url || null;
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
    .from('user_avatars')
    .upsert({ user_id: userId, url: publicUrl, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (dbError) throw dbError;

  return publicUrl;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const { data } = await supabase
    .from('user_avatars')
    .select('url')
    .eq('user_id', userId)
    .maybeSingle();

  if (data?.url) {
    const path = data.url.split('/').pop();
    if (path) {
      await supabase.storage.from(AVATAR_BUCKET).remove([`${userId}/${path}`]);
    }
  }

  await supabase.from('user_avatars').delete().eq('user_id', userId);
}

export async function getAvatars(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('user_avatars')
    .select('user_id, url')
    .in('user_id', userIds);
  const map: Record<string, string> = {};
  for (const row of data || []) map[row.user_id] = row.url;
  return map;
}
