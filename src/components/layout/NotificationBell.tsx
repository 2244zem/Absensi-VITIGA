import React, { useState } from 'react';
import { Bell, Clock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useRealtimeNotifications } from '../../hooks/useRealtimeAttendance';

const statusIcons: Record<string, any> = {
  hadir: CheckCircle2,
  hadir_lembur: Clock,
  sakit: AlertTriangle,
  izin: FileText,
  terlambat: AlertTriangle,
};

const statusColors: Record<string, string> = {
  hadir: 'text-emerald-600 bg-emerald-50',
  hadir_lembur: 'text-orange-600 bg-orange-50',
  sakit: 'text-red-500 bg-red-50',
  izin: 'text-blue-600 bg-blue-50',
  terlambat: 'text-amber-600 bg-amber-50',
};

const statusLabels: Record<string, string> = {
  hadir: 'Hadir',
  hadir_lembur: 'Hadir (Lembur)',
  sakit: 'Sakit',
  izin: 'Izin',
  terlambat: 'Terlambat',
};

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useRealtimeNotifications();

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C23E00] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setIsOpen(false); markAllRead(); }} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200/80 z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <h3 className="text-sm font-bold text-[#1C1917]">Notifikasi</h3>
              {notifications.length > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-semibold text-[#C23E00] hover:underline">
                  Tandai dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-stone-400">
                  Belum ada notifikasi
                </div>
              ) : (
                <div className="divide-y divide-stone-50">
                  {notifications.map((n) => {
                    const Icon = statusIcons[n.status] || CheckCircle2;
                    const color = statusColors[n.status] || 'text-stone-500 bg-stone-50';
                    return (
                      <div key={n.id} className={`px-4 py-3 flex items-start gap-3 transition-colors ${n.read ? '' : 'bg-orange-50/30'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1C1917]">{n.user_name}</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            {n.check_in ? `Absen ${statusLabels[n.status] || n.status}` : 'Pembaruan absensi'}
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{formatTime(n.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
