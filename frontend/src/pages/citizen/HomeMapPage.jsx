import { useRef, useEffect } from "react";
import { SearchBar } from "../../components/search/SearchBar";
import { RouteCard } from "../../components/routes/RouteCard";
import { RouteDrawer } from "../../components/routes/RouteDrawer";
import { InteractiveMap } from "../../components/map/InteractiveMap";
import { useRoutes } from "../../contexts/RouteContext";
import {
  MapPin,
  AlertCircle,
  RefreshCw,
  Target,
  Info,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

export function HomeMapPage() {
  const {
    filteredRoutes,
    selectedRoute,
    selectedStop,
    searchedLocation,
    nearestMatchInfo,
    selectRoute,
    selectStop,
    clearSelection,
    loading,
    error,
    reload,
    onlyNearby,
    searchQuery,
    userLocation,
    locateNearestRoute,
    isLocating,
    gpsReady,
    gpsPermissionState,
  } = useRoutes();

  console.log(filteredRoutes);

  const carouselRef = useRef(null);

  // Auto-scroll carousel to position 0 (the nearest route) when nearby filter is activated
  useEffect(() => {
    if (onlyNearby && carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [onlyNearby, nearestMatchInfo]);

  const getCategoryTitle = () => {
    if (searchQuery) return `Resultados para "${searchQuery}"`;
    if (onlyNearby) return "Rutas Cercanas a tu Ubicación";
    return "Todas las Rutas Urbanas";
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-4rem-4rem)] sm:h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 flex flex-col">
      <div className="absolute inset-0 z-0 w-full h-full">
        <InteractiveMap
          routes={filteredRoutes}
          selectedRoute={selectedRoute}
          selectedStop={selectedStop}
          searchedLocation={searchedLocation}
          userLocation={userLocation}
          gpsReady={gpsReady}
          isLocating={isLocating}
          onSelectRoute={selectRoute}
          onSelectStop={selectStop}
          mapCenter={
            gpsReady ? [userLocation.lat, userLocation.lng] : undefined
          }
        />
      </div>

      <div className="relative z-10 p-2.5 sm:p-4 max-w-xl mx-auto w-full pointer-events-auto space-y-2">
        {selectedRoute ? (
          <div className="glass-panel p-3 sm:p-3.5 rounded-3xl shadow-xl border border-amber-200/90 bg-amber-50/95 backdrop-blur-xl text-amber-950 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                    Trazado: {selectedRoute.code}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-900/90 leading-relaxed whitespace-normal break-words">
                  <strong>Puntos clave del recorrido:</strong> Toca un punto
                  para ver su ubicación en el mapa.
                </p>
              </div>
            </div>

            <button
              onClick={clearSelection}
              className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs transition-colors flex-shrink-0 active:scale-95 self-start mt-0.5"
              title="Volver a la búsqueda de rutas"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Volver</span>
            </button>
          </div>
        ) : (
          <div className="glass-panel p-2.5 sm:p-3 rounded-3xl shadow-xl border border-white/80 backdrop-blur-xl">
            <SearchBar />
          </div>
        )}
      </div>

      <div
        className={`absolute right-3 sm:right-4 z-10 pointer-events-auto transition-all top-28 sm:top-32`}
      >
        <button
          onClick={locateNearestRoute}
          disabled={isLocating}
          className="p-2.5 sm:p-3 bg-white/95 text-slate-800 hover:bg-slate-50 rounded-2xl shadow-xl border border-slate-200/80 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center group"
          title={
            gpsReady || gpsPermissionState === "granted"
              ? "Encontrar la ruta más cercana a mi ubicación"
              : "Activar GPS y encontrar la ruta más cercana"
          }
        >
          <Target
            className={`w-5 h-5 ${
              isLocating
                ? "animate-spin text-emerald-600"
                : "text-emerald-600 group-hover:scale-110 transition-transform"
            }`}
          />
        </button>
      </div>

      <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 z-20 p-2 sm:p-4 max-w-4xl mx-auto w-full pointer-events-auto pb-safe">
        {selectedRoute ? (
          <RouteDrawer />
        ) : (
          <div className="glass-panel rounded-3xl border border-white/90 shadow-2xl p-2.5 sm:p-3 space-y-2.5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                onClick={locateNearestRoute}
                disabled={isLocating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all border bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700 active:scale-95 flex-shrink-0"
                title={
                  gpsReady || gpsPermissionState === "granted"
                    ? "Encontrar la ruta más cercana a mi ubicación"
                    : "Activar GPS y encontrar la ruta más cercana"
                }
              >
                <Target
                  className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`}
                />
                <span>
                  {isLocating
                    ? "Ubicando GPS..."
                    : gpsReady || gpsPermissionState === "granted"
                      ? "📍 Rutas Cercanas"
                      : "📍 Activar GPS"}
                </span>
              </button>

              <button
                onClick={() => {
                  clearSelection();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                  !onlyNearby && !searchQuery
                    ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                    : "bg-white/90 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ver Todas</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-1 border-t border-slate-100 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                  {getCategoryTitle()}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {filteredRoutes?.length || 0}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => scrollCarousel("left")}
                  className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading && (
              <div className="py-6 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-1.5" />
                <p className="text-xs">Cargando rutas...</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={reload}
                  className="font-bold underline text-red-800"
                >
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && (
              <div
                ref={carouselRef}
                className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 pt-3.5"
              >
                {filteredRoutes?.length === 0 ? (
                  <div className="w-full text-center py-6 px-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-1.5 text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      No se encontraron rutas
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Intenta cambiar la búsqueda o la ubicación.
                    </p>
                  </div>
                ) : (
                  filteredRoutes?.map((route) => {
                    const isNearest = Boolean(
                      onlyNearby && nearestMatchInfo?.route?.id === route.id,
                    );
                    const distanceKm = isNearest
                      ? nearestMatchInfo?.distanceKm
                      : null;
                    return (
                      <div
                        key={route.id}
                        className="flex-none w-[88%] sm:w-[320px] snap-center"
                      >
                        <RouteCard
                          route={route}
                          isNearest={isNearest}
                          distanceKm={distanceKm}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
