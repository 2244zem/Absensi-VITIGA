import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { upsertOfficeShift, getOfficesWithoutShift } from '../../services/api/shifts';
import type { OfficeShift } from '../../types/shift';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: OfficeShift | null;
  offices: { id: string; name: string }[];
}

const ShiftFormModal: React.FC<ShiftFormModalProps> = ({ isOpen, onClose, shift, offices }) => {
  const [officeId, setOfficeId] = useState('');
  const [checkIn, setCheckIn] = useState('08:00');
  const [lateThreshold, setLateThreshold] = useState('10:00');
  const [checkOut, setCheckOut] = useState('18:00');
  const [availableOffices, setAvailableOffices] = useState<{ id: string; name: string }[]>(offices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    const load = async () => {
      try {
        const free = await getOfficesWithoutShift();
        const base = shift ? [...free, { id: shift.office_id, name: shift.office?.name || '' }] : free;
        setAvailableOffices(base);
      } catch {}
    };
    load();
    if (shift) {
      setOfficeId(shift.office_id);
      setCheckIn(shift.check_in_time.slice(0, 5));
      setLateThreshold(shift.late_threshold.slice(0, 5));
      setCheckOut(shift.check_out_time.slice(0, 5));
    } else {
      setOfficeId('');
      setCheckIn('08:00');
      setLateThreshold('10:00');
      setCheckOut('18:00');
    }
  }, [isOpen, shift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!officeId) { setError('Pilih kantor terlebih dahulu'); return; }
    if (lateThreshold <= checkIn) { setError('Jam telat harus setelah jam datang'); return; }
    if (checkOut <= lateThreshold) { setError('Jam pulang harus setelah jam telat'); return; }
    setLoading(true);
    try {
      await upsertOfficeShift({
        office_id: officeId,
        check_in_time: `${checkIn}:00`,
        late_threshold: `${lateThreshold}:00`,
        check_out_time: `${checkOut}:00`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan shift');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm w-full max-w-lg overflow-hidden text-[#1C1917]">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h2 className="text-lg font-bold">{shift ? 'Edit Pengaturan Shift' : 'Tambah Pengaturan Shift'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Kantor</label>
            <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} disabled={!!shift}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10 disabled:bg-stone-100 disabled:text-stone-500" required>
              <option value="">-- Pilih Kantor --</option>
              {availableOffices.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-1.5">Jam Datang</label>
              <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-1.5">Jam Telat</label>
              <input type="time" value={lateThreshold} onChange={(e) => setLateThreshold(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-1.5">Jam Pulang</label>
              <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-500">
            Default: Datang <strong>08:00</strong>, Telat <strong>10:00</strong>, Pulang <strong>18:00</strong>. Jam telat harus lebih dari jam datang.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#C23E00] hover:bg-[#a13300] rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftFormModal;
