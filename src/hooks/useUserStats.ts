import { useState, useEffect } from 'react';
import { getUserMonthlyStats } from '../services/api/attendances';
import type { UserAttendanceStats } from '../types/attendance';

export function useUserStats(userId: string | null, month?: number, year?: number) {
  const [stats, setStats] = useState<UserAttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserMonthlyStats(userId, year, month);
        if (!cancelled) setStats(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Gagal memuat statistik');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [userId, month, year]);

  return { stats, loading, error };
}
