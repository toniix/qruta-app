import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Clock3,
  Star,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { routeService } from '../../services/routeService';
import { RouteCard } from '../../components/routes/RouteCard';
import {
  SEARCH_CATEGORIES,
  matchesCategory,
} from '../../components/search/categoryFilter';

const RECENT_KEY = 'rutasya_recent_searches';
const MAX_RECENT = 5;
const MAX_TOP_CITIES = 5;
const MAX_POPULAR_SUGGESTIONS = 5;
const SEARCH_SIZE = 50;
const DEBOUNCE_MS = 300;

function readRecentQueries() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.filter((q) => typeof q === 'string').slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

export function SearchPage() {
  const navigate = useNavigate();
  const { selectRoute, selectStop, cities, routes, popularRoutes, setCity } =
    useRoutes();

  const [origin, setOrigin] = useState('Mi ubicación');
  const [destination, setDestination] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [activeCity, setActiveCity] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [recentQueries, setRecentQueries] = useState(readRecentQueries);
  // Sequence guard so a slow response never overwrites a newer search
  const searchSeqRef = useRef(0);

  /* Swap origin and destination */
  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination || 'Mi ubicación');
    setDestination(temp === 'Mi ubicación' ? '' : temp);
  };

  /* Global search across all cities (no cityId = backend default scope) */
  const executeSearch = useCallback(
    async (queryToSearch) => {
      const term = (queryToSearch ?? destination).trim();
      if (!term) {
        setSearchResults(null);
        setLastQuery('');
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setLastQuery(term);
      setActiveCity('all');
      const seq = searchSeqRef.current + 1;
      searchSeqRef.current = seq;

      try {
        const routesResult = await routeService.searchRoutes(
          term,
          null,
          SEARCH_SIZE,
        );
        // A newer search started while this one was in flight: drop it
        if (searchSeqRef.current !== seq) return;
        setSearchResults(Array.isArray(routesResult) ? routesResult : []);
        try {
          const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
          const list = Array.isArray(stored)
            ? stored.filter((q) => typeof q === 'string')
            : [];
          const next = [
            term,
            ...list.filter((q) => q.toLowerCase() !== term.toLowerCase()),
          ].slice(0, MAX_RECENT);
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
          setRecentQueries(next);
        } catch {
          // localStorage unavailable: keep in-memory recents only
          setRecentQueries((prev) =>
            [term, ...prev.filter((q) => q.toLowerCase() !== term.toLowerCase())].slice(
              0,
              MAX_RECENT,
            ),
          );
        }
      } catch (err) {
        console.error('Error al realizar búsqueda global:', err);
        if (searchSeqRef.current !== seq) return;
        setSearchError(
          'No se pudo conectar con el servidor para buscar rutas. Revisa tu conexión.',
        );
        setSearchResults([]);
      } finally {
        if (searchSeqRef.current === seq) setIsSearching(false);
      }
    },
    [destination],
  );

  /* Debounced live query (~300 ms): typing searches globally without submit.
     The remote call runs inside the timeout callback, following the same
     debounce pattern used elsewhere in the app. */
  useEffect(() => {
    if (!destination.trim()) return undefined;
    const handler = setTimeout(() => {
      const term = destination.trim();
      if (term && term !== lastQuery) {
        executeSearch(term);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [destination, lastQuery, executeSearch]);

  /* City chips are derived from the result set (distinct cities present) */
  const cityOptions = useMemo(() => {
    if (!searchResults) return [];
    const namesByKey = new Map();
    for (const route of searchResults) {
      const key = route.cityId || route.cityName || 'unknown';
      if (!namesByKey.has(key)) {
        namesByKey.set(key, route.cityName || 'Otra ciudad');
      }
    }
    return [...namesByKey.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [searchResults]);

  /* City chip + category chip combine over the same global result set */
  const visibleResults = useMemo(() => {
    if (!searchResults) return [];
    return searchResults.filter((route) => {
      if (activeCity !== 'all') {
        const key = route.cityId || route.cityName || 'unknown';
        if (key !== activeCity) return false;
      }
      return matchesCategory(route, activeCategory);
    });
  }, [searchResults, activeCity, activeCategory]);

  /* Top cities by loaded route count — data-driven, never hardcoded */
  const topCities = useMemo(() => {
    const counts = new Map();
    for (const route of routes) {
      const key = route.cityId || route.cityName || 'unknown';
      const entry = counts.get(key) || {
        id: key,
        name: route.cityName || 'Otra ciudad',
        count: 0,
      };
      entry.count += 1;
      counts.set(key, entry);
    }
    const ranked = cities.map((city) => ({
      id: city.id,
      name: city.name,
      count: counts.get(city.id)?.count || 0,
      ref: city,
    }));
    for (const [key, entry] of counts) {
      if (!cities.some((city) => city.id === key)) {
        ranked.push({ ...entry, id: key, ref: null });
      }
    }
    return ranked
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
      .slice(0, MAX_TOP_CITIES);
  }, [cities, routes]);

  const popularSuggestions = useMemo(
    () => (popularRoutes || []).slice(0, MAX_POPULAR_SUGGESTIONS),
    [popularRoutes],
  );

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestination(value);
    // Empty query shows the idle suggestions state, never an error
    if (!value.trim()) {
      searchSeqRef.current += 1;
      setSearchResults(null);
      setLastQuery('');
      setActiveCity('all');
      setSearchError(null);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const handleQuickSearch = (term) => {
    setDestination(term);
    executeSearch(term);
  };

  const handleCityShortcut = (cityEntry) => {
    if (cityEntry.ref) {
      setCity(cityEntry.ref, true);
      navigate('/rutas');
    } else {
      handleQuickSearch(cityEntry.name);
    }
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
    searchSeqRef.current += 1;
    setDestination('');
    setSearchResults(null);
    setLastQuery('');
    setActiveCity('all');
  };

  const handleClearRecents = () => {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // localStorage unavailable: clear in-memory recents only
    }
    setRecentQueries([]);
  };

  const showIdle = searchResults === null && !isSearching;

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
            Busca en todas las ciudades, sin importar dónde estés
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
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center absolute right-4 top-10 -translate-y-1/2 shadow-xs hover:bg-slate-200 transition-transform active:rotate-180 duration-300 z-10 after:absolute after:-inset-1 after:content-['']"
            title="Intercambiar origen y destino"
            aria-label="Intercambiar origen y destino"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* Origin Row */}
          <div className="flex items-center gap-3 pr-12">
            <Target className="w-5 h-5 text-brand-primary shrink-0" />
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
              onChange={handleDestinationChange}
              placeholder="¿A dónde vas? Busca en todas las ciudades…"
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {destination && (
              <button
                type="button"
                onClick={handleClear}
                className="relative p-1 rounded-full text-slate-500 hover:text-slate-600 after:absolute after:-inset-3 after:content-['']"
                title="Limpiar destino"
                aria-label="Limpiar destino"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            disabled={isSearching || !destination.trim()}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 px-4 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-500/20"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Buscando en todas las ciudades...</span>
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

        {/* ── Dynamic Idle Suggestions (no hardcoded city) ──────────────── */}
        {showIdle && (
          <div className="space-y-5 animate-fade-in pt-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider px-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Explora antes de buscar</span>
            </div>

            {/* Recent queries from localStorage (max 5) */}
            {recentQueries.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <Clock3 className="w-4 h-4 text-slate-400" />
                    Búsquedas recientes
                  </h2>
                  <button
                    type="button"
                    onClick={handleClearRecents}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentQueries.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => handleQuickSearch(query)}
                      className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 transition-all active:scale-95"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Top cities by route count */}
            {topCities.length > 0 && (
              <section className="space-y-2.5">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800 px-1">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Ciudades principales
                </h2>
                <div className="flex flex-wrap gap-2">
                  {topCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleCityShortcut(city)}
                      className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{city.name}</span>
                      {city.count > 0 && (
                        <span className="text-2xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          {city.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Popular routes (up to 5) */}
            {popularSuggestions.length > 0 && (
              <section className="space-y-2.5">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800 px-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  Rutas populares
                </h2>
                <div className="space-y-2">
                  {popularSuggestions.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => handleSelectRoute(route)}
                      aria-label={`Ver recorrido de la ruta ${route.code}: ${route.name}`}
                      className="w-full bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex items-center gap-3 hover:border-blue-300 hover:shadow-xs transition-all active:scale-[0.99] text-left"
                    >
                      <div
                        className="px-2.5 py-1.5 text-white font-bold text-xs rounded-xl flex items-center justify-center shrink-0 uppercase tracking-wider"
                        style={{ backgroundColor: route.color || '#2563eb' }}
                      >
                        {route.code}
                      </div>
                      <span className="flex-1 min-w-0 text-xs font-bold text-slate-800 truncate">
                        {route.name}
                      </span>
                      {route.cityName && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-2xs font-bold text-brand-primary bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                          <MapPin className="w-3 h-3" />
                          {route.cityName}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── Live searching indicator before first results ─────────────── */}
        {isSearching && searchResults === null && (
          <div
            className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500"
            role="status"
          >
            <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
            <span>Buscando en todas las ciudades…</span>
          </div>
        )}

        {/* ── Global Results (flat list, city badge per card) ───────────── */}
        {searchResults !== null && (
          <div className="space-y-3.5 animate-slide-in-bottom">
            {/* Results Header Count */}
            <div className="flex items-center justify-between px-1 gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <Bus className="w-4 h-4 text-brand-primary shrink-0" />
                <span className="truncate">
                  {isSearching
                    ? 'Buscando…'
                    : visibleResults.length === 1
                      ? '1 ruta encontrada'
                      : `${visibleResults.length} rutas encontradas`}
                </span>
              </h2>
              {lastQuery && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium shrink-0">
                  Para "{lastQuery}"
                </span>
              )}
            </div>

            {/* City filter chips derived from the result set */}
            {searchResults.length > 0 && (
              <div
                className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5"
                role="group"
                aria-label="Filtrar por ciudad"
              >
                <button
                  type="button"
                  onClick={() => setActiveCity('all')}
                  aria-pressed={activeCity === 'all'}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    activeCity === 'all'
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  Todas las ciudades
                </button>
                {cityOptions.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => setActiveCity(city.id)}
                    aria-pressed={activeCity === city.id}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                      activeCity === city.id
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            )}

            {/* Category chips combinable with the city chip */}
            {searchResults.length > 0 && (
              <div
                className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5"
                role="group"
                aria-label="Filtrar por categoría"
              >
                {SEARCH_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      aria-pressed={isActive}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100/90 text-slate-600 border border-slate-200/60 hover:bg-slate-200/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Backend empty state */}
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-2xl p-7 text-center border border-slate-100 shadow-card space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No se encontraron rutas para "{lastQuery}"
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Buscamos en todas las ciudades. Prueba con otro término o
                  refina tu búsqueda por nombre de avenida, lugar emblemático o
                  código de línea (la búsqueda ignora tildes y mayúsculas).
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/rutas')}
                  className="mt-2 text-xs font-bold text-brand-primary bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors"
                >
                  Ver todo el catálogo de rutas
                </button>
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="bg-white rounded-2xl p-7 text-center border border-slate-100 shadow-card space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Ninguna ruta coincide con los filtros
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Ajusta la ciudad o la categoría para ver más resultados de "
                  {lastQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCity('all');
                    setActiveCategory('all');
                  }}
                  className="mt-2 text-xs font-bold text-brand-primary bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              /* Flat global results list with city badge per card */
              <div className="space-y-3">
                {visibleResults.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    showCity
                    onSelect={handleSelectRoute}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
