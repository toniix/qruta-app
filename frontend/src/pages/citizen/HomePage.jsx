import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Navigation,
  MapPin,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Clock3,
  Star,
} from "lucide-react";
import { useRoutes } from "../../contexts/RouteContext";
import { useFavorites } from "../../hooks/useFavorites";
import { streetLine } from "../../services/geocodingService";
import { getGreeting } from "../../utils/dateUtils";
import { prefetchRoute } from "../../utils/routePrefetch";
import { NearbyStopCard, StopSkeleton } from "../../components/home";
import { QrutaSymbol } from "../../components/common/QrutaSymbol";

/** Present the backend popularity score as a plain-language band, not a false-precision percentage. */
function popularityLabel(score) {
  if (score == null) return "Popular";
  return score >= 70 ? "Muy popular" : "Popular";
}

/** Mirrors SearchPage's RECENT_KEY: recent global-search queries. */
const RECENT_SEARCHES_KEY = "rutasya_recent_searches";
const MAX_HOME_RECENTS = 5;

function readRecentSearches() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(RECENT_SEARCHES_KEY) || "[]",
    );
    return Array.isArray(stored)
      ? stored.filter((q) => typeof q === "string").slice(0, MAX_HOME_RECENTS)
      : [];
  } catch {
    return [];
  }
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
    addressStatus,
    gpsPermissionState,
    setShowGpsModal,
  } = useRoutes();

  // Show polite GPS modal only on HomePage arrival if never dismissed in this session
  useEffect(() => {
    let timer;
    try {
      const hasDismissed = sessionStorage.getItem("rutasya_gps_modal_dismissed");
      if (!hasDismissed && gpsPermissionState === "prompt") {
        timer = setTimeout(() => {
          if (typeof setShowGpsModal === "function") {
            setShowGpsModal(true);
          }
        }, 1200);
      }
    } catch {
      // ignore storage access errors
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [gpsPermissionState, setShowGpsModal]);

  const nearbyStopsRef = useRef(null);
  const { favorites } = useFavorites();
  const [recentSearches] = useState(readRecentSearches);

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
    navigate(`/mapa/ruta/${targetId}`, { state: { from: "/" } });
  };

  const scrollNearbyStops = (direction) => {
    if (nearbyStopsRef.current) {
      const amount = direction === "left" ? -300 : 300;
      nearbyStopsRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const greeting = getGreeting();
  const cityName = currentCity?.name || "Ica";

  // User address line: street + number + district ("Av. Bolívar 123, Ica"),
  // falling back to the formatted address when there is no street.
  const userStreetLine = streetLine(userAddress);
  const userDistrict =
    typeof userAddress?.district === "string"
      ? userAddress.district.trim()
      : "";
  const userAddressDisplay = userStreetLine
    ? userDistrict && !userStreetLine.includes(userDistrict)
      ? `${userStreetLine}, ${userDistrict}`
      : userStreetLine
    : userAddress?.formattedAddress || "";

  // GPS may already be ready while the reverse-geocode request is still in
  // flight; treat that gap as loading so the pill never flashes "Sin ubicación activa".
  const isResolvingLocation =
    isLocating ||
    (gpsReady && (addressStatus === "idle" || addressStatus === "loading"));

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-surface-page">
      {/* ── QRuta Urban Tech Hero: Surface Navy (#111B2E) + Electric Lime (#B7F34A) ─────── */}
      <header className="bg-brand-navy border-b border-border-navy px-4 sm:px-6 pt-3.5 sm:pt-4 pb-5 text-white space-y-3.5 relative z-10 shadow-lg shadow-black/20">
        {/* Top row: brand (mobile only — global Header shows it on sm+) + City selector button */}
        <div className="flex justify-between items-center gap-3">
          <div className="flex sm:hidden items-center gap-2">
            <QrutaSymbol
              variant="lime"
              className="w-14 h-14 shrink-0 drop-shadow-md"
            />
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-black text-2xl leading-none tracking-tight text-white">
                Q<span className="text-brand-lime">Ruta</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-300 mt-1 leading-tight">
                Menos preguntas,{" "}
                <span className="text-brand-lime">más viajes.</span>
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {greeting}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowCitySelector(!showCitySelector)}
            aria-label={`Cambiar ciudad. Actual: ${cityName}`}
            aria-expanded={showCitySelector}
            className="group flex items-center gap-1.5 sm:gap-2 bg-surface-navy hover:bg-surface-navy-elevated border border-border-navy rounded-xl px-2.5 sm:px-3 py-1.5 transition-colors cursor-pointer shrink-0 ml-auto"
          >
            <span className="p-1 rounded-lg bg-brand-lime/10 text-brand-lime shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[120px] sm:max-w-none">
              {cityName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform group-hover:text-white ${showCitySelector ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Location & Address block */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 sm:hidden">
            {greeting}
          </p>
          <div className="flex items-center">
            {userAddressDisplay ? (
              <p className="flex items-center gap-1.5 min-w-0 max-w-full sm:max-w-md text-xs font-semibold text-slate-200 bg-surface-navy border border-border-navy rounded-full pl-2.5 pr-3 py-1.5 shadow-2xs">
                <span className="relative flex w-2 h-2 shrink-0">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-brand-lime opacity-80 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-brand-lime" />
                </span>
                <span className="text-slate-400 font-normal shrink-0">Tu ubicación:</span>
                <span className="truncate font-semibold text-slate-100">{userAddressDisplay}</span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 min-w-0 text-xs font-medium text-slate-400 bg-surface-navy border border-border-navy rounded-full px-3 py-1.5">
                {isResolvingLocation ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-brand-lime shrink-0" />
                    <span className="truncate">Detectando tu ubicación…</span>
                  </>
                ) : (
                  <span className="truncate">Sin ubicación activa</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Primary action: Hero search bar */}
        <button
          type="button"
          onClick={() => navigate("/buscar")}
          className="group relative w-full flex items-center gap-3 bg-white rounded-2xl p-2.5 sm:p-3 shadow-overlay border border-slate-100 hover:border-brand-lime transition-all text-left cursor-pointer active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            <Search className="w-5 h-5 text-brand-lime" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ¿A dónde vas?
            </p>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
              Buscar ruta, paradero o lugar…
            </p>
          </div>
          <span className="shrink-0 text-xs font-black text-brand-navy bg-brand-lime hover:bg-brand-lime-hover px-3.5 py-2 rounded-xl shadow-2xs transition-colors">
            Buscar
          </span>
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
                    currentCity?.id === city.id ? "bg-brand-primary/5" : ""
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
          No encontramos rutas en tu ubicación actual. Mostrando rutas de{" "}
          {currentCity.name}
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-6 pt-5 pb-24 z-0 space-y-7">
        {/* ── Continúa explorando: recents + favorites, compact one-liner ── */}
        {(recentSearches.length > 0 || favorites.length > 0) && (
          <section aria-label="Continúa explorando" className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5">
              {recentSearches.map((query) => (
                <button
                  key={`recent-${query}`}
                  type="button"
                  onClick={() => navigate("/buscar", { state: { query } })}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 max-w-44 rounded-full px-3.5 py-1.5 bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 transition-all active:scale-95"
                >
                  <Clock3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{query}</span>
                </button>
              ))}
              {favorites.slice(0, 5).map((fav) => (
                <button
                  key={`fav-${fav.id}`}
                  type="button"
                  onClick={() => handleSelectPopularRoute(fav)}
                  aria-label={`Ver recorrido de la ruta ${fav.code}: ${fav.name}`}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 max-w-44 rounded-full px-3.5 py-1.5 bg-amber-50 border border-amber-200/70 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-100 transition-all active:scale-95"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">
                    {fav.code ? `${fav.code} · ${fav.name}` : fav.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

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
                    onClick={() => scrollNearbyStops("left")}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Anterior"
                    aria-label="Paradero anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollNearbyStops("right")}
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
                onClick={() => navigate("/mapa")}
                className="text-xs text-brand-navy bg-slate-100 hover:bg-slate-200 font-extrabold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
              >
                <span>Ver en mapa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* GPS not active CTA */}
          {!gpsReady && !loadingStops && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-200/90">
              <div className="flex flex-col items-center gap-2.5 py-2 text-center">
                <div className="w-12 h-12 bg-brand-lime-soft rounded-2xl flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-brand-secondary" />
                </div>
                <div>
                  <p className="text-base font-extrabold text-slate-900">
                    Activa tu ubicación GPS
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Descubre los paraderos y puntos más cercanos a ti en tiempo
                    real
                  </p>
                </div>
                <button
                  type="button"
                  onClick={triggerGpsRequest}
                  disabled={isLocating}
                  className="mt-1 flex items-center gap-2 bg-brand-navy hover:bg-surface-navy-elevated text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-2xs min-h-11"
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand-lime" />
                  ) : (
                    <Navigation className="w-4 h-4 text-brand-lime" />
                  )}
                  <span>
                    {isLocating ? "Obteniendo GPS..." : "Usar mi ubicación"}
                  </span>
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
            gpsReady &&
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
              {gpsReady && (
                <span className="text-sm font-medium text-ink-muted">
                  {" "}
                  · a 2 km o menos
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => navigate("/rutas")}
              onMouseEnter={() => prefetchRoute('/rutas')}
              onTouchStart={() => prefetchRoute('/rutas')}
              className="text-xs text-brand-navy bg-slate-100 hover:bg-slate-200 font-extrabold px-3 py-1.5 rounded-full transition-colors flex items-center gap-0.5"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
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
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/90 shadow-card space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                {gpsReady
                  ? "No hay rutas populares a menos de 2 km de tu ubicación actual."
                  : "No hay rutas populares registradas por el momento."}
              </p>
              <button
                type="button"
                onClick={() => navigate("/rutas")}
                onMouseEnter={() => prefetchRoute('/rutas')}
                onTouchStart={() => prefetchRoute('/rutas')}
                className="text-xs font-black text-brand-navy bg-brand-lime hover:bg-brand-lime-hover px-4 py-2 rounded-xl transition-colors min-h-11 shadow-2xs"
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
                  className="w-full bg-white rounded-2xl p-4 border border-slate-200/90 shadow-card flex items-center justify-between gap-3.5 hover:border-slate-300 hover:shadow-raised transition-all duration-200 cursor-pointer group active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime text-left"
                >
                  {/* Route code squircle pill */}
                  <div
                    className="w-14 h-10 text-white font-black text-xs rounded-xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
                    style={{ backgroundColor: item.color || "#60A5FA" }}
                  >
                    {item.code}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate leading-tight group-hover:text-brand-secondary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {(item.category || "MICRO").toUpperCase() === "COMBI"
                        ? "Combi"
                        : "Micro"}
                    </p>
                  </div>

                  {/* Popularity band */}
                  <span className="shrink-0 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full">
                    {popularityLabel(item.popularityScore)}
                  </span>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
