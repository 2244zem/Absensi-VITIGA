import React, { useState, useEffect } from 'react';
import { Download, Search, Calendar, Paperclip, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import MedicalProofViewer from '../../components/leave/MedicalProofViewer';
import { getAllAttendances, getAttendanceStats } from '../../services/api/attendances';
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
    </div>
  );
};

export default AttendanceReportsPage;
