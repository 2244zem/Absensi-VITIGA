import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { getTodayJakartaBounds } from '../../utils/timezone';
import { Loader2, MapPin } from 'lucide-react';

interface LiveCheckInFeedProps {
  officeId?: string | null;
  onViewAll?: () => void;
}

interface FeedItem {
  id: string;
  created_at: string;
  check_in: string;
  status: string;
  user_id: string;
  office_id: string;
  full_name?: string;
  office_name?: string;
  avatar_url?: string | null;
}

export const LiveCheckInFeed: React.FC<LiveCheckInFeedProps> = ({ officeId, onViewAll }) => {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  const fetchFeed = async () => {
    try {
      const { start } = getTodayJakartaBounds();
      let query = supabase
        .from('attendances')
        .select('id, check_in, created_at, status, user_id, office_id')
        .gte('check_in', start)
        .order('check_in', { ascending: false })
        .limit(10);
      if (officeId) query = query.eq('office_id', officeId);
      const { data: attData } = await query;
      if (attData && attData.length > 0) {
        const userIds = [...new Set(attData.map(a => a.user_id))];
        const officeIds = [...new Set(attData.map(a => a.office_id).filter(Boolean))];

        const [profilesRes, officesRes] = await Promise.allSettled([
          supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
          officeIds.length > 0
            ? supabase.from('offices').select('id, name').in('id', officeIds)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap: Record<string, { full_name: string; avatar_url?: string | null }> = {};
        if (profilesRes.status === 'fulfilled' && profilesRes.value.data) {
          for (const p of profilesRes.value.data) profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        }
        const officeMap: Record<string, string> = {};
        if (officesRes.status === 'fulfilled' && (officesRes as PromiseFulfilledResult<any>).value?.data) {
          for (const o of (officesRes as PromiseFulfilledResult<any>).value.data) officeMap[o.id] = o.name;
        }

        setFeed(attData.map(d => ({
          id: d.id,
          check_in: d.check_in,
          created_at: d.created_at,
          status: d.status,
          user_id: d.user_id,
          office_id: d.office_id,
          full_name: profileMap[d.user_id]?.full_name,
          avatar_url: profileMap[d.user_id]?.avatar_url,
          office_name: officeMap[d.office_id],
        })));
      } else {
        setFeed([]);
      }
    } catch (e) {
      console.error('Feed fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();

    const channel = supabase
      .channel('live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendances' }, async (payload: any) => {
        const rec = payload.new;
        if (officeId && rec.office_id !== officeId) return;

        const [profRes, offRes] = await Promise.allSettled([
          supabase.from('profiles').select('full_name, avatar_url').eq('id', rec.user_id).single(),
          supabase.from('offices').select('name').eq('id', rec.office_id).single(),
        ]);

        const fullName = profRes.status === 'fulfilled' ? profRes.value.data?.full_name : undefined;
        const avatarUrl = profRes.status === 'fulfilled' ? profRes.value.data?.avatar_url : undefined;
        const officeName = offRes.status === 'fulfilled' ? offRes.value.data?.name : undefined;

        setFeed(prev => [
          { id: rec.id, check_in: rec.check_in, created_at: rec.created_at, status: rec.status, user_id: rec.user_id, office_id: rec.office_id, full_name: fullName, avatar_url: avatarUrl, office_name: officeName },
          ...prev,
        ].slice(0, 50));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [officeId]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-sm text-[#1C1917]">Live Kehadiran</h3>
        </div>
        <span className="text-[10px] font-semibold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md">Hari Ini</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center gap-2 text-stone-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#C23E00]" />
            <span className="text-xs font-semibold">Memuat...</span>
          </div>
        ) : feed.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs font-semibold text-stone-400">
            Belum ada aktivitas presensi hari ini
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
              {feed.map((item) => {
              const badge = (() => {
                switch (item.status) {
                  case 'hadir_lembur': return { label: 'Lembur', cls: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
                  case 'sakit': return { label: 'Sakit', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
                  case 'izin': return { label: 'Izin', cls: 'bg-stone-100 text-stone-600 border-stone-200', dot: 'bg-stone-400' };
                  default: return { label: 'Hadir', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
                }
              })();
              return (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-600 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(item.full_name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1C1917] truncate">
                        {item.full_name || 'Karyawan'}
                      </p>
                      <span className="text-xs text-stone-400 shrink-0">{formatTime(item.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-stone-300 shrink-0" />
                      <span className="text-xs text-stone-400 truncate">{item.office_name || 'Kantor'}</span>
                    </div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-xs shrink-0">
        <span className="text-stone-500 font-medium">Total: <strong className="text-stone-700">{feed.length}</strong></span>
        <button onClick={onViewAll} className="font-semibold text-[#C23E00] hover:underline">Lihat Semua</button>
      </div>
    </div>
  );
};

export default LiveCheckInFeed;
