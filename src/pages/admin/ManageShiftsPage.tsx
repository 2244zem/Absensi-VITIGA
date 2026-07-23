import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import ShiftFormModal from '../../components/admin/ShiftFormModal';
import { getOfficeShifts, deleteOfficeShift } from '../../services/api/shifts';
import type { OfficeShift } from '../../types/shift';

const ManageShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<OfficeShift[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<OfficeShift | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const data = await getOfficeShifts();
      setShifts(data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShifts(); }, []);

  const handleDelete = async (shift: OfficeShift) => {
    if (!window.confirm(`Hapus pengaturan shift "${shift.office?.name || ''}"?`)) return;
    try {
      await deleteOfficeShift(shift.id);
      fetchShifts();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus pengaturan shift');
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Pengaturan Waktu Shift</h1>
          <p className="text-sm text-stone-500 mt-0.5">Atur default jam datang, telat, & pulang per kantor</p>
        </div>
        <button onClick={() => { setSelectedShift(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 bg-[#C23E00] hover:bg-[#a13300] text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm text-sm">
          <Plus className="w-4 h-4" />
          Tambah Shift
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-[#C23E00] rounded-full animate-spin" />
            <span className="ml-2 text-sm text-stone-500">Memuat...</span>
          </div>
        ) : shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm py-16 text-center text-sm text-stone-400">
            Belum ada pengaturan shift. Tambah pengaturan pertama Anda.
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#C23E00] flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1917] text-base">{shift.office?.name || 'Kantor'}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
                      <span>Datang: <strong>{shift.check_in_time.slice(0, 5)}</strong></span>
                      <span>Telat: <strong>{shift.late_threshold.slice(0, 5)}</strong></span>
                      <span>Pulang: <strong>{shift.check_out_time.slice(0, 5)}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => { setSelectedShift(shift); setIsFormOpen(true); }} title="Edit"
                    className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(shift)} title="Hapus"
                    className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ShiftFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedShift(null); fetchShifts(); }}
        shift={selectedShift}
        offices={[]}
      />
    </div>
  );
};

export default ManageShiftsPage;
