import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}

function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  error = null,
  emptyMessage = 'Tidak ada data',
  onRowClick,
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-[#C23E00] rounded-full animate-spin" />
        <span className="ml-2 text-sm text-stone-500">Memuat...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500 gap-2">
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wider sticky top-0 z-10">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`${onRowClick ? 'cursor-pointer hover:bg-stone-50' : ''} transition-colors`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 text-sm ${col.className || ''}`}>
                    {col.render ? col.render(item) : (item as any)[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {page !== undefined && totalPages !== undefined && totalPages > 1 && (
        <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-sm text-stone-500 shrink-0">
          {totalItems !== undefined && pageSize !== undefined && (
            <span>
              {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalItems)} of {totalItems}
            </span>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold ${
                  p === page
                    ? 'bg-[#C23E00] text-white border-[#C23E00]'
                    : 'border-stone-200 hover:bg-stone-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
