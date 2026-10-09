import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Route } from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';

/** Categories dynamically generated or default */
const CATEGORIES = [
  { id: 'all', label: 'Todas las rutas' },
  { id: 'urbano', label: 'Urbano' },
  { id: 'interurbano', label: 'Interurbano' },
  { id: 'nocturno', label: 'Nocturno' },
];

export function RoutesListPage() {
  const { routes, selectRoute, selectStop } = useRoutes();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  /* Filter routes based on search text and selected category */
  const filteredRoutes = useMemo(() => {
    let result = routes;

    if (activeCategory !== 'all') {
      const cat = activeCategory.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(cat) ||
          r.transportLineName?.toLowerCase().includes(cat) ||
          r.description?.toLowerCase().includes(cat),
      );
    }

    if (searchQuery.trim() !== '') {
      const term = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          r.transportLineName?.toLowerCase().includes(term) ||
          (r.keyStops || []).some((s) => s.name?.toLowerCase().includes(term)),
      );
    }

    return result;
  }, [routes, searchQuery, activeCategory]);

  const handleSelectRoute = (route, stop = null) => {
    selectRoute(route);
    if (stop) selectStop(stop);
    navigate(`/mapa/ruta/${route.id}`);
  };

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-slate-50/70 overflow-hidden">
      {/* ── Top Header / Search & Category Filters ────────────────────────── */}
      <header className="bg-white pt-10 pb-4 px-5 space-y-4 border-b border-slate-100/90 shadow-2xs shrink-0 z-20">
        {/* Title & Subtitle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-600 shrink-0" />
              Catálogo de Rutas
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Líneas y recorridos de transporte público en Ica
            </p>
          </div>

          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
            {filteredRoutes.length} disponibles
          </span>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, avenida o empresa..."
            className="w-full bg-slate-100/80 rounded-2xl py-3 pl-11 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 border-0 text-sm font-medium transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-0.5 pb-0.5">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 border border-slate-200/60 hover:bg-slate-200/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Routes Scrollable Vertical List ──────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-4 max-w-xl mx-auto w-full pb-28">
        {filteredRoutes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-2xs space-y-3 animate-fade-in">
            <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No se encontraron rutas</h3>
            <p className="text-xs text-slate-500">
              Intenta cambiando los términos de búsqueda o filtrando por otra categoría.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors inline-block"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const keyStops = route.keyStops || [];
            const origin = keyStops[0]?.name || 'Origen';
            const intermediate =
              keyStops.length > 2
                ? keyStops[Math.floor(keyStops.length / 2)]?.name
                : null;
            const destination = keyStops[keyStops.length - 1]?.name || 'Destino';
            const color = route.color || 'var(--color-brand-primary)';

            return (
              <div
                key={route.id}
                onClick={() => handleSelectRoute(route)}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card space-y-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
              >
                {/* Header Row: Badge | Name & Subtitle | Fare */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Badge */}
                    <div
                      className="w-14 h-9 text-white font-bold text-xs rounded-2xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs mt-0.5"
                      style={{ backgroundColor: color }}
                    >
                      {route.code || 'Ruta'}
                    </div>

                    {/* Name & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-blue-600 transition-colors truncate">
                        {route.name.replace(/^Ruta \w+:\s*/i, '')}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                        {route.transportLineName || 'Línea urbana'}
                      </p>
                    </div>
                  </div>

                  {/* Fare */}
                  <div className="text-right shrink-0">
                    <span className="text-blue-600 font-bold text-base block">
                      {route.fare || 'S/ 2.00'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium block">
                      {route.frequency || 'Cada 8 min'}
                    </span>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-slate-100/90" />

                {/* Vertical Timeline Stop Route */}
                <div className="relative pl-6 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/80">
                  {/* Origin */}
                  <div className="relative flex items-center justify-between text-xs">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white shrink-0" />
                    <span className="font-medium text-slate-600 truncate">{origin}</span>
                  </div>

                  {/* Intermediate (if exists) */}
                  {intermediate && (
                    <div className="relative flex items-center justify-between text-xs">
                      <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                      <span className="font-normal text-slate-500 truncate">{intermediate}</span>
                    </div>
                  )}

                  {/* Destination */}
                  <div className="relative flex items-center justify-between text-xs">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 truncate">{destination}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
