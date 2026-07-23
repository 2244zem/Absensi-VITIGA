import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { createUser } from '../../services/api/auth';
import { getOffices } from '../../services/api/offices';
import type { Office } from '../../types/office';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose }) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    getOffices().then(data => {
      setOffices(data || []);
      if (data && data.length > 0) setOfficeId(data[0].id);
    }).catch(() => {});
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createUser(email, password, fullName, role, officeId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat akun');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm w-full max-w-lg overflow-hidden text-[#1C1917]">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h2 className="text-lg font-bold">Tambah Akun Karyawan Baru</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Nama Lengkap</label>
            <input type="text" placeholder="Masukkan nama lengkap" value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Email Perusahaan</label>
            <input type="email" placeholder="name@company.com" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Password Default</label>
            <input type="password" placeholder="Min. 6 karakter" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" required minLength={6} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1.5">Penempatan Kantor</label>
            <select value={officeId} onChange={e => setOfficeId(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10 bg-white" required>
              <option value="" disabled>Pilih Penempatan</option>
              {offices.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-2">Role Akun</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" value="employee" checked={role === 'employee'}
                  onChange={() => setRole('employee')}
                  className="text-[#C23E00] focus:ring-[#C23E00]" />
                <span className="text-sm text-stone-700">Karyawan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" value="admin" checked={role === 'admin'}
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
              {loading ? 'Menyimpan...' : 'Simpan Akun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
