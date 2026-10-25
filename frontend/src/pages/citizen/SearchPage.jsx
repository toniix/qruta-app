import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { searchQuerySchema } from '../../schemas';

const RECENT_KEY = 'rutasya_recent_searches';
const SEARCH_STORAGE_KEY = 'rutasya_search_session_state';
const MAX_RECENT = 5;
const MAX_TOP_CITIES = 5;
const MAX_POPULAR_SUGGESTIONS = 5;
const SEARCH_SIZE = 50;
const DEBOUNCE_MS = 300;

let inMemorySearchState = null;

function saveSearchState(state) {
  inMemorySearchState = state;
  try {
    sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Keep in-memory cache if sessionStorage quota exceeded
  }
}

function loadSearchState() {
  try {
    const stored = sessionStorage.getItem(SEARCH_STORAGE_KEY);
    if (!stored) {
      inMemorySearchState = null;
      return null;
    }
    if (inMemorySearchState) return inMemorySearchState;
    const parsed = JSON.parse(stored);
    inMemorySearchState = parsed;
    return parsed;
  } catch {
    return inMemorySearchState;
  }
}

function clearSearchState() {
  inMemorySearchState = null;
  try {
    sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

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
  const location = useLocation();
  const { selectRoute, cities, currentCity, routes, popularRoutes, userAddress } =
    useRoutes();

  const [savedSearch] = useState(loadSearchState);

  const FALLBACK_ORIGIN = 'Mi ubicación';
  const defaultOrigin = userAddress?.formattedAddress || FALLBACK_ORIGIN;
  const [origin, setOrigin] = useState(() => savedSearch?.origin || defaultOrigin);
  const [destination, setDestination] = useState(() => savedSearch?.destination || '');
  const [searchResults, setSearchResults] = useState(() => savedSearch?.searchResults ?? null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [lastQuery, setLastQuery] = useState(() => savedSearch?.lastQuery || '');
  const [activeCity, setActiveCity] = useState(() => savedSearch?.activeCity || 'all');
  const [activeCategory, setActiveCategory] = useState(() => savedSearch?.activeCategory || 'all');
  const [recentQueries, setRecentQueries] = useState(readRecentQueries);
  // In-memory catalog cache for cross-city browsing without repeated network requests
  const catalogRoutesRef = useRef(savedSearch?.catalogRoutes || null);
  // Sequence guard so a slow response never overwrites a newer search
  const searchSeqRef = useRef(savedSearch ? 1 : 0);
  // GPS-backed origin default: sync until the user edits the field manually
  const originTouchedRef = useRef(Boolean(savedSearch?.origin));
  const mainContainerRef = useRef(null);

  useEffect(() => {
    if (!originTouchedRef.current) {
      setOrigin(defaultOrigin);
    }
  }, [defaultOrigin]);

  // Restore scroll position when returning from route detail
  useEffect(() => {
    if (savedSearch?.scrollTop && mainContainerRef.current) {
      mainContainerRef.current.scrollTop = savedSearch.scrollTop;
    }
  }, [savedSearch]);

  // Persist search state whenever valid search results or filters are active
  useEffect(() => {
    if (searchResults !== null) {
      saveSearchState({
        origin,
        destination,
        searchResults,
        lastQuery,
        activeCity,
        activeCategory,
        catalogRoutes: catalogRoutesRef.current,
        scrollTop: mainContainerRef.current?.scrollTop || 0,
      });
    }
  }, [origin, destination, searchResults, lastQuery, activeCity, activeCategory]);

  /* Swap origin and destination */
  const handleSwap = () => {
    const temp = origin;
    originTouchedRef.current = true;
    setOrigin(destination || defaultOrigin);
    setDestination(temp === defaultOrigin ? '' : temp);
  };

  /* Global search across all cities (no cityId = backend default scope) */
  const executeSearch = useCallback(
    async (queryToSearch) => {
      const raw = queryToSearch ?? destination;
      const checked = searchQuerySchema.safeParse(raw == null ? '' : String(raw));
      if (!checked.success) {
        setSearchError('Búsqueda demasiado larga (máx. 100 caracteres).');
        setSearchResults([]);
        return;
      }
      const term = checked.data;
      if (!term) {
        clearSearchState();
        setSearchResults(null);
        setLastQuery('');
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setLastQuery(term);
      setActiveCity('all');
      setActiveCategory('all');
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

  /* One-time handoff from the map search sheet: run the carried query once */
  const consumedNavQueryRef = useRef(false);
  useEffect(() => {
    if (consumedNavQueryRef.current) return;
    consumedNavQueryRef.current = true;
    const navQuery = location.state?.query;
    if (typeof navQuery === 'string' && navQuery.trim()) {
      const term = navQuery.trim();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once navigation handoff: consumes one-time router state into local search state
      setDestination(term);
      executeSearch(term);
    }
  }, [location.state, executeSearch]);

  /* Helper to load all routes once for cross-city catalog browsing */
  const loadCatalogRoutes = useCallback(async () => {
    if (catalogRoutesRef.current) return catalogRoutesRef.current;
    const routesData = await routeService.getAllRoutes();
    const validList = Array.isArray(routesData) ? routesData : [];
    catalogRoutesRef.current = validList;
    return validList;
  }, []);

  /* City chips: in text search mode, derived from results; in catalog browse mode, all available cities */
  const cityOptions = useMemo(() => {
    if (destination.trim()) {
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
    }

    if (cities && cities.length > 0) {
      return cities
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

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
  }, [destination, searchResults, cities]);

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
      clearSearchState();
      setSearchResults(null);
      setLastQuery('');
      setActiveCity('all');
      setActiveCategory('all');
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

  const handleCityFilterChange = async (cityId) => {
    if (destination.trim()) {
      // In text search mode: filter search results in-memory
      setActiveCity(cityId);
      return;
    }

    // In catalog browse mode:
    if (cityId === activeCity && searchResults !== null) return;

    if (!catalogRoutesRef.current) {
      setIsSearching(true);
      setSearchError(null);
      const seq = searchSeqRef.current + 1;
      searchSeqRef.current = seq;
      try {
        const catalog = await loadCatalogRoutes();
        if (searchSeqRef.current !== seq) return;
        setSearchResults(catalog);
      } catch (err) {
        console.error('Error al cargar catálogo de rutas:', err);
        if (searchSeqRef.current !== seq) return;
        setSearchError('No se pudo conectar con el servidor para cargar las rutas.');
        return;
      } finally {
        if (searchSeqRef.current === seq) setIsSearching(false);
      }
    } else if (searchResults !== catalogRoutesRef.current) {
      setSearchResults(catalogRoutesRef.current);
    }

    setActiveCity(cityId);
    if (cityId === 'all') {
      setLastQuery('Todas las ciudades');
    } else {
      const targetCity = cities.find((c) => c.id === cityId);
      setLastQuery(targetCity ? `Rutas en ${targetCity.name}` : 'Rutas filtradas');
    }
  };

  const handleCityShortcut = async (cityEntry) => {
    if (!cityEntry.ref) {
      handleQuickSearch(cityEntry.name);
      return;
    }
    // Search-local only: never switch the global city or navigate — the
    // global city context must stay untouched.
    setIsSearching(true);
    setSearchError(null);
    const seq = searchSeqRef.current + 1;
    searchSeqRef.current = seq;
    try {
      const catalog = await loadCatalogRoutes();
      // A newer search started while this one was in flight: drop it
      if (searchSeqRef.current !== seq) return;
      setSearchResults(catalog);
      setActiveCity(cityEntry.id);
      setActiveCategory('all');
      setLastQuery(`Rutas en ${cityEntry.name}`);
    } catch (err) {
      console.error('Error al cargar rutas de la ciudad:', err);
      if (searchSeqRef.current !== seq) return;
      setSearchError(
        'No se pudo conectar con el servidor para buscar rutas. Revisa tu conexión.',
      );
      setSearchResults([]);
    } finally {
      if (searchSeqRef.current === seq) setIsSearching(false);
    }
  };

  const handleSelectRoute = (route) => {
    // Preserve current search results and scroll position before navigating to route detail
    if (searchResults !== null) {
      saveSearchState({
        origin,
        destination,
        searchResults,
        lastQuery,
        activeCity,
        activeCategory,
        catalogRoutes: catalogRoutesRef.current,
        scrollTop: mainContainerRef.current?.scrollTop || 0,
      });
    }
    selectRoute(route);
    navigate(`/mapa/ruta/${route.id}`, { state: { from: "/buscar" } });
  };

  const handleClear = () => {
    searchSeqRef.current += 1;
    clearSearchState();
    setDestination('');
    setSearchResults(null);
    setLastQuery('');
    setActiveCity('all');
    setActiveCategory('all');
    setSearchError(null);
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
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-surface-page pb-safe pb-24">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header className="bg-white pt-3.5 sm:pt-4 pb-3 px-4 sm:px-6 border-b border-slate-200/80 flex items-center gap-3 sticky top-0 z-20 shadow-2xs shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 shrink-0 border border-slate-200/60"
          title="Regresar"
          aria-label="Regresar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold text-ink-primary tracking-tight flex items-center gap-2 truncate">
            <img
              src="/qruta-symbol.svg"
              alt="QRuta"
              className="w-8 h-8 shrink-0"
            />
            <span>Buscar rutas</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-ink-muted font-medium truncate mt-0.5">
            Busca en todas las ciudades, sin importar dónde estés
          </p>
        </div>
      </header>

      {/* ── Main Content Container ─────────────────────────────────────── */}
      <main
        ref={mainContainerRef}
        className="flex-1 min-h-0 overflow-y-auto hide-scrollbar p-4 sm:p-5 max-w-lg mx-auto w-full space-y-4 sm:space-y-5"
      >
        {/* ── Dual Input Form Container ──────────────────────────────────── */}
        <form
          onSubmit={handleFormSubmit}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-card relative space-y-3"
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
            <Target className="w-5 h-5 text-brand-primary-green shrink-0" />
            <input
              type="text"
              value={origin}
              onChange={(e) => {
                originTouchedRef.current = true;
                setOrigin(e.target.value);
              }}
              placeholder="Punto de partida"
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Horizontal Divider */}
          <div className="border-t border-slate-100" />

          {/* Destination Row */}
          <div className="flex items-center gap-3 pr-12">
            <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={handleDestinationChange}
              placeholder="¿A dónde vas? Busca en todas las ciudades…"
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {(destination || searchResults !== null) && (
              <button
                type="button"
                onClick={handleClear}
                className="relative p-1 rounded-full text-slate-400 hover:text-slate-600 after:absolute after:-inset-3 after:content-[''] cursor-pointer"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            disabled={isSearching || !destination.trim()}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-brand-navy hover:bg-surface-navy text-brand-lime font-black py-3 px-4 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-card border border-border-navy cursor-pointer"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-brand-lime" />
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
            <div className="flex items-center gap-2 text-ink-muted text-xs font-bold uppercase tracking-wider px-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary-green" />
              <span>Explora antes de buscar</span>
            </div>

            {/* Recent queries from localStorage (max 5) */}
            {recentQueries.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-primary">
                    <Clock3 className="w-4 h-4 text-ink-muted" />
                    Búsquedas recientes
                  </h2>
                  <button
                    type="button"
                    onClick={handleClearRecents}
                    className="text-xs font-semibold text-ink-muted hover:text-ink-secondary"
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
                      className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink-primary shadow-2xs hover:border-brand-lime hover:bg-brand-lime/10 transition-all active:scale-95"
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
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-primary px-1">
                  <MapPin className="w-4 h-4 text-brand-primary-green" />
                  Ciudades principales
                </h2>
                <div className="flex flex-wrap gap-2">
                  {topCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleCityShortcut(city)}
                      className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink-primary shadow-2xs hover:border-brand-lime hover:bg-brand-lime/10 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-brand-primary-green shrink-0" />
                      <span>{city.name}</span>
                      {city.count > 0 && (
                        <span className="text-2xs font-bold text-ink-muted bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200/60">
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
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-primary px-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  Rutas populares en {currentCity?.name || 'tu ciudad'}
                </h2>
                <div className="space-y-2">
                  {popularSuggestions.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => handleSelectRoute(route)}
                      aria-label={`Ver recorrido de la ruta ${route.code}: ${route.name}`}
                      className="w-full bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3 hover:border-brand-lime hover:shadow-card transition-all active:scale-[0.99] text-left"
                    >
                      <div
                        className="px-2.5 py-1.5 text-white font-bold text-xs rounded-xl flex items-center justify-center shrink-0 uppercase tracking-wider"
                        style={{ backgroundColor: route.color || '#111B2E' }}
                      >
                        {route.code}
                      </div>
                      <span className="flex-1 min-w-0 text-xs font-bold text-ink-primary truncate">
                        {route.name}
                      </span>
                      {route.cityName && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-2xs font-bold text-brand-navy bg-brand-lime/20 border border-brand-lime/30 px-2 py-0.5 rounded-full">
                          <MapPin className="w-3 h-3 text-brand-primary-green" />
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
            className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-ink-muted"
            role="status"
          >
            <Loader2 className="w-5 h-5 animate-spin text-brand-primary-green" />
            <span>Buscando en todas las ciudades…</span>
          </div>
        )}

        {/* ── Global Results (flat list, city badge per card) ───────────── */}
        {searchResults !== null && (
          <div className="space-y-3.5 animate-slide-in-bottom">
            {/* Results Header Count */}
            <div className="flex items-center justify-between px-1 gap-2">
              <h2 className="text-base font-extrabold text-ink-primary flex items-center gap-2 min-w-0">
                <Bus className="w-4 h-4 text-brand-navy shrink-0" />
                <span className="truncate">
                  {isSearching
                    ? 'Buscando…'
                    : visibleResults.length === 1
                      ? '1 ruta encontrada'
                      : `${visibleResults.length} rutas encontradas`}
                </span>
              </h2>
              {lastQuery && (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary bg-slate-100 pl-2.5 pr-1.5 py-1 rounded-full font-semibold border border-slate-200/80 shrink-0">
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {lastQuery.startsWith('Rutas en ') || lastQuery === 'Todas las ciudades'
                      ? lastQuery
                      : `Para "${lastQuery}"`}
                  </span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-4 h-4 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Quitar filtro y volver a explorar"
                    aria-label="Quitar filtro y volver a explorar"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
                  onClick={() => handleCityFilterChange('all')}
                  aria-pressed={activeCity === 'all'}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    activeCity === 'all'
                      ? 'bg-brand-navy text-brand-lime border border-border-navy shadow-xs'
                      : 'bg-white text-ink-secondary border border-border-subtle hover:bg-slate-100'
                  }`}
                >
                  Todas las ciudades
                </button>
                {cityOptions.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCityFilterChange(city.id)}
                    aria-pressed={activeCity === city.id}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      activeCity === city.id
                        ? 'bg-brand-navy text-brand-lime border border-border-navy shadow-xs'
                        : 'bg-white text-ink-secondary border border-border-subtle hover:bg-slate-100'
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
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                        isActive
                          ? 'bg-brand-navy text-brand-lime border border-border-navy shadow-xs'
                          : 'bg-white text-ink-secondary border border-border-subtle hover:bg-slate-100'
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
              <div className="bg-white rounded-2xl p-7 text-center border border-slate-200/80 shadow-card space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-ink-primary">
                  No se encontraron rutas para "{lastQuery}"
                </h3>
                <p className="text-xs text-ink-muted max-w-xs mx-auto">
                  Buscamos en todas las ciudades. Prueba con otro término o
                  refina tu búsqueda por nombre de avenida, lugar emblemático o
                  código de línea (la búsqueda ignora tildes y mayúsculas).
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/rutas')}
                  className="mt-2 text-xs font-black text-brand-navy bg-brand-lime hover:bg-brand-lime-hover px-4 py-2.5 rounded-xl transition-colors shadow-2xs"
                >
                  Ver todo el catálogo de rutas
                </button>
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="bg-white rounded-2xl p-7 text-center border border-slate-200/80 shadow-card space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-ink-primary">
                  Ninguna ruta coincide con los filtros
                </h3>
                <p className="text-xs text-ink-muted max-w-xs mx-auto">
                  Ajusta la ciudad o la categoría para ver más resultados de "
                  {lastQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleCityFilterChange('all');
                    setActiveCategory('all');
                  }}
                  className="mt-2 text-xs font-black text-brand-navy bg-brand-lime hover:bg-brand-lime-hover px-4 py-2.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
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
