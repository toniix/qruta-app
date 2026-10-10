import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Navigation,
  Clock,
  Heart,
  MapPin,
  Loader2,
  Bus,
  AlertCircle,
  Sparkles,
  Flame,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { getGreeting } from '../../utils/dateUtils';
import { QuickAction, NearbyStopCard, StopSkeleton } from '../../components/home';

export function HomePage() {
  const navigate = useNavigate();
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

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-brand-gradient pt-10 pb-9 px-5 sm:px-6 rounded-b-xl text-white relative z-10 animate-slide-in-top space-y-4 shadow-md">
        {/* Top Brand Bar: Logo & App Name + City Badge + Notifications */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Logo Icon Box */}
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
              <Bus className="w-5 h-5 text-white" />
            </div>

            {/* Brand Title & Badge */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-white drop-shadow-xs">
                  Ruta<span className="text-amber-300">Ya</span>
                </span>
                <span className="text-xs font-bold tracking-wider uppercase bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 backdrop-blur-md flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" /> Ica
                </span>
              </div>
            </div>
          </div>

          {/* Right Action: Notifications */}
          <button
            className="bg-white/20 p-2.5 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors active:scale-90 border border-white/20"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>

        {/* Greeting Sub-header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold mb-0.5 leading-tight">
            {greeting}!
          </h1>
          {userAddress?.formattedAddress ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white border border-white/25 max-w-full truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">Estás en {userAddress.formattedAddress}</span>
            </div>
          ) : (
            <p className="text-xs text-white/90 font-medium">¿A dónde vamos a viajar hoy?</p>
          )}
        </div>

        {/* Search trigger — navigates to the real search page */}
        <button
          type="button"
          onClick={() => navigate('/buscar')}
          className="relative w-full flex items-center gap-3 bg-white rounded-full py-3.5 pl-12 pr-4 shadow-md border-0 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <Search className="absolute left-4 w-5 h-5 text-slate-500 pointer-events-none" />
          <span>Buscar ruta, paradero o lugar…</span>
        </button>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar -mt-4 pt-6 px-4 sm:px-6 pb-24 z-0 space-y-7">
        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <section className="grid grid-cols-4 gap-2.5 sm:gap-3">
          <QuickAction
            icon={Search}
            label={`Buscar\nRuta`}
            bgClass="bg-blue-50/90 text-blue-600 border border-blue-100/80"
            iconClass="text-blue-600"
            onClick={() => navigate('/buscar')}
          />
          <QuickAction
            icon={Navigation}
            label={`Rutas\nCercanas`}
            bgClass="bg-emerald-50/90 text-emerald-600 border border-emerald-100/80"
            iconClass="text-emerald-600"
            onClick={() => navigate('/cercanas')}
          />
          <QuickAction
            icon={Clock}
            label="Horarios"
            bgClass="bg-orange-50/90 text-orange-600 border border-orange-100/80"
            iconClass="text-orange-500"
            onClick={() => navigate('/rutas')}
          />
          <QuickAction
            icon={Heart}
            label="Favoritos"
            bgClass="bg-rose-50/90 text-rose-600 border border-rose-100/80"
            iconClass="text-rose-500"
            onClick={() => navigate('/favoritos')}
          />
        </section>

        {/* ── Puntos / Paraderos Cercanos (Horizontal Carousel) ─────────────── */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Paraderos cercanos</span>
              {nearbyStops.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  {nearbyStops.length}
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              {nearbyStops.length > 1 && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={() => scrollNearbyStops('left')}
                    className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollNearbyStops('right')}
                    className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => navigate('/mapa')}
                className="text-xs text-blue-600 font-bold hover:text-blue-700 transition-colors"
              >
                Ver en mapa
              </button>
            </div>
          </div>

          {/* GPS not active CTA */}
          {!hasCustomLocation && !loadingStops && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 animate-fade-in">
              <div className="flex flex-col items-center gap-2.5 py-2 text-center">
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Activa tu ubicación GPS
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Descubre los paraderos y puntos más cercanos a ti
                  </p>
                </div>
                <button
                  onClick={triggerGpsRequest}
                  disabled={isLocating}
                  className="mt-1 flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-95 disabled:opacity-60 shadow-2xs"
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

          {/* Loading Skeleton Carousel */}
          {loadingStops && (
            <div className="flex gap-3 overflow-hidden py-1">
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
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">{stopsError}</p>
                <button
                  onClick={loadNearbyStops}
                  className="text-xs font-bold text-red-700 underline mt-1"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Nearby Stops Horizontal Scrollable Carousel */}
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
          {!loadingStops && !stopsError && hasCustomLocation && nearbyStops.length === 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 text-center animate-fade-in">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                Sin paraderos cercanos
              </p>
              <p className="text-xs text-slate-500 mt-1">
                No encontramos paraderos en un radio de 1.2 km.
              </p>
            </div>
          )}
        </section>

        {/* ── Rutas Populares ────────────────────────────────────────── */}
        <section className="space-y-3.5">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20 shrink-0" />
              <span>Rutas populares</span>
              {(hasCustomLocation || gpsReady) && (
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60 shadow-2xs">
                  A ≤ 2 km
                </span>
              )}
            </h2>
            <button
              onClick={() => navigate('/rutas')}
              className="text-xs text-blue-600 font-bold hover:text-blue-700 transition-colors flex items-center gap-0.5"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingPopular ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">Cargando rutas populares...</p>
            </div>
          ) : displayedPopularRoutes.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 space-y-2">
              <p className="text-xs text-slate-600 font-medium">
                No hay rutas populares a menos de 2 km de tu ubicación actual.
              </p>
              <button
                onClick={() => navigate('/rutas')}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedPopularRoutes.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectPopularRoute(item)}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center justify-between gap-3.5 hover:shadow-md hover:border-orange-200 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                >
                  {/* Code Pill Badge */}
                  <div
                    className="w-14 h-10 text-white font-bold text-xs rounded-2xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
                    style={{ backgroundColor: item.color || '#E8532E' }}
                  >
                    {item.code}
                  </div>

                  {/* Route Name & Total Stops */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate leading-tight group-hover:text-orange-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{item.totalStops} pts. frecuentes</span>
                    </p>
                  </div>

                  {/* Popularity Score Badge */}
                  <div className="shrink-0 flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full">
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                    <span className="text-xs font-bold text-orange-600">
                      {item.popularityScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
