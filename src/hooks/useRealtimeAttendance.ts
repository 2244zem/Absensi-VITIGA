import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { getJakartaHour } from '../utils/timezone';

function checkLate(record: any) {
  if (!record.check_in) return false;
  const d = new Date(record.check_in);
  const hour = d.getUTCHours() + 7;
  return hour >= 8 && hour < 18 && (record.status === 'hadir' || record.status === 'hadir_lembur');
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('attendance-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances' },
        async (payload: any) => {
          const newRecord = payload.new;
          const status = newRecord.status;
          const isLate = checkLate(newRecord);

          const shouldNotify = status === 'sakit' || status === 'izin' || isLate;
          if (!shouldNotify) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newRecord.user_id)
            .single();

          const label = isLate ? 'terlambat' : status;

          setNotifications(prev => [
            {
              id: newRecord.id,
              user_name: profile?.full_name || 'Karyawan',
              status: label,
              check_in: newRecord.check_in,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...prev,
          ].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAllRead };
}
