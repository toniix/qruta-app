import { useRef } from 'react';
import { SearchBar } from '../../components/search/SearchBar';
import { RouteCard } from '../../components/routes/RouteCard';
import { RouteDrawer } from '../../components/routes/RouteDrawer';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { useRoutes } from '../../contexts/RouteContext';
import { formatDistance } from '../../utils/geoUtils';
import {
  MapPin,
  AlertCircle,
  RefreshCw,
  Sparkles,
  GraduationCap,
  ShoppingBag,
  Palmtree,
  Layers,
  Target,
  CheckCircle2,
  Info,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function HomeMapPage() {
  const {
    filteredRoutes,
    selectedRoute,
    selectedStop,
    searchedLocation,
    nearestMatchInfo,
    activeCategory,
    setActiveCategory,
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
  } = useRoutes();

  const carouselRef = useRef(null);

  // Compute title badge text based on active state
  const getCategoryTitle = () => {
    if (searchQuery) return `Resultados para "${searchQuery}"`;
    if (onlyNearby) return 'Rutas Cercanas a tu Ubicación';
    switch (activeCategory) {
      case 'featured':
        return 'Rutas Más Frecuentadas en Ica';
      case 'university':
        return 'Rutas Universitarias (UNICA)';
      case 'commercial':
        return 'Rutas a Malls y Mercados';
      case 'tourist':
        return 'Rutas Turísticas (Huacachina / Luren)';
      default:
        return 'Todas las Rutas Urbanas';
    }
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-4rem-4rem)] sm:h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 flex flex-col">
      {/* 1. Full Hero Map Canvas (Hero background) */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <InteractiveMap
          routes={filteredRoutes}
          selectedRoute={selectedRoute}
          selectedStop={selectedStop}
          searchedLocation={searchedLocation}
          userLocation={userLocation}
          onSelectRoute={selectRoute}
          onSelectStop={selectStop}
        />
      </div>

      {/* 2. Top Floating Overlay over Map (Ultra-compact Search input) */}
      <div className="relative z-10 p-2.5 sm:p-4 max-w-xl mx-auto w-full pointer-events-auto space-y-2">
        {selectedRoute ? (
          /* Top Informational Banner (Replaces SearchBar when viewing a Route Detail) */
          <div className="glass-panel p-3 sm:p-3.5 rounded-3xl shadow-xl border border-amber-200/90 bg-amber-50/95 backdrop-blur-xl text-amber-950 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                    Trazado: {selectedRoute.code} ({selectedRoute.lineCode})
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full flex-shrink-0">
                    Ica
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-900/90 leading-relaxed whitespace-normal break-words">
                  <strong>Puntos clave del recorrido:</strong> Estos son los lugares de referencia principales por donde transita la ruta. Puedes subir o solicitar tu bajada al conductor en estos puntos o en cualquier tramo del camino.
                </p>
              </div>
            </div>

            {/* Back / Close button to return to search */}
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
          /* Default SearchBar Card when NO route is selected */
          <div className="glass-panel p-2.5 sm:p-3 rounded-3xl shadow-xl border border-white/80 backdrop-blur-xl">
            <SearchBar />
          </div>
        )}

        {/* Floating Proximity Banner when nearest route is found and no route is selected */}
        {!selectedRoute && nearestMatchInfo && (
          <div className="p-2.5 sm:p-3 bg-emerald-600 text-white rounded-2xl shadow-xl border border-emerald-500 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
              <span className="truncate">
                Ruta más cercana: <strong>{nearestMatchInfo.route?.code}</strong> en punto{' '}
                <strong>{nearestMatchInfo.stop?.name}</strong> (a{' '}
                {formatDistance(nearestMatchInfo.distanceKm)})
              </span>
            </div>
            <button
              onClick={() => {
                selectRoute(nearestMatchInfo.route);
                selectStop(nearestMatchInfo.stop);
              }}
              className="font-bold underline bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors whitespace-nowrap ml-2"
            >
              Ver trazado
            </button>
          </div>
        )}
      </div>

      {/* Floating GPS Recenter Button */}
      <div
        className={`absolute right-3 sm:right-4 z-10 pointer-events-auto transition-all ${
          selectedRoute ? 'top-28 sm:top-32' : 'top-28 sm:top-32'
        }`}
      >
        <button
          onClick={locateNearestRoute}
          disabled={isLocating}
          className="p-2.5 sm:p-3 bg-white/95 text-slate-800 hover:bg-slate-50 rounded-2xl shadow-xl border border-slate-200/80 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center group"
          title="Detectar GPS y seleccionar la ruta más cercana"
        >
          <Target
            className={`w-5 h-5 ${
              isLocating ? 'animate-spin text-emerald-600' : 'text-emerald-600 group-hover:scale-110'
            }`}
          />
        </button>
      </div>

      {/* 3. Horizontal Swipeable Floating Carousel with Integrated Category Filter Chips */}
      <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 z-20 p-2 sm:p-4 max-w-4xl mx-auto w-full pointer-events-auto pb-safe">
        {selectedRoute ? (
          <RouteDrawer />
        ) : (
          <div className="glass-panel rounded-3xl border border-white/90 shadow-2xl p-2.5 sm:p-3 space-y-2.5">
            {/* Category Filter Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {/* GPS Locate Nearest Route Button */}
              <button
                onClick={locateNearestRoute}
                disabled={isLocating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all border bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700 active:scale-95 flex-shrink-0"
                title="Detectar mi GPS y encontrar la ruta más cercana"
              >
                <Target className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Ubicando GPS...' : '📍 Ruta Más Cercana'}</span>
              </button>

              {/* Featured / Principales Pill */}
              <button
                onClick={() => setActiveCategory('featured')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${
                  activeCategory === 'featured' && !onlyNearby && !searchQuery
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white/90 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Frecuentes (4)</span>
              </button>

              {/* University Pill */}
              <button
                onClick={() => setActiveCategory('university')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                  activeCategory === 'university' && !onlyNearby && !searchQuery
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white/90 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>UNICA / Univ.</span>
              </button>

              {/* Commercial Pill */}
              <button
                onClick={() => setActiveCategory('commercial')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                  activeCategory === 'commercial' && !onlyNearby && !searchQuery
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white/90 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Malls / Comercio</span>
              </button>

              {/* Tourist Pill */}
              <button
                onClick={() => setActiveCategory('tourist')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                  activeCategory === 'tourist' && !onlyNearby && !searchQuery
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white/90 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Palmtree className="w-3.5 h-3.5" />
                <span>Huacachina / Turísticas</span>
              </button>

              {/* All Routes Pill */}
              <button
                onClick={() => setActiveCategory('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                  activeCategory === 'all' && !onlyNearby && !searchQuery
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-white/90 backdrop-blur-md text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ver Todas (10)</span>
              </button>
            </div>

            {/* Carousel Header Bar */}
            <div className="flex items-center justify-between px-1 border-t border-slate-100 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                  {getCategoryTitle()}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {filteredRoutes.length}
                </span>
              </div>

              {/* Desktop Scroll Controls */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="py-6 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-1.5" />
                <p className="text-xs">Cargando rutas de Ica...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{error}</span>
                </div>
                <button onClick={reload} className="font-bold underline text-red-800">
                  Reintentar
                </button>
              </div>
            )}

            {/* Horizontal Swipeable Snap Carousel */}
            {!loading && !error && (
              <div
                ref={carouselRef}
                className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 pt-0.5"
              >
                {filteredRoutes.length === 0 ? (
                  <div className="w-full text-center py-6 px-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-1.5 text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">No se encontraron rutas</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Intenta cambiar la categoría o término de búsqueda.
                    </p>
                  </div>
                ) : (
                  filteredRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="flex-none w-[88%] sm:w-[320px] snap-center"
                    >
                      <RouteCard route={route} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
