import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  MapPin,
  ArrowUpDown,
  ChevronRight,
  Footprints,
  X,
  Sparkles,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';

/* Popular destination quick suggestions for Ica */
const QUICK_SUGGESTIONS = [
  'Balneario Huacachina',
  'Plaza de Armas de Ica',
  'UNICA - Ciudad Universitaria',
  'Centro Comercial El Quinde',
  'Hospital Regional de Ica',
  'Mercado Modelo de Ica',
];

/* Helper to compute simulated arrival time e.g., 6:14 p.m. */
function getArrivalTime(minutesFromNow) {
  const date = new Date(Date.now() + minutesFromNow * 60000);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function SearchPage() {
  const navigate = useNavigate();
  const { routes, selectRoute, selectStop } = useRoutes();

  const [origin, setOrigin] = useState('Mi ubicación');
  const [destination, setDestination] = useState('');

  /* Swap origin and destination */
  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination || 'Mi ubicación');
    setDestination(temp === 'Mi ubicación' ? '' : temp);
  };

  /* Filter routes ONLY when destination query is not empty */
  const searchResults = useMemo(() => {
    if (!destination.trim() || !routes || routes.length === 0) return [];
    
    const term = destination.toLowerCase().trim();

    // Find routes matching destination term in name, code, or key stops
    const matchingRoutes = routes.filter((route) => {
      const matchName = route.name?.toLowerCase().includes(term);
      const matchCode = route.code?.toLowerCase().includes(term);
      const matchOrigin = (route.keyStops || [])[0]?.name?.toLowerCase().includes(term);
      const matchDest =
        (route.keyStops || [])[
          (route.keyStops || []).length - 1
        ]?.name?.toLowerCase().includes(term);
      const matchStops = (route.keyStops || []).some(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.address?.toLowerCase().includes(term),
      );

      return matchName || matchCode || matchOrigin || matchDest || matchStops;
    });

    // If query typed but no specific match, fallback to returning top routes so user always sees routes
    const finalRoutes = matchingRoutes.length > 0 ? matchingRoutes : routes;

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
        lineName: route.transportLineName || route.name,
      };
    });
  }, [routes, destination]);

  const handleSelectOption = (item) => {
    selectRoute(item.route);
    const firstStop = item.route.keyStops?.[0] || item.route.stops?.[0];
    if (firstStop) {
      selectStop(firstStop);
    }
    navigate(`/mapa/ruta/${item.route.id}`);
  };

  const hasSearchText = Boolean(destination.trim());

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-slate-50/70 pb-24">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-20 shadow-2xs">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-transform active:scale-90 shrink-0"
          title="Regresar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Buscar ruta
        </h1>
      </div>

      {/* ── Main Content Container ─────────────────────────────────────── */}
      <main className="flex-1 p-5 max-w-lg mx-auto w-full space-y-6">
        {/* ── Dual Input Container (Origin / Destination + Swap) ──────────── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-card relative space-y-3">
          {/* Swap Button Floating on Right edge */}
          <button
            type="button"
            onClick={handleSwap}
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 shadow-xs hover:bg-slate-200 transition-transform active:rotate-180 duration-300 z-10"
            title="Intercambiar origen y destino"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* Origin Row */}
          <div className="flex items-center gap-3 pr-10">
            <Target className="w-5 h-5 text-blue-600 shrink-0" />
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Punto de partida"
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Horizontal Divider */}
          <div className="border-t border-slate-100" />

          {/* Destination Row */}
          <div className="flex items-center gap-3 pr-10">
            <MapPin className="w-5 h-5 text-red-500 shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="¿A dónde vas?"
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {destination && (
              <button
                type="button"
                onClick={() => setDestination('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Initial Empty State (Suggestions) vs Search Results ────────── */}
        {!hasSearchText ? (
          <div className="space-y-4 animate-fade-in pt-2">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider px-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Destinos frecuentes en Ica</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((sugg) => (
                <button
                  key={sugg}
                  onClick={() => setDestination(sugg)}
                  className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 transition-all active:scale-95 flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{sugg}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-in-bottom">
            {/* Results Header Count */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-slate-900">
                {searchResults.length} opciones encontradas
              </h2>
            </div>

            {/* Options List Cards */}
            <div className="space-y-3.5">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectOption(item)}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card space-y-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                >
                  {/* Top Row: Total duration min & Arrival time */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight">
                        {item.totalTimeMin}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        min
                      </span>
                    </div>

                    <span className="text-xs font-medium text-slate-500">
                      Llegada {item.arrivalTime}
                    </span>
                  </div>

                  {/* Steps Row: Walk time -> Connection -> Route Badge */}
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                    {/* Walk Step */}
                    <div className="flex items-center gap-1 text-slate-500 font-semibold">
                      <Footprints className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.walkTimeMin} min</span>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

                    {/* Route Pill Badge */}
                    <div className="bg-slate-100/80 border border-slate-200/60 rounded-full px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-2xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.code}</span>
                    </div>

                    {/* Optional second leg demo */}
                    {item.totalTimeMin > 30 && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div className="bg-slate-100/80 border border-slate-200/60 rounded-full px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          <span>Conexión</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
