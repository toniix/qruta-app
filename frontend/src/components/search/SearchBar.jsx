import { Search } from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';

export function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    clearSelection,
  } = useRoutes();

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Search className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
            ¿A dónde quieres ir?
          </h2>
        </div>
      </div>

      <div className="relative flex items-center w-full shadow-md rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md border border-slate-200/90 focus-within:ring-2 focus-within:ring-blue-500/40 transition-all">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar ruta, paradero o línea..."
          className="w-full pl-10 pr-10 py-2.5 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              clearSelection();
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
          >
            <Search className="w-3.5 h-3.5 rotate-45" />
          </button>
        )}
      </div>
    </div>
  );
}
