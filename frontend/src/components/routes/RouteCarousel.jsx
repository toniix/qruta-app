import { Route as RouteIcon, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, MapPin } from "lucide-react";
import { RouteCard } from "./RouteCard";

export function RouteCarousel({
  routes = [],
  selectedRoute = null,
  onSelectRoute,
  onlyNearby = false,
  loading = false,
  loadingFiltered = false,
  error = null,
  carouselRef,
  onScroll,
}) {
  const getCategoryTitle = () => {
    if (onlyNearby) return "Rutas cercanas a ti";
    return "Rutas disponibles";
  };

  return (
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
              {routes.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {onlyNearby
              ? "Ordenadas por proximidad a tu GPS"
              : "Desliza para explorar las rutas"}
          </p>
        </div>

        {/* Navigation Arrows */}
        {routes.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0 pr-2">
            <button
              onClick={() => onScroll?.("left")}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-2xs"
              title="Anterior"
              aria-label="Rutas anteriores"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onScroll?.("right")}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 shadow-2xs"
              title="Siguiente"
              aria-label="Rutas siguientes"
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
      {!loading && !loadingFiltered && routes.length === 0 && (
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
      {!loading && !loadingFiltered && routes.length > 0 && (
        <div
          ref={carouselRef}
          className="flex items-center gap-3 overflow-x-auto hide-scrollbar scroll-smooth py-1 px-0.5 snap-x snap-mandatory"
        >
          {routes.map((route) => (
            <div
              key={route.id}
              className="w-[88%] sm:w-[330px] shrink-0 snap-center transition-transform duration-200 hover:scale-[1.01]"
            >
              <RouteCard
                route={route}
                isSelected={selectedRoute?.id === route.id}
                onSelect={onSelectRoute}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

