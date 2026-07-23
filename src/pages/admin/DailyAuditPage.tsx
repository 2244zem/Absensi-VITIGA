import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Search, MapPin, CheckCircle2, Clock, AlertTriangle, XCircle, FileText, Download, Filter } from 'lucide-react';
import { getDailyAttendance } from '../../services/api/attendances';
import { getOffices } from '../../services/api/offices';
import { supabase } from '../../services/supabaseClient';
import type { Office } from '../../types/office';

function formatTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

const DailyAuditPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [officeFilter, setOfficeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, officesData] = await Promise.all([
        getDailyAttendance(selectedDate),
        getOffices().catch(() => []),
      ]);
      setRows(data || []);
      setOffices(officesData);
    } catch (e) {
      console.error('Audit fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('audit-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.full_name.toLowerCase().includes(q);
    const matchOffice = !officeFilter || r.office_name === offices.find(o => o.id === officeFilter)?.name;
    const matchStatus = statusFilter === 'Semua' || r.status === statusFilter;
    return matchSearch && matchOffice && matchStatus;
  });

  const summary = {
    total: filtered.length,
    hadir: filtered.filter(r => r.status === 'hadir').length,
    lembur: filtered.filter(r => r.status === 'hadir_lembur').length,
    sakit: filtered.filter(r => r.status === 'sakit').length,
    izin: filtered.filter(r => r.status === 'izin').length,
    alpha: filtered.filter(r => r.status === 'alpha').length,
    terlambat: filtered.filter(r => r.is_late).length,
  };

  const statusBadge = (status: string, isLate: boolean, isOvertime: boolean) => {
    if (status === 'alpha') return { label: 'Alpha', cls: 'bg-red-50 text-red-600 border-red-200' };
    if (status === 'hadir_lembur' || isOvertime) return { label: 'Hadir (Lembur)', cls: 'bg-orange-50 text-orange-700 border-orange-200' };
    if (status === 'sakit') return { label: 'Sakit', cls: 'bg-red-50 text-red-600 border-red-200' };
    if (status === 'izin') return { label: 'Izin', cls: 'bg-blue-50 text-blue-600 border-blue-200' };
    if (isLate) return { label: 'Hadir (Telat)', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Hadir', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const exportCSV = () => {
    const headers = ['Nama', 'Kantor', 'Jam Masuk', 'Jam Pulang', 'Status', 'Terlambat', 'Catatan'];
    const csv = [
      headers.join(','),
      ...filtered.map(r => [
        r.full_name,
        r.office_name,
        formatTime(r.check_in),
        formatTime(r.check_out),
        statusBadge(r.status, r.is_late, r.is_overtime).label,
        r.is_late ? 'Ya' : 'Tidak',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-absensi-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Audit Harian</h1>
          <p className="text-sm text-stone-500 mt-0.5">Rekap kehadiran semua karyawan per hari</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Date + Filters */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4 lg:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Tanggal</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Cari</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]" placeholder="Nama karyawan..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Kantor</label>
            <select value={officeFilter} onChange={e => setOfficeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]">
              <option value="">Semua Kantor</option>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-[#C23E00]">
              <option value="Semua">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="hadir_lembur">Lembur</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="alpha">Alpha</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Karyawan', count: summary.total, color: 'text-stone-600', bg: 'bg-stone-100' },
          { label: 'Hadir', count: summary.hadir, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Lembur', count: summary.lembur, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Sakit', count: summary.sakit, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Izin', count: summary.izin, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Alpha', count: summary.alpha, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200/80 shadow-sm p-3 lg:p-4 text-center">
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl lg:text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-[#C23E00] rounded-full animate-spin" />
            <span className="ml-2 text-sm text-stone-500">Memuat...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-stone-400 text-sm">Belum ada data untuk tanggal ini</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Kantor</th>
                  <th className="px-4 py-3">Masuk</th>
                  <th className="px-4 py-3">Pulang</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Telat</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((r, idx) => {
                  const badge = statusBadge(r.status, r.is_late, r.is_overtime);
                  return (
                    <tr key={r.user_id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-stone-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#C23E00]/10 text-[#C23E00] flex items-center justify-center text-xs font-bold">
                            {r.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1C1917]">{r.full_name}</p>
                            <p className="text-[10px] text-stone-400">{r.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">{r.office_name}</td>
                      <td className="px-4 py-3 text-sm font-mono">{formatTime(r.check_in)}</td>
                      <td className="px-4 py-3 text-sm font-mono">{formatTime(r.check_out)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.is_late ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold">
                            <Clock className="w-3 h-3" /> Ya
                          </span>
                        ) : r.status === 'alpha' ? (
                          <span className="text-red-400">-</span>
                        ) : (
                          <span className="text-emerald-500 text-xs font-semibold">Tidak</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500 italic max-w-[150px] truncate">
                        {r.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAuditPage;
