import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

interface CooldownProps {
  onBack: () => void;
  remainingMs?: number;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const CooldownLockMessage: React.FC<CooldownProps> = ({ onBack, remainingMs = 0 }) => {
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
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center border border-stone-100 flex flex-col items-center">
          <div className="mb-4">
            <Lock className="w-12 h-12 text-[#C23E00]" strokeWidth={2} />
          </div>

          <h2 className="text-xl font-bold text-[#C23E00] mb-6">Absen Pulang Terkunci</h2>

          <div className="bg-stone-100 w-full py-6 rounded-xl mb-6 flex flex-col items-center justify-center">
            <span className="text-5xl font-black tracking-tight text-[#1C1917] mb-1">{formatTime(remainingMs)}</span>
            <span className="text-[10px] font-bold text-stone-500 tracking-widest">LAGI</span>
          </div>

          <p className="text-sm text-stone-600 mb-8 leading-relaxed px-2">
            Sistem memberlakukan jeda minimal 20-30 menit setelah Absen Masuk untuk mencegah manipulasi.
          </p>

          <button disabled className="w-full bg-stone-100 text-stone-400 font-bold py-3.5 rounded-xl cursor-not-allowed">
            Absen Pulang
          </button>
        </div>
      </div>
    </div>
  );
};

export default CooldownLockMessage;
