import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export function useUploadProof() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (userId: string, file: File): Promise<string | null> => {
    try {
      setUploading(true);
      setError(null);
      const ext = file.name.split('.').pop();
      const path = `${userId}/medical/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}
