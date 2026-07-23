import { supabase } from '../supabaseClient';

export function parseQRData(scanned: string): { office_id: string; code: string } | null {
  const parts = scanned.split(':');
  if (parts.length !== 3 || parts[0] !== 'ABS') return null;
  return { office_id: parts[1], code: parts[2] };
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
  const { data, error } = await supabase
    .from('qr_sessions')
    .select('*, offices(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();
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
