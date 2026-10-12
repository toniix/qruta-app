import { Search, X, Plus } from 'lucide-react';

export function AdminFilterBar({
  searchQuery = '',
  onSearchChange,
  placeholder = 'Buscar...',
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-card">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs text-slate-800 placeholder:text-slate-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Custom filter select dropdowns (e.g. by line, by city, by category) */}
        {children}
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 active:scale-[0.98] shrink-0"
        >
          <ActionIcon className="h-4 w-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
