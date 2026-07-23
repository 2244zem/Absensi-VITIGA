import React, { useState, useEffect } from 'react';
import { MapPin, Briefcase, Calendar, ChevronDown, Clock } from 'lucide-react';
import AttendanceDetailModal from '../../components/employee/AttendanceDetailModal';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';

interface HistoryItem {
  id: string;
  created_at: string;
  check_in: string;
  check_out: string | null;
  status: string;
  is_overtime: boolean;
  checkin_lat: number;
  checkin_lng: number;
  offices?: { name: string } | null;
}

interface AttendanceStats {
  total_hadir: number;
  total_lembur: number;
  total_sakit: number;
  total_izin: number;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const UserProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState<HistoryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total_hadir: 0, total_lembur: 0, total_sakit: 0, total_izin: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, selectedMonth]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();
      const { data: attendances, error } = await supabase
        .from('attendances')
        .select('*, offices(name)')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(attendances || []);
      const hadir = (attendances || []).filter(a => a.status === 'hadir').length;
      const lembur = (attendances || []).filter(a => a.status === 'hadir_lembur').length;
      const sakit = (attendances || []).filter(a => a.status === 'sakit').length;
      const izin = (attendances || []).filter(a => a.status === 'izin').length;
      setStats({ total_hadir: hadir, total_lembur: lembur, total_sakit: sakit, total_izin: izin });
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (record: HistoryItem) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      hadir: 'Hadir', hadir_lembur: 'Hadir (Lembur)', sakit: 'Sakit', izin: 'Izin',
    };
    return map[status] || status;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const formatTimeHM = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-2xl bg-[#C23E00] flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
        </div>
        <h2 className="text-xl font-bold text-[#1C1917]">{user?.fullName || 'Nama Karyawan'}</h2>
        <p className="text-sm text-stone-500 mb-4">{user?.email || 'email@example.com'}</p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-full text-xs font-bold text-stone-600">
            <Briefcase className="w-3.5 h-3.5 text-[#C23E00]" /> {user?.role || 'employee'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-full text-xs font-bold text-stone-600">
            <MapPin className="w-3.5 h-3.5 text-[#C23E00]" /> {user?.officeId || 'Kantor'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { title: 'TOTAL HADIR', count: stats.total_hadir },
          { title: 'HADIR (LEMBUR)', count: stats.total_lembur },
          { title: 'TOTAL SAKIT', count: stats.total_sakit },
          { title: 'TOTAL IZIN', count: stats.total_izin },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">{stat.title}</span>
            <span className="text-3xl font-black text-[#C23E00]">{stat.count}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm">
        <h3 className="font-bold text-[#1C1917] text-base mb-4">Riwayat Kehadiran</h3>

        <div className="relative mb-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full appearance-none bg-white border border-stone-200 text-sm font-semibold text-[#1C1917] py-2.5 px-4 rounded-xl outline-none focus:border-[#C23E00]"
          >
            {MONTHS.map((month, idx) => (
              <option key={idx} value={idx}>{month} {selectedYear}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>

        <div className="w-full h-px bg-stone-100 mb-4"></div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#C23E00] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">Belum ada riwayat kehadiran bulan ini</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => openDetail(item)}
                className="bg-stone-50 rounded-xl p-4 border border-stone-100 flex flex-col gap-3 cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2.5 rounded-lg text-stone-500 border border-stone-200">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1C1917]">{formatDate(item.created_at)}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeHM(item.check_in)} - {formatTimeHM(item.check_out)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.checkin_lat && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-stone-200/50 rounded text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                      <MapPin className="w-2.5 h-2.5" /> GPS
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    item.status === 'hadir' ? 'bg-emerald-50 text-emerald-700' :
                    item.status === 'hadir_lembur' ? 'bg-orange-50 text-orange-700' :
                    'bg-orange-50 text-[#C23E00] border border-orange-200'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'hadir' ? 'bg-emerald-600' : item.status === 'hadir_lembur' ? 'bg-orange-500' : 'bg-[#C23E00]'
                    }`}></div>
                    {formatStatus(item.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AttendanceDetailModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedRecord(null); }}
        record={selectedRecord ? {
          date: selectedRecord.created_at,
          check_in: selectedRecord.check_in,
          check_out: selectedRecord.check_out,
          status: selectedRecord.status,
          office_name: selectedRecord.offices?.name || 'Kantor',
          is_overtime: selectedRecord.is_overtime,
          checkin_lat: selectedRecord.checkin_lat,
          checkin_lng: selectedRecord.checkin_lng,
        } : null}
      />
    </div>
  );
};

export default UserProfilePage;
