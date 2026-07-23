import React from 'react';
import { X, MapPin, CheckCircle2, XCircle } from 'lucide-react';

interface GeofenceMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkinLat?: number;
  checkinLng?: number;
  officeLat?: number;
  officeLng?: number;
  officeName?: string;
  distance?: number;
}

const GeofenceMapModal: React.FC<GeofenceMapModalProps> = ({
  isOpen,
  onClose,
  checkinLat,
  checkinLng,
  officeLat,
  officeLng,
  officeName = 'Kantor',
  distance,
}) => {
  if (!isOpen) return null;

  const withinRadius = distance !== undefined && distance <= 50;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm w-full max-w-3xl overflow-hidden text-[#1C1917]">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h2 className="font-bold text-base">Verifikasi Lokasi Absensi GPS</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative h-[400px] w-full bg-[#F0E9D3] overflow-hidden flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-64 h-64 bg-white/60 border-2 border-dashed border-[#C23E00]/30 rounded-full flex items-center justify-center mx-auto relative">
              <div className="absolute w-3 h-3 bg-[#C23E00] rounded-full ring-4 ring-white shadow-md"></div>
              <span className="absolute -top-8 bg-white px-3 py-1 rounded shadow text-xs font-bold whitespace-nowrap">{officeName.toUpperCase()}</span>
              {checkinLat && checkinLng && (
                <div className="absolute bottom-16 right-16 flex flex-col items-center">
                  <MapPin className="text-emerald-500 w-8 h-8 drop-shadow-md" fill="white" />
                  <div className="w-2 h-1 bg-black/20 rounded-full mt-1"></div>
                </div>
              )}
            </div>
            {distance !== undefined && (
              <p className="text-sm text-stone-600">
                Jarak: <span className="font-bold">{distance.toFixed(1)} meter</span>
                {withinRadius ? (
                  <span className="text-emerald-600 font-semibold ml-1">(Dalam Radius)</span>
                ) : (
                  <span className="text-[#C23E00] font-semibold ml-1">(Luar Radius)</span>
                )}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-6 text-xs text-stone-500">
              {checkinLat !== undefined && checkinLng !== undefined && (
                <span>Lokasi Anda: {checkinLat.toFixed(4)}, {checkinLng.toFixed(4)}</span>
              )}
              {officeLat !== undefined && officeLng !== undefined && (
                <span>Kantor: {officeLat.toFixed(4)}, {officeLng.toFixed(4)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className={`rounded-xl p-4 mb-6 flex items-center gap-4 ${withinRadius ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-100'}`}>
            <div>
              {withinRadius ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <XCircle className="w-6 h-6 text-[#C23E00]" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-0.5">Status Verifikasi</p>
              <p className="text-sm font-medium text-stone-800">
                {distance !== undefined ? (
                  <>
                    Jarak dari {officeName}: <span className="font-bold">{distance.toFixed(0)} meter</span>
                    {withinRadius ? (
                      <span className="font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded text-xs ml-1">DI DALAM RADIUS</span>
                    ) : (
                      <span className="font-bold bg-red-200 text-red-800 px-1.5 py-0.5 rounded text-xs ml-1">DI LUAR RADIUS</span>
                    )}
                  </>
                ) : 'Data lokasi tidak tersedia'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-stone-600 border border-stone-300 hover:bg-stone-50 rounded-xl transition-colors">Tutup</button>
            <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-white bg-[#C23E00] hover:bg-[#a13300] rounded-xl transition-colors shadow-sm">Konfirmasi</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeofenceMapModal;
