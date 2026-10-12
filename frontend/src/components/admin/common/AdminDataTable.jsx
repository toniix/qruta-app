import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  Plus,
} from 'lucide-react';

export function AdminDataTable({
  columns,
  data = [],
  loading = false,
  emptyTitle = 'No hay registros',
  emptyDescription = 'No se encontraron elementos para mostrar.',
  emptyActionLabel,
  onEmptyAction,
  initialPageSize = 10,
  caption,
  rowKey = 'id',
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    const sorted = [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedData.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              {columns.map((col) => {
                const isSorted = sortConfig.key === col.key;
                const canSort = col.sortable !== false && col.key;

                return (
                  <th
                    key={col.key || col.label}
                    scope="col"
                    style={{ width: col.width }}
                    className={`px-4 py-3 whitespace-nowrap ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${canSort ? 'cursor-pointer select-none hover:text-slate-900 transition-colors' : ''}`}
                    onClick={() => canSort && handleSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right'
                          ? 'justify-end'
                          : col.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                      }`}
                    >
                      <span>{col.label}</span>
                      {canSort && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-blue-600" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((c, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Inbox className="h-6 w-6" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{emptyTitle}</h3>
                    <p className="mt-1 text-xs text-slate-500">{emptyDescription}</p>
                    {emptyActionLabel && onEmptyAction && (
                      <button
                        type="button"
                        onClick={onEmptyAction}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-card transition hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        {emptyActionLabel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const key = item[rowKey] || index;
                return (
                  <tr
                    key={key}
                    className="transition-colors hover:bg-slate-50/70 group"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key || col.label}
                        className={`px-4 py-3 align-middle ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong className="font-semibold text-slate-900">{startIndex + 1}</strong> a{' '}
              <strong className="font-semibold text-slate-900">{endIndex}</strong> de{' '}
              <strong className="font-semibold text-slate-900">{sortedData.length}</strong> registros
            </span>
            <div className="hidden sm:flex items-center gap-1 ml-4 border-l border-slate-200 pl-4">
              <span className="text-slate-500">Filas:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              aria-label="Primera página"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={validCurrentPage === 1}
              aria-label="Página anterior"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2.5 text-xs font-semibold text-slate-700">
              Página {validCurrentPage} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={validCurrentPage === totalPages}
              aria-label="Página siguiente"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              aria-label="Última página"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
