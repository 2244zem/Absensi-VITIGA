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

export async function getNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids);
  if (error) console.error('markNotificationsRead error:', error);
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) console.error('markAllNotificationsRead error:', error);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count || 0;
}
