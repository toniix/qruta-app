import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Route, AlertCircle, RefreshCw } from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { matchesCategory } from '../../components/search/categoryFilter';

/** Categories dynamically generated or default */
const CATEGORIES = [
  { id: 'all', label: 'Todas las rutas' },
  { id: 'urbano', label: 'Urbano' },
  { id: 'interurbano', label: 'Interurbano' },
  { id: 'nocturno', label: 'Nocturno' },
];

export function RoutesListPage() {
  const { routes, selectRoute, selectStop, currentCity, loading, error, loadData } = useRoutes();
  const cityName = currentCity?.name || 'Ica';
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  /* Filter routes based on search text and selected category */
  const filteredRoutes = useMemo(() => {
    let result = routes;

    if (activeCategory !== 'all') {
      result = result.filter((r) => matchesCategory(r, activeCategory));
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
    navigate(`/mapa/ruta/${route.id}`, { state: { from: "/rutas" } });
  };

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-slate-50/70 overflow-hidden">
      {/* ── Top Header / Search & Category Filters ────────────────────────── */}
      <header className="bg-white pt-3.5 sm:pt-4 pb-3 px-4 sm:px-6 space-y-3 border-b border-slate-200/80 shadow-2xs shrink-0 z-20">
        {/* Title & Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 truncate">
              <span className="p-1 rounded-lg bg-surface-navy text-brand-lime shrink-0">
                <Route className="w-4 h-4" />
              </span>
              <span className="truncate">Rutas en {cityName}</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
              Líneas y recorridos de transporte público
            </p>
          </div>

          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 shrink-0"
          >
            {loading ? 'Cargando…' : `${filteredRoutes.length} rutas`}
          </span>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, avenida o empresa..."
            className="w-full bg-slate-100/90 rounded-xl py-2.5 pl-10 pr-9 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white border border-slate-200/60 text-xs sm:text-sm font-medium transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
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
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-brand-navy text-brand-lime font-extrabold border border-border-navy shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 font-semibold border border-slate-200/60 hover:bg-slate-200/60'
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
        {loading ? (
          <div className="space-y-4" role="status" aria-label="Cargando rutas">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-9 rounded-2xl bg-slate-200/80 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200/80 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="border-t border-slate-100/90 mt-4 pt-4 space-y-2.5">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="bg-red-50 text-red-700 text-xs font-semibold p-4 rounded-2xl border border-red-100 shadow-2xs flex flex-wrap items-center gap-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="flex-1 min-w-40">{error}</span>
            <button
              type="button"
              onClick={() => loadData(currentCity?.id)}
              className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3.5 py-2 rounded-xl hover:bg-red-700 transition-colors shrink-0 min-h-11"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-2xs space-y-3 animate-fade-in">
            <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No se encontraron rutas</h3>
            <p className="text-xs text-slate-500">
              {activeCategory !== 'all' && searchQuery.trim() === ''
                ? `No hay rutas de tipo “${CATEGORIES.find((c) => c.id === activeCategory)?.label}” registradas en ${cityName} todavía.`
                : 'Prueba con otro término de búsqueda o revisa las paradas cercanas en el mapa.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="text-xs font-bold text-brand-primary bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors inline-block"
            >
              Restablecer filtros
            </button>
            {searchQuery.trim() !== '' && (
              <button
                onClick={() =>
                  navigate('/buscar', { state: { query: searchQuery.trim() } })
                }
                className="text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                ¿Buscás rutas de otra ciudad? Buscar en todas las ciudades
              </button>
            )}
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
                role="button"
                tabIndex={0}
                onClick={() => handleSelectRoute(route)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectRoute(route);
                  }
                }}
                aria-label={`Ver recorrido de la ruta ${route.code || 'Ruta'}: ${route.name.replace(/^Ruta \w+:\s*/i, '')}`}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card space-y-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
                      <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-brand-primary transition-colors truncate">
                        {route.name.replace(/^Ruta \w+:\s*/i, '')}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                        {route.transportLineName || 'Línea urbana'}
                      </p>
                    </div>
                  </div>

                  {/* Fare */}
                  <div className="text-right shrink-0">
                    <span className="text-brand-primary font-bold text-base block">
                      {route.fare || '—'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium block">
                      {route.frequency || '—'}
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
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-brand-primary bg-brand-primary shrink-0" />
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
