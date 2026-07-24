import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, UserCheck, CalendarClock, PlusSquare, Users, RefreshCw, QrCode, ChevronDown, BarChart3, AlertTriangle, XCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import LiveCheckInFeed from '../../components/attendance/LiveCheckInFeed';
import { useDynamicQR } from '../../hooks/useDynamicQR';
import { encodeQRData } from '../../services/api/qr';
import { getOffices } from '../../services/api/offices';
import { getAttendanceStats } from '../../services/api/attendances';
import { getUserCount, getUsersByOffice } from '../../services/api/auth';
import type { Office } from '../../types/office';
import type { AttendanceStats } from '../../types/attendance';

export const DashboardAdminPage: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [officeCounts, setOfficeCounts] = useState<{ name: string; count: number }[]>([]);

  const navigate = useNavigate();
  const { token, officeId: qrOfficeId, timeLeft } = useDynamicQR(selectedOfficeId);

  const fetchDashboardData = async () => {
    try {
      const [officesData, statsData, empCount, officeStats] = await Promise.all([
        getOffices().catch(() => []),
        getAttendanceStats().catch(() => null),
        getUserCount().catch(() => 0),
        getUsersByOffice().catch(() => []),
      ]);
      setOffices(officesData);
      setStats(statsData);
      setTotalEmployees(empCount);
      setOfficeCounts(officeStats);
      if (officesData.length > 0 && !selectedOfficeId) setSelectedOfficeId(officesData[0].id);
    } catch {}
  };

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const secondsLeft = Math.ceil(timeLeft / 1000);

  const totalAttend = (stats?.total_hadir ?? 0) + (stats?.total_lembur ?? 0) + (stats?.total_sakit ?? 0) + (stats?.total_izin ?? 0);
  const alphaCount = Math.max(0, totalEmployees - totalAttend);

  const statsCards = [
    { label: 'Total Hadir', count: stats?.total_hadir ?? 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Hadir Lembur', count: stats?.total_lembur ?? 0, icon: CalendarClock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Sakit', count: stats?.total_sakit ?? 0, icon: PlusSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Izin', count: stats?.total_izin ?? 0, icon: AlertTriangle, color: 'text-stone-600', bg: 'bg-stone-100' },
    { label: 'Alpha', count: alphaCount, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Total Karyawan', count: totalEmployees, icon: Users, color: 'text-stone-600', bg: 'bg-stone-100' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C23E00] flex items-center justify-center">
            <QrCode size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1917]">Dashboard Presensi QR</h2>
            <p className="text-xs text-stone-500">Tampilan monitor & generator QR kantor</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-stone-100 px-3 py-2 rounded-xl border border-stone-200 w-full sm:w-auto">
          <MapPin size={16} className="text-[#C23E00] shrink-0" />
          <select
            value={selectedOfficeId}
            onChange={(e) => setSelectedOfficeId(e.target.value)}
            className="bg-transparent text-xs font-bold text-stone-700 focus:outline-none cursor-pointer w-full"
          >
            {offices.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="text-stone-400 shrink-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 lg:p-8 flex flex-col items-center">
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-stone-200">
            <div className="w-56 h-56 sm:w-64 sm:h-64 bg-stone-50 rounded-xl flex items-center justify-center">
              {token && qrOfficeId ? (
                <QRCodeCanvas value={encodeQRData(token, qrOfficeId)} size={220} level="M" />
              ) : (
                <div className="text-stone-400 text-xs">Memuat QR...</div>
              )}
            </div>
          </div>

          <div className="text-center mt-6 space-y-1">
            <h3 className="text-2xl font-bold text-[#1C1917] tracking-tight">Scan QR Code</h3>
            <p className="text-xs text-stone-500">
              Scan QR menggunakan kamera HP untuk <strong>Absen Masuk / Pulang</strong>.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-full border border-stone-200">
            <RefreshCw size={12} className="text-[#C23E00] animate-spin" />
            <span className="text-xs font-semibold text-stone-500">
              Refresh dalam <span className="text-[#C23E00] font-bold">{secondsLeft}s</span>
            </span>
          </div>
        </div>

        <div className="lg:col-span-4">
          <LiveCheckInFeed officeId={selectedOfficeId} onViewAll={() => navigate('/admin/daily-audit')} />
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {statsCards.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 shadow-md p-3 flex flex-col items-center text-center">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-xl font-bold text-[#1C1917] leading-none mb-0.5">{s.count}</p>
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Office Distribution */}
      {officeCounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4 lg:p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#C23E00]" />
            <h3 className="text-sm font-bold text-[#1C1917]">Sebaran Karyawan per Kantor</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {officeCounts.map((oc, i) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-stone-700">{oc.name}</span>
                <span className="text-sm font-bold text-[#C23E00]">{oc.count} org</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdminPage;
