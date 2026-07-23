import { supabase } from '../supabaseClient';
import type { Office } from '../../types/office';

export async function getOffices(): Promise<Office[]> {
  const { data, error } = await supabase.from('offices').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getOfficeById(id: string): Promise<Office> {
  const { data, error } = await supabase.from('offices').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createOffice(office: { name: string; address: string; latitude: number; longitude: number; radius_meters: number }) {
  const { data, error } = await supabase.from('offices').insert(office).select().single();
  if (error) throw error;
  return data;
}

export async function updateOffice(id: string, office: { name?: string; address?: string; latitude?: number; longitude?: number; radius_meters?: number }) {
  const { error } = await supabase.from('offices').update(office).eq('id', id);
  if (error) throw error;
}

export async function deleteOffice(id: string) {
  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('office_id', id);
  if (profileCount && profileCount > 0) {
    throw new Error(`Tidak dapat menghapus kantor: ${profileCount} karyawan masih terdaftar di kantor ini`);
  }
  const { count: attCount } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('office_id', id);
  if (attCount && attCount > 0) {
    throw new Error(`Tidak dapat menghapus kantor: terdapat ${attCount} data absensi terkait`);
  }
  const { error } = await supabase.from('offices').delete().eq('id', id);
  if (error) throw error;
}
