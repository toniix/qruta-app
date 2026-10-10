import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Route as RouteIcon,
} from "lucide-react";

export function HomeMapPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    routes,
    filteredRoutes,
    loadingFiltered,
    selectedRoute,
    selectedStop,
    searchedLocation,
    userLocation,
    onlyNearby,
    loading,
    error,
    nearestMatchInfo,
    activeDirection,
    selectRoute,
    selectStop,
    clearSelection,
    requestLocation,
    isLocating,
    gpsReady,
    hasCustomLocation,
  } = useRoutes();

  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const carouselRef = useRef(null);


  // Sync URL parameter /mapa/ruta/:id with selectedRoute state
  useEffect(() => {
    if (id) {
      const isAlreadySelected =
        selectedRoute && String(selectedRoute.id) === String(id);
      if (!isAlreadySelected) {
        const found = routes?.find((r) => String(r.id) === String(id));
        selectRoute(found || { id });
      }
    } else {
      // Only clear selection if we are on base /mapa route without an id param
      if (selectedRoute) {
        clearSelection();
      }
    }
  }, [id, routes, selectedRoute, selectRoute, clearSelection]);

  // Auto-scroll carousel to position 0 when nearby filter is activated
  useEffect(() => {
    if (onlyNearby && carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [onlyNearby, nearestMatchInfo]);

  const handleSelectRoute = (route) => {
    selectRoute(route);
    if (route?.id) {
      navigate(`/mapa/ruta/${route.id}`);
    }
  };

  const handleCloseDetail = () => {
    clearSelection();
    navigate("/mapa");
  };

  const getCategoryTitle = () => {
    if (onlyNearby) return "Rutas cercanas a ti";
    return "Rutas disponibles";
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -310 : 310;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleRecenterGPS = async () => {
    if (!hasCustomLocation && !gpsReady) {
      try {
        await requestLocation();
      } catch (err) {
        console.warn("No se pudo obtener ubicación GPS:", err);
      }
    }
    setRecenterTrigger(Date.now());
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-100 flex flex-col">
      {/* ── Interactive Leaflet Map Background ────────────────────────────── */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <InteractiveMap
          routes={filteredRoutes}
          selectedRoute={selectedRoute}
          selectedStop={selectedStop}
          searchedLocation={searchedLocation}
          userLocation={userLocation}
          gpsReady={gpsReady || hasCustomLocation}
          isLocating={isLocating}
          onSelectRoute={handleSelectRoute}
          onSelectStop={selectStop}
          activeDirection={activeDirection}
          recenterTrigger={recenterTrigger}
          mapCenter={
            hasCustomLocation || gpsReady
              ? [userLocation.lat, userLocation.lng]
              : undefined
          }
        />
      </div>

      {/* ── Top Floating Container (Search & Filter Chips) ─────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 pointer-events-none max-w-lg mx-auto w-full">
        {selectedRoute ? (
          /* When a route is selected: Back button + Route Name Pill */
          <div className="pointer-events-auto flex items-center justify-between gap-2.5 animate-slide-in-top">
            {/* Back button */}
            <button
              onClick={handleCloseDetail}
              className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
              title="Volver al mapa"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Selected Route Title Pill */}
            <div className="bg-white rounded-full px-4 py-2 shadow-raised border border-slate-100 flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedRoute.color || "var(--color-brand-primary)" }}
              />
              <span className="truncate">
                {selectedRoute.code} -{" "}
                {selectedRoute.name?.replace(/^Ruta \w+:\s*/i, "")}
              </span>
            </div>

            {/* Close button */}
            <button
              onClick={handleCloseDetail}
              className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
              title="Cerrar vista de detalle"
            >
              <span className="text-sm font-bold">✕</span>
            </button>
          </div>
        ) : (
          /* Normal SearchBar + Quick Filter Chips */
          <SearchBar />
        )}
      </div>

      {/* ── Bottom Floating Area (Carousel OR Route Drawer) ───────────────── */}
      <div className="mt-auto relative z-20 pointer-events-none w-full max-w-lg mx-auto">
        {/* GPS Recenter Floating Button (Floats 14px above sheet top-right corner) */}
        <button
          onClick={handleRecenterGPS}
          disabled={isLocating}
          className="absolute -top-14 right-4 sm:right-2 z-40 pointer-events-auto w-12 h-12 rounded-full bg-white text-slate-800 shadow-overlay border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90"
          title="Centrar en mi ubicación GPS"
        >
          <Target
            className={`w-5 h-5 ${
              isLocating
                ? "animate-spin text-blue-600"
                : "text-blue-600 hover:scale-110 transition-transform"
            }`}
          />
        </button>

        {selectedRoute ? (
          /* Detail Drawer when route selected (with mb-16 to sit above BottomNav) */
          <div className="pointer-events-auto mb-16 sm:mb-20">
            <RouteDrawer />
          </div>
        ) : (
          /* Route Horizontal Carousel Sheet when no route selected (occupies 100% width on mobile) */
          <div className="pointer-events-auto p-4 sm:p-5 space-y-3 bg-white/95 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl shadow-overlay border border-slate-100/90 animate-slide-in-bottom mb-16 sm:mb-20">
            {/* Sheet Handle Indicator */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-1 shrink-0" />

            {/* Carousel Header & Counter */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{getCategoryTitle()}</span>
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                    {filteredRoutes.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {onlyNearby
                    ? "Ordenadas por proximidad a tu GPS"
                    : "Desliza para explorar las rutas"}
                </p>
              </div>

              {/* Navigation Arrows */}
              {filteredRoutes.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0 pr-2">
                  <button
                    onClick={() => scrollCarousel("left")}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-2xs"
                    title="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollCarousel("right")}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-2xs"
                    title="Siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-2xl flex items-center gap-2 border border-red-100 shadow-2xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading state */}
            {(loading || loadingFiltered) && (
              <div className="py-8 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">
                  {loadingFiltered
                    ? "Buscando rutas cercanas a tu ubicación..."
                    : "Cargando rutas disponibles..."}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!loading && !loadingFiltered && filteredRoutes.length === 0 && (
              <div className="bg-slate-50/80 rounded-2xl p-6 text-center shadow-2xs border border-slate-100">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  No se encontraron rutas
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Intenta cambiar el texto de búsqueda o la ubicación.
                </p>
              </div>
            )}

            {/* Horizontal Scrollable Carousel */}
            {!loading && !loadingFiltered && filteredRoutes.length > 0 && (

              <div
                ref={carouselRef}
                className="flex items-center gap-3 overflow-x-auto hide-scrollbar scroll-smooth py-1 px-0.5 snap-x snap-mandatory"
              >
                {filteredRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="w-[88%] sm:w-[330px] shrink-0 snap-center transition-transform duration-200 hover:scale-[1.01]"
                  >
                    <RouteCard
                      route={route}
                      isSelected={selectedRoute?.id === route.id}
                      onSelect={() => handleSelectRoute(route)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
