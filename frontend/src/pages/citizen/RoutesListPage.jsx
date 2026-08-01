import { useState, useMemo } from 'react';
import { RouteCard } from '../../components/routes/RouteCard';
import { useRoutes } from '../../contexts/RouteContext';
import { Bus, Search, X, Sparkles, GraduationCap, ShoppingBag, Palmtree, Layers, Navigation, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RoutesListPage() {
  const { routes, selectRoute, selectStop } = useRoutes();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState('all'); // Defaults to ALL routes
  const [activeDetailRoute, setActiveDetailRoute] = useState(null); // Selected route for detail modal

  // Compute filtered routes for the catalog (defaults to showing ALL routes)
  const displayRoutes = useMemo(() => {
    let result = routes;

    // Search filter
    if (localSearch.trim() !== '') {
      const term = localSearch.toLowerCase().trim();
      return result.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          r.origin.toLowerCase().includes(term) ||
          r.destination.toLowerCase().includes(term) ||
          r.lineName.toLowerCase().includes(term) ||
          r.stops.some((s) => s.name.toLowerCase().includes(term))
      );
    }

    // Category filter
    if (localCategory === 'university') {
      return result.filter((r) => r.category === 'university');
    }
    if (localCategory === 'commercial') {
      return result.filter((r) => r.category === 'commercial');
    }
    if (localCategory === 'tourist') {
      return result.filter((r) => r.category === 'tourist');
    }
    if (localCategory === 'featured') {
      return result.filter((r) => r.isFeatured);
    }

    return result; // 'all' - Show all 10 routes
  }, [routes, localSearch, localCategory]);

  const handleCardClick = (route) => {
    setActiveDetailRoute(route);
  };

  const handleViewOnMap = (route, stop = null) => {
    selectRoute(route);
    if (stop) {
      selectStop(stop);
    }
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Title & Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-white/20 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md">
            Directorio Urbano de Ica
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
            Catálogo Completo de Rutas
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
            Consulta todas las líneas, horarios, puntos clave y tarifas disponibles en la ciudad de Ica.
          </p>
        </div>
        <Bus className="absolute right-6 -bottom-4 w-40 h-40 text-white/10 pointer-events-none" />
      </div>

      {/* Local Search & Category Filter Controls */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative flex items-center w-full shadow-sm rounded-2xl overflow-hidden bg-white border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/40 transition-all">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por código de ruta, punto clave o avenida (ej. R101, UNICA, Plaza)..."
            className="w-full pl-10 pr-10 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setLocalCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${
              localCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas las Rutas ({routes.length})</span>
          </button>

          <button
            onClick={() => setLocalCategory('university')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all border ${
              localCategory === 'university'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>UNICA / Univ.</span>
          </button>

          <button
            onClick={() => setLocalCategory('commercial')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all border ${
              localCategory === 'commercial'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Malls / Comercio</span>
          </button>

          <button
            onClick={() => setLocalCategory('tourist')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all border ${
              localCategory === 'tourist'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Palmtree className="w-3.5 h-3.5" />
            <span>Huacachina / Turísticas</span>
          </button>

          <button
            onClick={() => setLocalCategory('featured')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all border ${
              localCategory === 'featured'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Principales Frecuentes</span>
          </button>
        </div>
      </div>

      {/* Grid of Route Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayRoutes.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200 p-6">
            <p className="text-slate-700 font-semibold text-sm">No se encontraron rutas con este filtro.</p>
            <button
              onClick={() => {
                setLocalSearch('');
                setLocalCategory('all');
              }}
              className="mt-3 text-xs text-blue-600 font-bold underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          displayRoutes.map((route) => (
            <div key={route.id} onClick={() => handleCardClick(route)}>
              <RouteCard route={route} />
            </div>
          ))
        )}
      </div>

      {/* Dedicated Route Detail Modal for Catalog Page */}
      {activeDetailRoute && (
        <div
          onClick={() => setActiveDetailRoute(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200"
          >
            {/* Modal Header */}
            <div
              className="p-5 text-white flex items-start justify-between relative shadow-md"
              style={{ backgroundColor: activeDetailRoute.lineColor || '#2563eb' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                    {activeDetailRoute.code}
                  </span>
                  <span className="text-xs text-white/90 font-semibold">
                    {activeDetailRoute.lineName}
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-snug">{activeDetailRoute.name}</h2>
                <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
                  <Bus className="w-3.5 h-3.5 inline" /> {activeDetailRoute.company}
                </p>
              </div>

              <button
                onClick={() => setActiveDetailRoute(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Cerrar detalle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/80 p-3 text-center text-xs">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Tarifa</div>
                <div className="font-extrabold text-slate-800 mt-0.5">{activeDetailRoute.fare}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Horario</div>
                <div className="font-extrabold text-slate-800 mt-0.5 line-clamp-1">{activeDetailRoute.schedule}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Frecuencia</div>
                <div className="font-extrabold text-blue-600 mt-0.5 line-clamp-1">{activeDetailRoute.frequency}</div>
              </div>
            </div>

            {/* Distance Banner */}
            <div className="px-4 py-2.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-slate-700 font-medium">
                  Recorrido total: <strong className="text-slate-900">{activeDetailRoute.totalDistanceKm} km</strong> (~{activeDetailRoute.estimatedMinutes} min)
                </span>
              </div>
            </div>

            {/* Timeline of Key Points */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Puntos Clave del Recorrido ({activeDetailRoute.stops?.length || 0})
                </h4>
              </div>

              <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {activeDetailRoute.stops?.map((stop, index) => (
                  <div
                    key={stop.id}
                    onClick={() => handleViewOnMap(activeDetailRoute, stop)}
                    className="relative cursor-pointer group p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="absolute -left-6 top-3.5 w-4 h-4 rounded-full bg-white text-slate-600 border-2 border-slate-300 group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-[9px] font-bold transition-all">
                      {index + 1}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 leading-snug">{stop.name}</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">{stop.address}</p>
                      </div>
                      {stop.isAccessible && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                          ♿
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Action Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveDetailRoute(null)}
                className="w-1/2 py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleViewOnMap(activeDetailRoute)}
                className="w-1/2 py-2.5 px-4 rounded-2xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Map className="w-4 h-4" />
                <span>Ver en el mapa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
