import { supabase } from '../supabaseClient';

export interface NotificationPayload {
  title: string;
  message: string;
  type?: string;
  relatedId?: string;
}

export async function createNotification(userId: string, payload: NotificationPayload) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'info',
    related_id: payload.relatedId || null,
  });
  if (error) console.error('createNotification error:', error);
}

export async function getNotifications(userId: string, isAdmin = false, limit = 50) {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', ids);
  if (error) console.error('markNotificationsRead error:', error);
}

export async function markAllNotificationsRead(userId: string, isAdmin = false) {
  let query = supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('is_read', false); // admin marks all as read
  }
  const { error } = await query;
  if (error) console.error('markAllNotificationsRead error:', error);
}

export async function getUnreadCount(userId: string, isAdmin = false): Promise<number> {
  let query = supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}
