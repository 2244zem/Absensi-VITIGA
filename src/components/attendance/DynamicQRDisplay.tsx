import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Users, CalendarCheck, ClipboardX, Clock } from 'lucide-react';

interface DynamicQRDisplayProps {
  token: string | null;
  timeLeft: number;
  refreshInterval: number;
  loading: boolean;
  stats?: {
    total_hadir: number;
    total_lembur: number;
    total_sakit: number;
    total_izin: number;
  };
}

const DynamicQRDisplay: React.FC<DynamicQRDisplayProps> = ({
  token,
  timeLeft,
  refreshInterval,
  loading,
  stats,
}) => {
  const maxTime = refreshInterval;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / maxTime) * circumference;

  const summaryCards = [
    { label: 'Total Hadir', count: stats?.total_hadir ?? 0, icon: Users, color: 'bg-[#a3e635]', textColor: 'text-[#4d7c54]' },
    { label: 'Hadir Lembur', count: stats?.total_lembur ?? 0, icon: CalendarCheck, color: 'bg-orange-100', textColor: 'text-[#C23E00]' },
    { label: 'Sakit/Izin', count: (stats?.total_sakit ?? 0) + (stats?.total_izin ?? 0), icon: ClipboardX, color: 'bg-gray-200', textColor: 'text-gray-600' },
    { label: 'Total Hari Ini', count: (stats?.total_hadir ?? 0) + (stats?.total_lembur ?? 0) + (stats?.total_sakit ?? 0) + (stats?.total_izin ?? 0), icon: Clock, color: 'bg-gray-200', textColor: 'text-gray-600' },
  ];

  return (
    <div className="w-full flex flex-col items-center justify-between h-full gap-6">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full flex-1 flex flex-col items-center justify-center p-8 lg:p-12 border border-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="w-[320px] h-[240px] border-2 border-gray-300 rounded-lg bg-gray-50 mb-8 flex items-center justify-center relative overflow-hidden shadow-inner p-2 z-10">
          <div className="w-full h-full bg-white flex flex-col items-center justify-center shadow-sm">
            <div className="text-[10px] font-bold text-gray-500 mb-2">VISITIGA QR Code</div>
            {loading ? (
              <div className="w-24 h-24 flex items-center justify-center text-gray-300">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C23E00] rounded-full" />
              </div>
            ) : token ? (
              <QRCodeCanvas value={token} size={96} level="M" />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center text-gray-300 text-xs">Tidak ada token</div>
            )}
            <div className="text-[10px] mt-2">Scan untuk absensi</div>
          </div>
        </div>

        <h2 className="text-4xl font-extrabold text-gray-900 mb-3 z-10 tracking-tight">Scan QR Code</h2>
        <p className="text-sm text-gray-500 mb-10 z-10 text-center max-w-sm">
          Scan QR menggunakan kamera HP untuk <span className="font-bold text-gray-800">Absen Masuk / Pulang</span>.
        </p>

        <div className="flex flex-col items-center z-10">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r={radius} stroke="#f3f4f6" strokeWidth="5" fill="none" />
              <circle
                cx="40" cy="40" r={radius}
                stroke="#C23E00" strokeWidth="5" fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xl font-bold text-[#C23E00]">{timeLeft}</span>
          </div>
          <span className="text-[10px] font-bold text-[#C23E00] tracking-widest mt-3 uppercase">Refreshing Code</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-4 gap-4">
        {summaryCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
              </div>
              <span className="text-xs font-semibold text-gray-500">{stat.label}</span>
            </div>
            <span className={`text-xl font-bold ${idx < 2 ? 'text-gray-900' : 'text-gray-600'}`}>{stat.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DynamicQRDisplay;
