import React from 'react';
import { X, Clock, MapPin } from 'lucide-react';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    date: string;
    check_in: string;
    check_out?: string | null;
    status: string;
    office_name?: string;
    is_overtime: boolean;
    checkin_lat?: number;
    checkin_lng?: number;
  } | null;
}

const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  const formatStatus = (status: string) => {
    const map: Record<string, string> = { hadir: 'Hadir', hadir_lembur: 'Hadir (Lembur)', sakit: 'Sakit', izin: 'Izin' };
    return map[status] || status;
  };

  const calcDuration = (start: string, end: string | null | undefined) => {
    if (!end) return '-';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case 'hadir': return 'bg-emerald-50 text-emerald-700';
      case 'hadir_lembur': return 'bg-orange-50 text-orange-700';
      case 'sakit': return 'bg-red-50 text-red-600';
      case 'izin': return 'bg-blue-50 text-blue-600';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm w-full max-w-lg overflow-hidden text-[#1C1917]">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h2 className="font-bold text-base">{formatDate(record.date)}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Jam Masuk</p>
              <p className="font-bold text-lg">{formatTime(record.check_in)}</p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Jam Pulang</p>
              <p className="font-bold text-lg">{formatTime(record.check_out)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="text-xs text-stone-500 mb-1">Durasi Kerja</p>
              <p className="font-semibold">{calcDuration(record.check_in, record.check_out)}</p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="text-xs text-stone-500 mb-1">Lembur</p>
              <p className="font-semibold text-[#C23E00]">{record.is_overtime ? 'Ya' : 'Tidak'}</p>
            </div>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
            <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Lokasi Absensi</p>
            <p className="font-semibold">{record.office_name || 'Tidak diketahui'}</p>
            {record.checkin_lat && record.checkin_lng && (
              <p className="text-xs text-stone-400 mt-1">{record.checkin_lat.toFixed(4)}, {record.checkin_lng.toFixed(4)}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600">Status</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${statusStyle(record.status)}`}>
              {formatStatus(record.status)}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-[#C23E00] border-2 border-[#C23E00] hover:bg-orange-50 rounded-xl transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;
