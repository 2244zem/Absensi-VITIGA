import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createOffice, updateOffice } from '../../services/api/offices';
import type { Office } from '../../types/office';

interface OfficeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  office: Office | null;
}

const OfficeFormModal: React.FC<OfficeFormModalProps> = ({ isOpen, onClose, office }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (office) {
      setName(office.name);
      setAddress(office.address);
      setLatitude(String(office.latitude));
      setLongitude(String(office.longitude));
      setRadiusMeters(String(office.radius_meters));
    } else {
      setName(''); setAddress(''); setLatitude(''); setLongitude(''); setRadiusMeters('50');
    }
  }, [isOpen, office]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radius = parseInt(radiusMeters, 10);
      if (isNaN(lat) || isNaN(lng)) throw new Error('Latitude dan Longitude harus angka valid');

      if (office) {
        await updateOffice(office.id, { name, address, latitude: lat, longitude: lng, radius_meters: radius });
      } else {
        await createOffice({ name, address, latitude: lat, longitude: lng, radius_meters: radius });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan kantor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm w-full max-w-lg overflow-hidden text-[#1C1917]">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h2 className="text-lg font-bold">{office ? 'Edit Kantor' : 'Tambah Kantor Baru'}</h2>
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
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Nama Kantor</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Alamat</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-1.5">Latitude</label>
              <input type="text" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-6.9152"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-1.5">Longitude</label>
              <input type="text" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="107.6578"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Radius (meter)</label>
            <input type="number" value={radiusMeters} onChange={e => setRadiusMeters(e.target.value)} min={10} max={500}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#C23E00] hover:bg-[#a13300] rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Menyimpan...' : office ? 'Simpan Perubahan' : 'Simpan Kantor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfficeFormModal;
