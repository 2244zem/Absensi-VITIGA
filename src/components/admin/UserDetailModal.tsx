import React, { useState } from 'react';
import {
  X, Mail, MapPin, Briefcase, Calendar,
  Clock, AlertTriangle, CheckCircle2, FileText,
} from 'lucide-react';
import { useUserStats } from '../../hooks/useUserStats';
import type { UserProfile } from '../../types/user';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: (UserProfile & { offices?: { name: string } }) | null;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, onClose, user }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear] = useState(now.getFullYear());

  const { stats, loading } = useUserStats(user?.id || null, selectedMonth, selectedYear);

  if (!isOpen || !user) return null;

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case 'hadir': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'hadir_lembur': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'sakit': return 'bg-red-50 text-red-600 border-red-200';
      case 'izin': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const statCards: { label: string; count: number; icon: any; color: string; bg: string; suffix?: string }[] = [
    { label: 'Hadir', count: stats?.total_hadir ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Lembur', count: stats?.total_lembur ?? 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Sakit', count: stats?.total_sakit ?? 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Izin', count: stats?.total_izin ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Terlambat', count: stats?.total_terlambat ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Kehadiran', count: stats?.persentase_kehadiran ?? 0, suffix: '%', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
          <h2 className="text-base font-bold text-[#1C1917]">Detail Karyawan</h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#C23E00]/10 text-[#C23E00] flex items-center justify-center font-bold text-xl">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#1C1917]">{user.full_name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                  <Mail className="w-3 h-3" /> {user.email || '-'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                  <MapPin className="w-3 h-3" /> {user.offices?.name || '-'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  user.role === 'admin' ? 'bg-orange-50 text-[#C23E00]' : 'bg-stone-100 text-stone-600'
                }`}>
                  <Briefcase className="w-3 h-3" />
                  {user.role === 'admin' ? 'Admin' : 'Karyawan'}
                </span>
              </div>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-stone-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]"
            >
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx}>{month} {selectedYear}</option>
              ))}
            </select>
          </div>

          {/* Stats Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-stone-200 border-t-[#C23E00] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {statCards.map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-sm text-center">
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <p className="text-xs font-semibold text-stone-500">{s.label}</p>
                    <p className={`text-xl font-bold text-[#1C1917] mt-0.5 ${s.label === 'Terlambat' && (stats?.total_terlambat ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                      {s.count}{s.suffix || ''}
                    </p>
                  </div>
                ))}
              </div>

              {/* Attendance Records */}
              {stats && stats.records.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#1C1917] mb-3">Riwayat Absensi Bulan Ini</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {stats.records.map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-stone-400" />
                          <div>
                            <p className="text-sm font-medium text-[#1C1917]">{formatDate(r.check_in)}</p>
                            <p className="text-xs text-stone-500">
                              {formatTime(r.check_in)} - {r.check_out ? formatTime(r.check_out) : 'Belum pulang'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.is_overtime && (
                            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Lembur</span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle(r.status)}`}>
                            {r.status === 'hadir' ? 'Hadir' : r.status === 'hadir_lembur' ? 'Hadir (Lembur)' : r.status === 'sakit' ? 'Sakit' : 'Izin'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats && stats.records.length === 0 && (
                <p className="text-sm text-stone-400 text-center py-4">Belum ada data absensi bulan ini</p>
              )}

              {/* Notes Section */}
              {stats && stats.records.some(r => r.notes) && (
                <div>
                  <h4 className="text-sm font-bold text-[#1C1917] mb-3">Catatan</h4>
                  <div className="space-y-2">
                    {stats.records.filter(r => r.notes).map((r) => (
                      <div key={r.id} className="bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
                        <p className="text-xs text-stone-500 mb-1">{formatDate(r.check_in)}</p>
                        <p className="text-sm text-stone-700 italic">"{r.notes}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
