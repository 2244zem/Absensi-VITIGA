import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import CreateUserModal from '../../components/admin/CreateUserModal';
import EditUserModal from '../../components/admin/EditUserModal';
import UserDetailModal from '../../components/admin/UserDetailModal';
import { getUsers, deleteUser } from '../../services/api/auth';
import { getOffices } from '../../services/api/offices';
import type { UserProfile } from '../../types/user';
import type { Office } from '../../types/office';

const ManageUsersPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(UserProfile & { offices?: { name: string } }) | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [users, setUsers] = useState<(UserProfile & { offices?: { name: string } })[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, officesData] = await Promise.all([getUsers(), getOffices()]);
      setUsers(usersData || []);
      setOffices(officesData || []);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || u.full_name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    const matchesOffice = !officeFilter || u.office_id === officeFilter;
    return matchesSearch && matchesOffice;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<(UserProfile & { offices?: { name: string } }) | null>(null);

  const openDetail = (user: UserProfile & { offices?: { name: string } }) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (user: UserProfile & { offices?: { name: string } }) => {
    setEditUser(user);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (user: UserProfile & { offices?: { name: string } }) => {
    if (!window.confirm(`Hapus akun "${user.full_name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteUser(user.id);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus akun');
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Kelola Akun Karyawan</h1>
          <p className="text-sm text-stone-500 mt-0.5">Kelola data akun dan penempatan kantor</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-[#C23E00] hover:bg-[#a13300] text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Akun
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10"
          />
        </div>
        <select
          value={officeFilter}
          onChange={e => { setOfficeFilter(e.target.value); setCurrentPage(1); }}
          className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10"
        >
          <option value="">Semua Lokasi</option>
          {offices.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-[#C23E00] rounded-full animate-spin" />
            <span className="ml-2 text-sm text-stone-500">Memuat...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-500 gap-2">
            <span className="text-sm">{error}</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
            Tidak ada data karyawan
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Karyawan</th>
                    <th className="px-5 py-3">Kontak</th>
                    <th className="px-5 py-3">Penempatan</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#C23E00]/10 text-[#C23E00] flex items-center justify-center font-bold text-sm overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="font-medium text-sm text-[#1C1917]">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-500">{u.email || '-'}</td>
                      <td className="px-5 py-4 text-sm text-stone-600 font-medium">{u.offices?.name || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-md ${
                          u.role === 'admin' ? 'bg-orange-50 text-[#C23E00]' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Employee'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openDetail(u)} title="Detail"
                            className="p-2 rounded-lg text-[#C23E00] bg-orange-50 hover:bg-[#C23E00] hover:text-white transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleEdit(u)} title="Edit"
                            className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(u)} title="Hapus"
                            className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-sm text-stone-500">
                <span>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 transition-all">&lt;</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${p === currentPage ? 'bg-[#C23E00] text-white border-[#C23E00]' : 'border-stone-200 hover:bg-stone-100'}`}>{p}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 transition-all">&gt;</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateUserModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); fetchData(); }} />
      <EditUserModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditUser(null); fetchData(); }} user={editUser} />
      <UserDetailModal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setSelectedUser(null); }} user={selectedUser} />
    </div>
  );
};

export default ManageUsersPage;
