import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Briefcase, Calendar, ChevronDown, Clock, Pencil, Check, X, Camera, Loader2 } from 'lucide-react';
import AttendanceDetailModal from '../../components/employee/AttendanceDetailModal';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { updateProfile } from '../../services/api/profiles';
import { uploadAvatar } from '../../services/api/avatars';

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
  const { user, refreshUser } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState<HistoryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total_hadir: 0, total_lembur: 0, total_sakit: 0, total_izin: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, selectedMonth]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01T00:00:00+07:00`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const endStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+07:00`;

      const { data: attendances, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in', startStr)
        .lte('check_in', endStr)
        .order('check_in', { ascending: false });

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

  const startEdit = () => {
    setEditName(user?.fullName || '');
    setEditing(true);
    setMenuOpen(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName('');
  };

  const saveProfile = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { full_name: editName.trim() });
      await refreshUser();
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { alert('Pilih file gambar'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Maksimal 2MB'); return; }
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Gagal upload foto');
    } finally {
      setUploading(false);
      e.target.value = '';
      setMenuOpen(false);
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
          <button onClick={handleAvatarClick} disabled={uploading} className="relative group">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white overflow-hidden bg-[#C23E00]">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || 'U'
              )}
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>

        {editing ? (
          <div className="w-full max-w-xs space-y-3">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full text-center text-xl font-bold text-[#1C1917] bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:border-[#C23E00]"
              placeholder="Nama lengkap"
            />
            <p className="text-sm text-stone-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 justify-center">
              <button onClick={saveProfile} disabled={saving || !editName.trim()}
                className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-300 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                <Check className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={cancelEdit} disabled={saving}
                className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                <X className="w-4 h-4" />
                Batal
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 relative" ref={menuRef}>
              <h2 className="text-xl font-bold text-[#1C1917]">{user?.fullName || 'Nama Karyawan'}</h2>
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-[#C23E00] transition-all">
                <Pencil className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-stone-200 rounded-xl shadow-lg z-20 w-48 overflow-hidden">
                  <button onClick={startEdit} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                    <Pencil className="w-4 h-4 text-stone-400" />
                    Edit Nama
                  </button>
                  <button onClick={handleAvatarClick} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                    <Camera className="w-4 h-4 text-stone-400" />
                    Upload Foto Profil
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-stone-500 mb-4">{user?.email || 'email@example.com'}</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-full text-xs font-bold text-stone-600">
                <Briefcase className="w-3.5 h-3.5 text-[#C23E00]" /> {user?.role || 'employee'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-full text-xs font-bold text-stone-600">
                <MapPin className="w-3.5 h-3.5 text-[#C23E00]" /> {user?.officeId || 'Kantor'}
              </span>
            </div>
          </>
        )}
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
