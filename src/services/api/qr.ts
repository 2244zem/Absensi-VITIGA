import { supabase } from '../supabaseClient';

export function parseQRData(scanned: string): { token: string; office_id: string } | null {
  try {
    const parsed = JSON.parse(scanned);
    if (parsed && parsed.t && parsed.o) {
      return { token: parsed.t, office_id: parsed.o };
    }
  } catch {}
  const val = scanned.trim();
  if (!val) return null;
  return { token: val, office_id: val };
}

export function encodeQRData(token: string, officeId: string): string {
  return JSON.stringify({ t: token, o: officeId });
}

export async function generateQRSession(officeId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 25000).toISOString();
  const { data, error } = await supabase.from('qr_sessions').insert({
    office_id: officeId,
    token,
    expires_at: expiresAt,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getActiveQRSession(officeId: string) {
  const { data, error } = await supabase
    .from('qr_sessions')
    .select('*')
    .eq('office_id', officeId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function validateQRToken(token: string) {
  const { data, error } = await supabase.rpc('validate_qr_token_rpc', { p_token: token });
  if (error) return null;
  return data;
}

export async function cleanExpiredSessions() {
  const { error } = await supabase
    .from('qr_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());
  if (error) throw error;
}
