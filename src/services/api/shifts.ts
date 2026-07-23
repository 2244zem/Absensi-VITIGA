import { supabase } from '../supabaseClient';
import type { OfficeShift, OfficeShiftInput } from '../../types/shift';

export async function getOfficeShifts(): Promise<OfficeShift[]> {
  const { data, error } = await supabase
    .from('office_shifts')
    .select('*, office:offices(name)')
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function getOfficesWithoutShift(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('offices')
    .select('id, name')
    .order('name');
  if (error) throw error;
  const shifts = await getOfficeShifts();
  const used = new Set(shifts.map((s) => s.office_id));
  return (data || []).filter((o) => !used.has(o.id));
}

export async function getOfficeShiftByOffice(officeId: string): Promise<OfficeShift | null> {
  const { data, error } = await supabase
    .from('office_shifts')
    .select('*, office:offices(name)')
    .eq('office_id', officeId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertOfficeShift(input: OfficeShiftInput): Promise<OfficeShift> {
  const { data, error } = await supabase
    .from('office_shifts')
    .upsert(input, { onConflict: 'office_id' })
    .select('*, office:offices(name)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOfficeShift(id: string): Promise<void> {
  const { error } = await supabase.from('office_shifts').delete().eq('id', id);
  if (error) throw error;
}
