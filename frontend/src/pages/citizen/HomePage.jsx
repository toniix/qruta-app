import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Navigation,
  MapPin,
  Loader2,
  Bus,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { getGreeting } from '../../utils/dateUtils';
import { NearbyStopCard, StopSkeleton } from '../../components/home';

/** Present the backend popularity score as a plain-language band, not a false-precision percentage. */
function popularityLabel(score) {
  if (score == null) return 'Popular';
  return score >= 70 ? 'Muy popular' : 'Popular';
}

/** Loading skeleton shaped like a popular-route row */
function PopularRouteSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center gap-3.5 animate-pulse">
      <div className="w-14 h-10 bg-slate-100 rounded-2xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-slate-100 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 rounded-full w-1/3" />
      </div>
      <div className="w-20 h-7 bg-slate-100 rounded-full shrink-0" />
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [showCitySelector, setShowCitySelector] = useState(false);
  const {
    routes,
    triggerGpsRequest,
    isLocating,
    hasCustomLocation,
    gpsReady,
    selectRoute,
    nearbyStops,
    loadingStops,
    stopsError,
    loadNearbyStops,
    displayedPopularRoutes,
    loadingPopular,
    userAddress,
    cities,
    currentCity,
    outsideCoverage,
    setCity,
    resetToGpsDetection,
  } = useRoutes();

  const nearbyStopsRef = useRef(null);

  const handleSelectPopularRoute = (item) => {
    // Match with full route object from RouteContext if available
    const matchedRoute = routes.find(
      (r) => r.id === item.id || r.code === item.code,
    );
    if (matchedRoute) {
      selectRoute(matchedRoute);
    } else {
      selectRoute({
        id: item.id,
        code: item.code,
        name: item.name,
        color: item.color,
      });
    }
    const targetId = matchedRoute?.id || item.id;
    navigate(`/mapa/ruta/${targetId}`);
  };

  const scrollNearbyStops = (direction) => {
    if (nearbyStopsRef.current) {
      const amount = direction === 'left' ? -300 : 300;
      nearbyStopsRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const greeting = getGreeting();
  const cityName = currentCity?.name || 'Ica';

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-surface-page">
      {/* ── Header: flat status band (location + search), no gradient ──── */}
      <header className="bg-white border-b border-slate-200 pt-4 pb-4 px-4 sm:px-6 space-y-3.5 relative z-10">
        {/* Top row: brand (mobile only — global Header shows it on sm+) + notifications */}
        <div className="flex justify-end items-center">
          <div className="flex sm:hidden items-center gap-2.5 mr-auto">
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center">
              <Bus className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-ink-primary">
              Ruta<span className="text-brand-primary">Ya</span>
            </span>
          </div>

          <button
            type="button"
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors active:scale-90"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>

        {/* Location block — the page's thesis: where you are */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink-secondary">{greeting}</p>
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-bold text-ink-primary leading-tight tracking-tight">
              {cityName}
            </h1>
            <button
              type="button"
              onClick={() => setShowCitySelector(!showCitySelector)}
              aria-label={`Cambiar ciudad. Actual: ${cityName}`}
              aria-expanded={showCitySelector}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-slate-100 transition-colors active:scale-90"
            >
              <ChevronDown className="w-4.5 h-4.5" />
            </button>
          </div>

          {userAddress?.formattedAddress ? (
            <p className="flex items-center gap-1.5 text-sm text-ink-secondary min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-ink-muted" />
              <span className="truncate">{userAddress.formattedAddress}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-muted">
              {isLocating
                ? 'Detectando tu ubicación…'
                : 'Sin ubicación activa'}
            </p>
          )}
        </div>

        {/* Primary action: search */}
        <button
          type="button"
          onClick={() => navigate('/buscar')}
          className="relative w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-ink-muted hover:bg-slate-100 hover:border-slate-300 transition-colors min-h-11"
        >
          <Search className="absolute left-3.5 w-4.5 h-4.5 text-ink-muted pointer-events-none" />
          <span>Buscar ruta, paradero o lugar…</span>
        </button>
      </header>

      {/* ── City Selector Dialog ────────────────────────────────────────── */}
      {showCitySelector && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Seleccionar ciudad"
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowCitySelector(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-overlay border border-slate-200 w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="font-bold text-ink-primary text-sm">
                Seleccionar ciudad
              </h2>
              <button
                type="button"
                onClick={() => setShowCitySelector(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    setCity(city, true);
                    setShowCitySelector(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                    currentCity?.id === city.id ? 'bg-brand-primary/5' : ''
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm text-ink-primary">
                      {city.name}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      {city.department}
                    </p>
                  </div>
                  {currentCity?.id === city.id && (
                    <span className="text-xs font-bold text-brand-primary">
                      Actual
                    </span>
                  )}
                </button>
              ))}
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    resetToGpsDetection();
                    setShowCitySelector(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-semibold text-sm text-ink-primary">
                    Detectar por GPS
                  </p>
                  <p className="text-xs text-ink-secondary">
                    Usar tu ubicación actual
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Outside Coverage Banner ─────────────────────────────────────── */}
      {outsideCoverage && currentCity && (
        <div
          role="status"
          className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800"
        >
          No encontramos rutas en tu ubicación actual. Mostrando rutas de{' '}
          {currentCity.name}
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-6 pt-5 pb-24 z-0 space-y-8">
        {/* ── Paraderos Cercanos — the primary content ───────────────── */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <span>Paraderos cercanos</span>
              {nearbyStops.length > 0 && (
                <span className="text-xs font-semibold text-ink-secondary bg-slate-100 px-2 py-0.5 rounded-full">
                  {nearbyStops.length}
                </span>
              )}
            </h2>

            <div className="flex items-center gap-3">
              {nearbyStops.length > 1 && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollNearbyStops('left')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Anterior"
                    aria-label="Paradero anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollNearbyStops('right')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Siguiente"
                    aria-label="Paradero siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate('/mapa')}
                className="text-xs text-brand-primary font-bold hover:text-brand-primary-dark transition-colors"
              >
                Ver en mapa
              </button>
            </div>
          </div>

          {/* GPS not active CTA */}
          {!hasCustomLocation && !loadingStops && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
              <div className="flex flex-col items-center gap-2.5 py-2 text-center">
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-primary">
                    Activa tu ubicación GPS
                  </p>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Descubre los paraderos y puntos más cercanos a ti
                  </p>
                </div>
                <button
                  type="button"
                  onClick={triggerGpsRequest}
                  disabled={isLocating}
                  className="mt-1 flex items-center gap-2 bg-brand-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-brand-primary-dark transition-colors active:scale-95 disabled:opacity-60 shadow-2xs min-h-11"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  {isLocating ? 'Obteniendo GPS...' : 'Usar mi ubicación'}
                </button>
              </div>
            </div>
          )}

          {/* Loading skeleton carousel */}
          {loadingStops && (
            <div
              className="flex gap-3 overflow-hidden py-1"
              role="status"
              aria-label="Cargando paraderos cercanos"
            >
              <div className="w-[285px] shrink-0">
                <StopSkeleton />
              </div>
              <div className="w-[285px] shrink-0 opacity-60">
                <StopSkeleton />
              </div>
            </div>
          )}

          {/* Error */}
          {stopsError && !loadingStops && (
            <div
              role="alert"
              className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">{stopsError}</p>
                <button
                  type="button"
                  onClick={loadNearbyStops}
                  className="text-xs font-bold text-red-700 underline mt-1 min-h-11"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Nearby stops horizontal carousel */}
          {!loadingStops && !stopsError && nearbyStops.length > 0 && (
            <div
              ref={nearbyStopsRef}
              className="flex items-center gap-3.5 overflow-x-auto hide-scrollbar scroll-smooth py-1 px-0.5 snap-x snap-mandatory"
            >
              {nearbyStops.map((stop) => (
                <div
                  key={stop.id}
                  className="w-[285px] sm:w-[315px] shrink-0 snap-center transition-transform duration-200 hover:scale-[1.01]"
                >
                  <NearbyStopCard
                    stop={stop}
                    routes={routes}
                    distanceKm={stop.distanceKm}
                  />
                </div>
              ))}
            </div>
          )}

          {/* GPS active but no stops found */}
          {!loadingStops &&
            !stopsError &&
            hasCustomLocation &&
            nearbyStops.length === 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 text-center">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-ink-primary">
                  Sin paraderos cercanos
                </p>
                <p className="text-xs text-ink-secondary mt-1">
                  No encontramos paraderos en un radio de 1.2 km.
                </p>
              </div>
            )}
        </section>

        {/* ── Rutas Populares — neutral list; color comes from route data ─ */}
        <section className="space-y-3.5">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-ink-primary">
              Rutas populares
              {(hasCustomLocation || gpsReady) && (
                <span className="text-sm font-medium text-ink-muted">
                  {' '}
                  · a 2 km o menos
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/rutas')}
              className="text-xs text-brand-primary font-bold hover:text-brand-primary-dark transition-colors flex items-center gap-0.5"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingPopular ? (
            <div
              className="space-y-3"
              role="status"
              aria-label="Cargando rutas populares"
            >
              <PopularRouteSkeleton />
              <PopularRouteSkeleton />
            </div>
          ) : displayedPopularRoutes.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-card space-y-2">
              <p className="text-xs text-ink-secondary font-medium">
                No hay rutas populares a menos de 2 km de tu ubicación actual.
              </p>
              <button
                type="button"
                onClick={() => navigate('/rutas')}
                className="text-xs font-bold text-brand-primary bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors min-h-11"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedPopularRoutes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPopularRoute(item)}
                  aria-label={`Ver recorrido de la ruta ${item.code}: ${item.name}`}
                  className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center justify-between gap-3.5 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary text-left"
                >
                  {/* Route code pill — the app's signature; data carries the color */}
                  <div
                    className="w-14 h-10 text-white font-bold text-xs rounded-2xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
                    style={{ backgroundColor: item.color || '#E8532E' }}
                  >
                    {item.code}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-ink-primary text-sm truncate leading-tight group-hover:text-brand-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs font-medium text-ink-secondary mt-0.5">
                      {item.totalStops} pts. frecuentes
                    </p>
                  </div>

                  {/* Popularity band — plain language, quiet styling */}
                  <span className="shrink-0 text-xs font-semibold text-ink-secondary bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full">
                    {popularityLabel(item.popularityScore)}
                  </span>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
