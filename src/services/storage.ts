import { supabase } from './supabaseClient';

const BUCKET_NAME = 'medical-documents';
const AVATAR_BUCKET = 'avatars';

export async function uploadMedicalProof(userId: string, file: File) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return { path, publicUrl: urlData.publicUrl };
}

export async function getMedicalProofUrl(path: string) {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMedicalProof(path: string) {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}
