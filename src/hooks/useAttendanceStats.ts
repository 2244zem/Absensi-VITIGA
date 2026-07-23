import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface Stats {
  total_hadir: number;
  total_lembur: number;
  total_sakit: number;
  total_izin: number;
}

export function useAttendanceStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('attendances')
        .select('status');
      if (err) throw err;
      const all = data || [];
      setStats({
        total_hadir: all.filter(a => a.status === 'hadir').length,
        total_lembur: all.filter(a => a.status === 'hadir_lembur').length,
        total_sakit: all.filter(a => a.status === 'sakit').length,
        total_izin: all.filter(a => a.status === 'izin').length,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return { stats, loading, error, refetch: fetchStats };
}
