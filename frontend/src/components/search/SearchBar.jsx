import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Target,
  MapPin,
  ArrowUpDown,
  ChevronRight,
  Footprints,
  Navigation,
  Layers,
  Home,
  Briefcase,
  Star,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';

/* Helper to compute simulated arrival time e.g., 6:14 p.m. */
function getArrivalTime(minutesFromNow) {
  const date = new Date(Date.now() + minutesFromNow * 60000);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function SearchBar() {
  const navigate = useNavigate();
  const {
    routes,
    searchQuery,
    setSearchQuery,
    clearSelection,
    selectRoute,
    selectStop,
    locateNearestRoute,
    onlyNearby,
    isLocating,
  } = useRoutes();

  const [isExpanded, setIsExpanded] = useState(false);
  const [origin, setOrigin] = useState('Mi ubicación');

  const handleSwap = (e) => {
    e.stopPropagation();
    const temp = origin;
    setOrigin(searchQuery || 'Mi ubicación');
    setSearchQuery(temp === 'Mi ubicación' ? '' : temp);
  };

  /* Compute trip option results when destination query has text */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !routes || routes.length === 0) return [];
    
    const term = searchQuery.toLowerCase().trim();
    const matching = routes.filter((route) => {
      const matchName = route.name?.toLowerCase().includes(term);
      const matchCode = route.code?.toLowerCase().includes(term);
      const matchOrigin = route.origin?.toLowerCase().includes(term);
      const matchDest = route.destination?.toLowerCase().includes(term);
      const matchStops = route.stops?.some(
        (s) => s.name?.toLowerCase().includes(term) || s.address?.toLowerCase().includes(term)
      );

      return matchName || matchCode || matchOrigin || matchDest || matchStops;
    });

    const finalRoutes = matching.length > 0 ? matching : routes;

    return finalRoutes.map((route, idx) => {
      const walkTimeMin = [5, 9, 6, 8, 4][idx % 5];
      const rideTimeMin = [20, 25, 30, 18, 15][idx % 5];
      const totalTimeMin = walkTimeMin + rideTimeMin;
      const arrivalTime = getArrivalTime(totalTimeMin);
      const color = route.color || 'var(--color-brand-primary)';

      return {
        id: route.id,
        route,
        totalTimeMin,
        walkTimeMin,
        arrivalTime,
        color,
        code: route.code || `R${100 + idx}`,
      };
    });
  }, [routes, searchQuery]);

  const handleSelectOption = (item) => {
    selectRoute(item.route);
    if (item.route.stops && item.route.stops.length > 0) {
      selectStop(item.route.stops[0]);
    }
    setIsExpanded(false);
    navigate(`/mapa/ruta/${item.route.id}`);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchQuery('');
    clearSelection();
  };

  return (
    <div className="w-full space-y-2.5 pointer-events-auto">
      {/* ── Collapsed vs Expanded Search Card ───────────────────────────── */}
      {!isExpanded ? (
        /* Collapsed Pill — a real button that opens the search sheet */
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="relative w-full bg-white rounded-full shadow-card flex items-center px-4 py-3 border border-slate-100/90 cursor-pointer transition-all hover:border-blue-300 text-left"
        >
          <Search className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
          <span className="flex-1 text-slate-800 text-sm font-medium">
            {searchQuery || '¿A dónde quieres ir?'}
          </span>

          {searchQuery ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleClear(e);
                }
              }}
              className="p-1 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-2"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </span>
          ) : (
            <span className="text-xs font-bold text-brand-primary bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 ml-2">
              Buscar
            </span>
          )}
        </button>
      ) : (
        /* Expanded Dual Input Card (Origen + Destino + Swap) */
        <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-raised relative space-y-3 animate-slide-in-top">
          {/* Swap Button Floating on Right edge */}
          <button
            type="button"
            onClick={handleSwap}
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 shadow-2xs hover:bg-slate-200 transition-transform active:rotate-180 duration-300 z-10"
            title="Intercambiar origen y destino"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Origin Row */}
          <div className="flex items-center gap-3 pr-10">
            <Target className="w-4.5 h-4.5 text-blue-600 shrink-0" />
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Punto de partida"
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Horizontal Divider */}
          <div className="border-t border-slate-100" />

          {/* Destination Row */}
          <div className="flex items-center gap-3 pr-10">
            <MapPin className="w-4.5 h-4.5 text-red-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="¿A dónde vas?"
              autoFocus
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Close expanded button */}
          <div className="flex justify-end pt-1 border-t border-slate-50">
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cerrar buscador
            </button>
          </div>
        </div>
      )}

      {/* ── Search Results Popup (when expanded & searching) ─────────────── */}
      {isExpanded && searchQuery.trim() !== '' && (
        <div className="bg-white/98 backdrop-blur-xl rounded-2xl p-3.5 border border-slate-100 shadow-raised space-y-2.5 max-h-[42vh] overflow-y-auto hide-scrollbar animate-slide-in-top">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-900">
              {searchResults.length} opciones encontradas
            </span>
          </div>

          <div className="space-y-2.5">
            {searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectOption(item)}
                className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-2 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-slate-900">
                      {item.totalTimeMin}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      min
                    </span>
                  </div>

                  <span className="text-xs font-medium text-slate-500">
                    Llegada {item.arrivalTime}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <div className="flex items-center gap-1 text-slate-500 font-semibold">
                    <Footprints className="w-3 h-3 text-slate-500" />
                    <span>{item.walkTimeMin} min</span>
                  </div>

                  <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />

                  <div className="bg-slate-100 rounded-full px-2.5 py-1 text-xs font-bold text-slate-800 flex items-center gap-1.5 border border-slate-200/60">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.code}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Action Filter Chips (when not expanded) ─────────────────── */}
      {!isExpanded && (
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 pt-0.5 text-xs">
          <button
            onClick={() => locateNearestRoute()}
            disabled={isLocating}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border shadow-sm transition-all active:scale-95 ${
              onlyNearby
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 font-medium'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-emerald-300' : 'text-emerald-500'}`} />
            <span>{isLocating ? 'Ubicando...' : 'Cercanas'}</span>
          </button>

          <button
            onClick={() => {
              clearSelection();
              setSearchQuery('');
            }}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border shadow-sm transition-all active:scale-95 ${
              !onlyNearby && !searchQuery
                ? 'bg-slate-900 text-white border-slate-900 font-bold'
                : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 font-medium'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Ver Todas</span>
          </button>

          <button
            onClick={() => {
              setSearchQuery('Centro');
              setIsExpanded(true);
            }}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border shadow-sm transition-all active:scale-95 ${
              searchQuery === 'Centro'
                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 font-medium'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <span>Casa (Centro)</span>
          </button>

          <button
            onClick={() => {
              setSearchQuery('UNICA');
              setIsExpanded(true);
            }}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border shadow-sm transition-all active:scale-95 ${
              searchQuery === 'UNICA'
                ? 'bg-purple-600 text-white border-purple-600 font-bold'
                : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 font-medium'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>Trabajo (UNICA)</span>
          </button>

          <button
            onClick={() => navigate('/favoritos')}
            className="flex-shrink-0 bg-white rounded-full shadow-sm px-3.5 py-1.5 flex items-center gap-1.5 border border-slate-100 text-slate-700 font-medium hover:bg-slate-50 transition-all active:scale-95"
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Favoritos</span>
          </button>
        </div>
      )}
    </div>
  );
}
