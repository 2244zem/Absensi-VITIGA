import React from 'react';
import { ArrowLeft, MapPinOff, Crosshair, Navigation, ShieldAlert, RefreshCw, Smartphone, MapPin } from 'lucide-react';

interface LocationStatusCardProps {
  onBack: () => void;
  onRetry?: () => void;
  distance?: number;
  officeName?: string;
  errorType?: 'permission' | 'out_of_range' | 'unavailable';
}

const LocationStatusCard: React.FC<LocationStatusCardProps> = ({ onBack, onRetry, distance = 0, officeName = 'Kantor', errorType = 'out_of_range' }) => {
  const isPermission = errorType === 'permission';

  return (
    <div className="fixed inset-0 z-40 bg-[#F0E9D3] flex flex-col">
      <header className="px-5 pt-10 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-stone-700">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-[#1C1917] text-lg">VISITIGA</h2>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-5 pt-2 pb-5">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center border border-stone-100">
          <div className={`${isPermission ? 'bg-amber-50' : 'bg-red-50'} p-4 rounded-2xl mb-4`}>
            {isPermission ? (
              <Smartphone className="w-10 h-10 text-amber-600" strokeWidth={2.5} />
            ) : (
              <MapPinOff className="w-10 h-10 text-[#C23E00]" strokeWidth={2.5} />
            )}
          </div>

          <h2 className="text-xl font-bold text-[#1C1917] text-center leading-tight mb-6">
            {isPermission ? 'Akses Lokasi Tidak Diizinkan' : 'Absensi Gagal: Di Luar Area Kantor'}
          </h2>

          {isPermission ? (
            <div className="bg-amber-50 w-full p-5 rounded-xl border border-amber-200 flex items-start gap-3 mb-6">
              <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed font-semibold">
                Harap aktifkan GPS di HP Anda untuk melanjutkan presensi.
              </p>
            </div>
          ) : (
            <div className="bg-red-50 w-full p-4 rounded-xl border border-red-100 flex items-start gap-3 mb-6">
              <ShieldAlert className="w-5 h-5 text-[#C23E00] shrink-0 mt-0.5" />
              <p className="text-sm text-[#C23E00] leading-relaxed">
                Jarak Anda saat ini: <span className="font-bold">{distance.toFixed(0)} meter</span> dari {officeName} (Maksimal 50 meter).
              </p>
            </div>
          )}

          <div className="w-full mb-8">
            <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3 px-1">
              {isPermission ? 'Cara Mengaktifkan GPS' : 'Troubleshooting Checklist'}
            </h3>
            <div className="space-y-2">
              {isPermission ? (
                <>
                  <div className="bg-stone-50 px-4 py-3 rounded-lg flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-stone-500 shrink-0" />
                    <span className="text-sm text-stone-700 font-medium">Buka Pengaturan HP</span>
                  </div>
                  <div className="bg-stone-50 px-4 py-3 rounded-lg flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
                    <span className="text-sm text-stone-700 font-medium">Aktifkan Layanan Lokasi (GPS)</span>
                  </div>
                  <div className="bg-stone-50 px-4 py-3 rounded-lg flex items-center gap-3">
                    <Navigation className="w-4 h-4 text-stone-500 shrink-0" />
                    <span className="text-sm text-stone-700 font-medium">Izinkan akses lokasi untuk browser ini</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-stone-50 px-4 py-3 rounded-lg flex items-center gap-3">
                    <Crosshair className="w-4 h-4 text-stone-500" />
                    <span className="text-sm text-stone-700 font-medium">Pastikan GPS aktif</span>
                  </div>
                  <div className="bg-stone-50 px-4 py-3 rounded-lg flex items-center gap-3">
                    <Navigation className="w-4 h-4 text-stone-500" />
                    <span className="text-sm text-stone-700 font-medium">Mendekat ke area kantor</span>
                  </div>
                  <div className="bg-stone-50 px-4 py-3 rounded-lg flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-stone-500" />
                    <span className="text-sm text-stone-700 font-medium">Matikan Fake GPS / VPN</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button onClick={onRetry} className="w-full bg-[#C23E00] hover:bg-[#a13300] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all mb-4">
            <RefreshCw className="w-4 h-4" />
            Coba Lagi / Refresh GPS
          </button>

          <button onClick={onBack} className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors">
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationStatusCard;
