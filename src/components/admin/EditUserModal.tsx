import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { updateUser } from '../../services/api/auth';
import { getOffices } from '../../services/api/offices';
import type { Office } from '../../types/office';
import type { UserProfile } from '../../types/user';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: (UserProfile & { offices?: { name: string } }) | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user }) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [fullName, setFullName] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !user) return;
    setFullName(user.full_name);
    setOfficeId(user.office_id || '');
    setRole(user.role);
    getOffices().then(data => setOffices(data || [])).catch(() => {});
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await updateUser(user.id, { full_name: fullName, office_id: officeId, role });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui akun');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm w-full max-w-lg overflow-hidden text-[#1C1917]">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h2 className="text-lg font-bold">Edit Akun Karyawan</h2>
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
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Nama Lengkap</label>
            <input type="text" value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Email</label>
            <input type="email" value={user.email || ''} disabled
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-stone-50 text-stone-400 cursor-not-allowed" />
            <p className="text-[10px] text-stone-400 mt-1">Email tidak dapat diubah</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Penempatan Kantor</label>
            <select value={officeId} onChange={e => setOfficeId(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10 bg-white">
              <option value="">Tanpa Kantor</option>
              {offices.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-2">Role Akun</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="edit-role" value="employee" checked={role === 'employee'}
                  onChange={() => setRole('employee')}
                  className="text-[#C23E00] focus:ring-[#C23E00]" />
                <span className="text-sm text-stone-700">Karyawan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="edit-role" value="admin" checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="text-[#C23E00] focus:ring-[#C23E00]" />
                <span className="text-sm text-stone-700">Admin</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#C23E00] hover:bg-[#a13300] rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
