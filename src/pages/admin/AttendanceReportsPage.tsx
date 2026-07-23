import React, { useState, useEffect } from 'react';
import { Download, Search, Calendar, Paperclip, CheckCircle, Clock, AlertCircle, Pencil, Trash2, X } from 'lucide-react';
import MedicalProofViewer from '../../components/leave/MedicalProofViewer';
import { getAllAttendances, getAttendanceStats, deleteAttendance, updateAttendance } from '../../services/api/attendances';
import { getOffices } from '../../services/api/offices';
import { getUsers } from '../../services/api/auth';
import type { AttendanceRecord, AttendanceStats } from '../../types/attendance';
import type { Office } from '../../types/office';
import type { UserProfile } from '../../types/user';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status: string, is_overtime: boolean) {
  const label = is_overtime || status === 'hadir_lembur' ? 'Hadir (Lembur)' : status === 'hadir' ? 'Hadir' : status === 'sakit' ? 'Sakit' : 'Izin';
  const cls = status === 'hadir' && !is_overtime ? 'bg-emerald-50 text-emerald-700' : (status === 'hadir_lembur' || is_overtime) ? 'bg-orange-50 text-orange-700' : status === 'sakit' ? 'bg-blue-50 text-blue-700' : status === 'izin' ? 'bg-stone-100 text-stone-600' : 'bg-stone-100 text-stone-600';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

const AttendanceReportsPage: React.FC = () => {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [officeFilter, setOfficeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [editTarget, setEditTarget] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const pageSize = 10;

  const fetchData = async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const [attData, statsData, officesData, usersData] = await Promise.all([
        getAllAttendances(filters),
        getAttendanceStats(),
        getOffices(),
        getUsers().catch(() => [] as UserProfile[]),
      ]);

      const enriched = (attData || []).map((att: any) => {
        const profile = (usersData as UserProfile[]).find((u: UserProfile) => u.id === att.user_id);
        const office = officesData?.find((o: Office) => o.id === att.office_id);
        return {
          ...att,
          profiles: profile ? { full_name: profile.full_name, email: profile.email || '' } : undefined,
          offices: office ? { name: office.name } : undefined,
        };
      });

      setAttendances(enriched);
      setStats(statsData);
      setOffices(officesData || []);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredAttendances = attendances.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.profiles?.full_name?.toLowerCase().includes(q) || a.profiles?.email?.toLowerCase().includes(q);
  });

  const applyFilters = () => {
    setCurrentPage(1);
    fetchData({
      status: statusFilter, officeId: officeFilter || undefined,
      startDate: startDate || undefined, endDate: endDate || undefined,
    });
  };

  const paginatedData = filteredAttendances.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredAttendances.length / pageSize);

  const exportCSV = () => {
    const headers = ['Tanggal', 'Nama', 'Email', 'Kantor', 'Masuk', 'Pulang', 'Status', 'Catatan'];
    const csv = [
      headers.join(','),
      ...filteredAttendances.map(a => [
        formatDate(a.check_in),
        `"${(a.profiles?.full_name || '-').replace(/"/g, '""')}"`,
        `"${(a.profiles?.email || '-').replace(/"/g, '""')}"`,
        `"${(a.offices?.name || '-').replace(/"/g, '""')}"`,
        formatTime(a.check_in),
        formatTime(a.check_out),
        a.is_overtime || a.status === 'hadir_lembur' ? 'Hadir (Lembur)' : a.status === 'hadir' ? 'Hadir' : a.status === 'sakit' ? 'Sakit' : 'Izin',
        `"${(a.notes || '').replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-absensi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (att: AttendanceRecord) => {
    setEditTarget(att);
    setEditStatus(att.is_overtime || att.status === 'hadir_lembur' ? 'hadir_lembur' : att.status);
    setEditNotes(att.notes || '');
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await updateAttendance(editTarget.id, {
        status: editStatus,
        is_overtime: editStatus === 'hadir_lembur',
        notes: editNotes.trim(),
      });
      setEditTarget(null);
      fetchData();
    } catch (e: any) {
      alert('Gagal update: ' + (e.message || ''));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteAttendance(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (e: any) {
      alert('Gagal hapus: ' + (e.message || ''));
    } finally {
      setDeleteSaving(false);
    }
  };

  const statsCards = [
    { title: 'Total Hadir', count: stats?.total_hadir ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Lembur', count: stats?.total_lembur ?? 0, icon: Clock, color: 'text-[#C23E00]', bg: 'bg-orange-50' },
    { title: 'Sakit', count: stats?.total_sakit ?? 0, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Izin', count: stats?.total_izin ?? 0, icon: Calendar, color: 'text-stone-600', bg: 'bg-stone-100' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Laporan Absensi</h1>
          <p className="text-sm text-stone-500 mt-0.5">Pantau data kehadiran karyawan</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm text-sm">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4 lg:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{s.title}</span>
              <div className={`p-1.5 rounded-lg ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1C1917]">{s.count}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4 lg:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Cari</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00] focus:ring-2 focus:ring-[#C23E00]/10" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Dari</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Sampai</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]">
              <option>Semua Status</option>
              <option>Hadir</option><option>Hadir (Lembur)</option><option>Sakit</option><option>Izin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Kantor</label>
            <select value={officeFilter} onChange={e => setOfficeFilter(e.target.value)}
              className="w-full px-3 py-2 mb-0.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]">
              <option value="">Semua</option>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <button onClick={applyFilters}
            className="px-5 py-2 bg-[#1C1917] text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors lg:mb-0">
            Filter
          </button>
        </div>
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
        ) : attendances.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-stone-400 text-sm">Belum ada data absensi</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Karyawan</th>
                    <th className="px-5 py-3">Kantor</th>
                    <th className="px-5 py-3">Masuk</th>
                    <th className="px-5 py-3">Pulang</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-center">Bukti</th>
                    <th className="px-5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {paginatedData.map((att) => (
                    <tr key={att.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-[#1C1917]">{formatDate(att.check_in)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#C23E00]/10 text-[#C23E00] flex items-center justify-center text-xs font-bold">
                            {(att.profiles?.full_name || '?').charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-[#1C1917]">{att.profiles?.full_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-600">{att.offices?.name || '-'}</td>
                      <td className="px-5 py-4 text-sm">{formatTime(att.check_in)}</td>
                      <td className="px-5 py-4 text-sm">{formatTime(att.check_out)}</td>
                      <td className="px-5 py-4 text-sm">{statusBadge(att.status, att.is_overtime)}</td>
                      <td className="px-5 py-4 text-center">
                        {att.proof_url ? (
                          <button onClick={() => { setSelectedAttendance(att); setIsMedicalModalOpen(true); }}
                            className="w-8 h-8 rounded-lg bg-orange-50 text-[#C23E00] hover:bg-[#C23E00] hover:text-white transition-colors flex items-center justify-center">
                            <Paperclip className="w-4 h-4" />
                          </button>
                        ) : <span className="text-stone-400">-</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(att)}
                            className="w-8 h-8 rounded-lg bg-stone-100 text-stone-600 hover:bg-[#C23E00] hover:text-white transition-colors flex items-center justify-center"
                            title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(att)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center"
                            title="Hapus">
                            <Trash2 className="w-4 h-4" />
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
                <span>{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, attendances.length)} of {attendances.length}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-stone-200 hover:bg-stone-100">&lt;</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1 rounded-lg border text-xs font-semibold ${p === currentPage ? 'bg-[#C23E00] text-white border-[#C23E00]' : 'border-stone-200 hover:bg-stone-100'}`}>{p}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg border border-stone-200 hover:bg-stone-100">&gt;</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedAttendance && (
        <MedicalProofViewer
          isOpen={isMedicalModalOpen}
          onClose={() => { setIsMedicalModalOpen(false); setSelectedAttendance(null); }}
          employeeName={selectedAttendance?.profiles?.full_name || 'Karyawan'}
          date={formatDate(selectedAttendance.check_in)}
          type={selectedAttendance.status === 'sakit' ? 'Sakit' : selectedAttendance.status === 'izin' ? 'Izin' : '-'}
          notes={selectedAttendance.notes || '-'}
          proofUrl={selectedAttendance.proof_url}
        />
      )}

      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-stone-200/80">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1C1917]">Edit Absensi</h2>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]">
                  <option value="hadir">Hadir</option>
                  <option value="hadir_lembur">Hadir (Lembur)</option>
                  <option value="sakit">Sakit</option>
                  <option value="izin">Izin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Catatan</label>
                <textarea rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50 transition-all">
                Batal
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#C23E00] text-white font-bold text-sm hover:bg-[#a13300] transition-all disabled:opacity-50">
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-stone-200/80 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1C1917] mb-2">Hapus Absensi?</h2>
            <p className="text-sm text-stone-500 mb-6">
              Data absensi karyawan ini akan dihapus permanen. Yakin ingin melanjutkan?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50 transition-all">
                Batal
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteSaving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50">
                {deleteSaving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReportsPage;
