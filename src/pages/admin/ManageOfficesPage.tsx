import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import OfficeFormModal from '../../components/admin/OfficeFormModal';
import { getOffices, deleteOffice } from '../../services/api/offices';
import type { Office } from '../../types/office';

const ManageOfficesPage: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOffices = async () => {
    try {
      setLoading(true);
      const data = await getOffices();
      setOffices(data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffices(); }, []);

  const handleDelete = async (office: Office) => {
    if (!window.confirm(`Hapus kantor "${office.name}"? Data terkait tidak bisa dikembalikan.`)) return;
    try {
      await deleteOffice(office.id);
      fetchOffices();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus kantor');
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Kelola Lokasi Kantor</h1>
          <p className="text-sm text-stone-500 mt-0.5">Atur titik koordinat geofencing & radius absensi</p>
        </div>
        <button onClick={() => { setSelectedOffice(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 bg-[#C23E00] hover:bg-[#a13300] text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm text-sm">
          <Plus className="w-4 h-4" />
          Tambah Kantor
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-[#C23E00] rounded-full animate-spin" />
            <span className="ml-2 text-sm text-stone-500">Memuat...</span>
          </div>
        ) : offices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm py-16 text-center text-sm text-stone-400">
            Belum ada data kantor. Tambah kantor pertama Anda.
          </div>
        ) : (
          offices.map(office => (
            <div key={office.id} className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#C23E00] flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1917] text-base">{office.name}</h3>
                    <p className="text-sm text-stone-500 mt-0.5">{office.address}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
                      <span>Lat: <strong>{office.latitude}</strong></span>
                      <span>Lng: <strong>{office.longitude}</strong></span>
                      <span>Radius: <strong>{office.radius_meters}m</strong></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => { setSelectedOffice(office); setIsFormOpen(true); }} title="Edit"
                    className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(office)} title="Hapus"
                    className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <OfficeFormModal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setSelectedOffice(null); fetchOffices(); }} office={selectedOffice} />
    </div>
  );
};

export default ManageOfficesPage;
