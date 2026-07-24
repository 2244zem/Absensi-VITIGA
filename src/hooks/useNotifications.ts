import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { createNotification, getNotifications, markAllNotificationsRead } from '../services/api/notifications';

export function useNotifications(userId: string | undefined, isAdmin = false) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    console.log('[useNotifications] refresh called', { userId, isAdmin });
    if (!userId) {
      console.log('[useNotifications] no userId, skipping');
      return;
    }
    try {
      const data = await getNotifications(userId, isAdmin);
      console.log('[useNotifications] got data:', data?.length, 'items');
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
      setError(null);
    } catch (e: any) {
      console.error('[useNotifications] error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    console.log('[useNotifications] effect running', { userId, isAdmin });
    if (!userId) return;
    refresh();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload: any) => {
          console.log('[useNotifications] INSERT realtime:', payload.new);
          if (!isAdmin && payload.new?.user_id !== userId) return;
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
          if (!isAdmin && payload.new?.user_id !== userId) return;
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin]);

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
    await markAllNotificationsRead(userId, isAdmin);
  }, [userId, isAdmin]);

  return { notifications, unreadCount, loading, error, markAsRead, markAllRead, refresh };
}

export { createNotification };
