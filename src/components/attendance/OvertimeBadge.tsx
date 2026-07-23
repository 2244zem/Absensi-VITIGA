import React from 'react';
import { Check } from 'lucide-react';

interface OvertimeBadgeProps {
  onConfirm: () => void;
  onSkip: () => void;
  time?: string;
  submitting?: boolean;
}

const OvertimeBadge: React.FC<OvertimeBadgeProps> = ({ onConfirm, onSkip, time, submitting }) => {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center border border-stone-200/80">
        <div className="w-20 h-20 rounded-full border-4 border-[#C23E00] flex items-center justify-center mb-5">
          <Check className="w-10 h-10 text-[#C23E00]" strokeWidth={3} />
        </div>

        <h2 className="text-xl font-black text-[#1C1917] mb-2 tracking-tight">
          Absen Pulang Berhasil
        </h2>
        {time && (
          <p className="text-sm text-stone-500 mb-6">{time} WIB</p>
        )}

        <div className="w-full h-px bg-stone-100 mb-6" />

        <p className="text-sm text-stone-600 font-medium leading-relaxed px-4 mb-8">
          Anda absen di atas jam 18:00. Apakah Anda ingin mengajukan Lembur (Overtime)?
        </p>

        <div className="w-full flex flex-col gap-3">
          <button onClick={onConfirm} disabled={submitting}
            className="w-full bg-[#C23E00] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform shadow-md disabled:opacity-50">
            {submitting ? 'Menyimpan...' : 'Ya, Ajukan Lembur'}
          </button>
          <button onClick={onSkip} disabled={submitting}
            className="w-full bg-white text-[#C23E00] border-2 border-[#C23E00] font-bold py-3 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50">
            Tidak, Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvertimeBadge;
