import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { createNotification, getNotifications, markAllNotificationsRead } from '../services/api/notifications';

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const data = await getNotifications(userId);
    setNotifications(data);
    setUnreadCount(data.filter((n: any) => !n.is_read).length);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload: any) => {
          if (payload.new?.user_id !== userId) return;
          setNotifications(prev => [payload.new, ...prev].slice(0, 50));
          if (!payload.new?.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload: any) => {
          if (payload.new?.user_id !== userId) return;
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
          setUnreadCount(notifications.filter((n: any) => !n.is_read && n.id !== payload.new.id).length + (payload.new.is_read ? 0 : 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    setUnreadCount(notifications.filter((n: any) => !n.is_read).length);
  }, [notifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    const { markNotificationsRead } = await import('../services/api/notifications');
    await markNotificationsRead(ids);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead(userId);
  }, [userId]);

  return { notifications, unreadCount, loading, markAsRead, markAllRead, refresh };
}

export { createNotification };
