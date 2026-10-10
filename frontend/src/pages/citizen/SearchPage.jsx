import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  MapPin,
  ArrowUpDown,
  ChevronRight,
  X,
  Sparkles,
  Search,
  Loader2,
  Bus,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { routeService } from '../../services/routeService';

/* Sugerencias populares de Ica */
const QUICK_SUGGESTIONS = [
  'Huacachina',
  'Plaza de Armas',
  'UNICA',
  'Mercado Modelo',
  'El Quinde',
  'Luren',
  'Parcona',
];

export function SearchPage() {
  const navigate = useNavigate();
  const { selectRoute, selectStop } = useRoutes();

  const [origin, setOrigin] = useState('Mi ubicación');
  const [destination, setDestination] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  /* Swap origin and destination */
  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination || 'Mi ubicación');
    setDestination(temp === 'Mi ubicación' ? '' : temp);
  };

  /* Ejecutar búsqueda en el backend real */
  const executeSearch = async (queryToSearch) => {
    const term = (queryToSearch ?? destination).trim();
    if (!term) return;

    setIsSearching(true);
    setSearchError(null);
    setLastQuery(term);

    try {
      // La búsqueda del backend ahora busca por nombre de ruta, código, empresa Y paraderos/referencias
      const routesResult = await routeService.searchRoutes(term);
      setSearchResults(Array.isArray(routesResult) ? routesResult : []);
    } catch (err) {
      console.error('Error al realizar búsqueda en el backend:', err);
      setSearchError('No se pudo conectar con el servidor para buscar rutas. Revisa tu conexión.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const handleQuickSuggestion = (suggestion) => {
    setDestination(suggestion);
    executeSearch(suggestion);
  };

  const handleSelectRoute = (route) => {
    selectRoute(route);
    const firstStop = route.keyStops?.[0] || route.stops?.[0];
    if (firstStop) {
      selectStop(firstStop);
    }
    navigate(`/mapa/ruta/${route.id}`);
  };

  const handleClear = () => {
    setDestination('');
    setSearchResults(null);
    setLastQuery('');
  };

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
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Buscar rutas
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Encuentra líneas de transporte con datos del sistema en tiempo real
          </p>
        </div>
      </div>

      {/* ── Main Content Container ─────────────────────────────────────── */}
      <main className="flex-1 p-5 max-w-lg mx-auto w-full space-y-5">
        {/* ── Dual Input Form Container ──────────────────────────────────── */}
        <form
          onSubmit={handleFormSubmit}
          className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-card relative space-y-3"
        >
          {/* Swap Button Floating on Right edge */}
          <button
            type="button"
            onClick={handleSwap}
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center absolute right-4 top-10 -translate-y-1/2 shadow-xs hover:bg-slate-200 transition-transform active:rotate-180 duration-300 z-10"
            title="Intercambiar origen y destino"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* Origin Row */}
          <div className="flex items-center gap-3 pr-12">
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
          <div className="flex items-center gap-3 pr-12">
            <MapPin className="w-5 h-5 text-red-500 shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="¿A dónde vas? (ej. Huacachina, UNICA)"
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {destination && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                title="Limpiar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            disabled={isSearching || !destination.trim()}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-500/20"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Buscando en el sistema...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Buscar rutas</span>
              </>
            )}
          </button>
        </form>

        {/* ── Error Banner ──────────────────────────────────────────────── */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{searchError}</span>
          </div>
        )}

        {/* ── Initial Suggestions (when no search done yet) ─────────────── */}
        {searchResults === null && !isSearching && (
          <div className="space-y-4 animate-fade-in pt-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider px-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Destinos frecuentes en Ica</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => handleQuickSuggestion(sugg)}
                  className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 transition-all active:scale-95 flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{sugg}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Results Container ─────────────────────────────────────────── */}
        {searchResults !== null && !isSearching && (
          <div className="space-y-3.5 animate-slide-in-bottom">
            {/* Results Header Count */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bus className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {searchResults.length === 1
                    ? '1 ruta encontrada'
                    : `${searchResults.length} rutas encontradas`}
                </span>
              </h2>
              {lastQuery && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  Para "{lastQuery}"
                </span>
              )}
            </div>

            {/* Empty State */}
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-2xl p-7 text-center border border-slate-100 shadow-card space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No se encontraron rutas para "{lastQuery}"
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Prueba buscando por nombre de avenida, lugar emblemático (ej. "Huacachina", "Mercado") o por código de línea.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/rutas')}
                  className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors"
                >
                  Ver todo el catálogo de rutas
                </button>
              </div>
            ) : (
              /* Real Results List from Backend */
              <div className="space-y-3">
                {searchResults.map((route) => (
                  <div
                    key={route.id}
                    onClick={() => handleSelectRoute(route)}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-card space-y-3 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                  >
                    {/* Header Row: Code Pill + Line Name + Fare */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="px-3 py-1.5 text-white font-bold text-xs rounded-xl flex items-center justify-center shrink-0 uppercase tracking-wider shadow-2xs"
                          style={{ backgroundColor: route.color || '#2563eb' }}
                        >
                          {route.code}
                        </div>
                        <span className="text-xs font-semibold text-slate-500 truncate">
                          {route.transportLineName || 'Línea de Transporte'}
                        </span>
                      </div>

                      {route.fare && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {route.fare}
                        </span>
                      )}
                    </div>

                    {/* Route Name Title */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-snug">
                        {route.name}
                      </h3>
                    </div>

                    {/* Key Stops List */}
                    {route.keyStops && route.keyStops.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-medium text-slate-700">Paraderos clave:</span>
                        <span className="text-slate-600 truncate">
                          {route.keyStops.map((s) => s.name).join(' → ')}
                        </span>
                      </div>
                    )}

                    {/* View in Map Footer */}
                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Ver recorrido en el mapa</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
