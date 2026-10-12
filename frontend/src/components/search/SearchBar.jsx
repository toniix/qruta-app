import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Target,
  MapPin,
  MapPinned,
  ArrowUpDown,
  Navigation,
  Layers,
  Star,
} from "lucide-react";
import { useRoutes } from "../../contexts/RouteContext";
import { usePlaces } from "../../hooks/usePlaces";

export function SearchBar({ onPickDestination = null }) {
  const navigate = useNavigate();
  const {
    routes,
    searchQuery,
    setSearchQuery,
    clearSelection,
    selectRoute,
    locateNearestRoute,
    onlyNearby,
    isLocating,
    loadingFiltered,
    userAddress,
  } = useRoutes();
  const { places } = usePlaces();
  const quickPlaces = places.slice(0, 2);

  const [isExpanded, setIsExpanded] = useState(false);
  const FALLBACK_ORIGIN = "Mi ubicación";
  const defaultOrigin = userAddress?.formattedAddress || FALLBACK_ORIGIN;
  const [origin, setOrigin] = useState(defaultOrigin);
  // GPS-backed origin default: sync until the user edits the field manually
  const originTouchedRef = useRef(false);
  useEffect(() => {
    if (!originTouchedRef.current) {
      setOrigin(defaultOrigin);
    }
  }, [defaultOrigin]);

  const handleSwap = (e) => {
    e.stopPropagation();
    const temp = origin;
    originTouchedRef.current = true;
    setOrigin(searchQuery || defaultOrigin);
    setSearchQuery(temp === defaultOrigin ? "" : temp);
  };

  /* Filter real routes matching the query */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !routes || routes.length === 0) return [];

    const term = searchQuery.toLowerCase().trim();
    return routes.filter((route) => {
      const matchName = route.name?.toLowerCase().includes(term);
      const matchCode = route.code?.toLowerCase().includes(term);
      const matchLine = route.transportLineName?.toLowerCase().includes(term);
      const matchStops = (route.keyStops || route.stops || []).some(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.address?.toLowerCase().includes(term),
      );

      return matchName || matchCode || matchLine || matchStops;
    });
  }, [routes, searchQuery]);

  const handleSelectOption = (route) => {
    // Select the route only: pre-selecting a stop would open the stop
    // drawer on the map instead of the route detail.
    selectRoute(route);
    setIsExpanded(false);
    navigate(`/mapa/ruta/${route.id}`);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchQuery("");
    clearSelection();
  };

  return (
    <div className="w-full space-y-2.5 pointer-events-auto">
      {/* ── Collapsed vs Expanded Search Card ───────────────────────────── */}
      {!isExpanded ? (
        /* Collapsed Pill — a real button that opens the search sheet */
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="relative w-full bg-white rounded-full shadow-card flex items-center px-4 py-3 border border-slate-100/90 cursor-pointer transition-all hover:border-blue-300 text-left"
        >
          <Search className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
          <span className="flex-1 text-slate-800 text-sm font-medium">
            {searchQuery || "¿A dónde quieres ir?"}
          </span>

          {searchQuery ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear(e);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClear(e);
                }
              }}
              className="p-1 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-2"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </span>
          ) : (
            <span className="text-xs font-bold text-brand-primary bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 ml-2">
              Buscar
            </span>
          )}

          {onPickDestination && (
            <>
              <span
                aria-hidden="true"
                className="w-px h-5 bg-slate-200 ml-2 shrink-0"
              />
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onPickDestination();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onPickDestination();
                  }
                }}
                className="ml-2 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-700 transition-colors shrink-0"
                title="Elegir destino en el mapa"
                aria-label="Elegir destino en el mapa"
              >
                <MapPinned className="w-4 h-4" />
              </span>
            </>
          )}
        </button>
      ) : (
        /* Expanded Dual Input Card (Origen + Destino + Swap) */
        <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-raised relative space-y-3 animate-slide-in-top">
          {/* Swap Button Floating on Right edge */}
          <button
            type="button"
            onClick={handleSwap}
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 shadow-2xs hover:bg-slate-200 transition-transform active:rotate-180 duration-300 z-10"
            title="Intercambiar origen y destino"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Origin Row */}
          <div className="flex items-center gap-3 pr-10">
            <Target className="w-4.5 h-4.5 text-brand-primary shrink-0" />
            <input
              type="text"
              value={origin}
              onChange={(e) => {
                originTouchedRef.current = true;
                setOrigin(e.target.value);
              }}
              placeholder="Punto de partida"
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Horizontal Divider */}
          <div className="border-t border-slate-100" />

          {/* Destination Row */}
          <div className="flex items-center gap-3 pr-10">
            <MapPin className="w-4.5 h-4.5 text-red-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="¿A dónde vas?"
              autoFocus
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Form Actions Row */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                if (searchResults.length > 0) {
                  handleSelectOption(searchResults[0]);
                } else if (searchQuery.trim()) {
                  navigate("/buscar", { state: { query: searchQuery } });
                } else {
                  setIsExpanded(false);
                }
              }}
              className="flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary-dark text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Ver en mapa</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Search Results Popup (when expanded & searching) ─────────────── */}
      {isExpanded && searchQuery.trim() !== "" && (
        <div className="bg-white/98 backdrop-blur-xl rounded-2xl p-3.5 border border-slate-100 shadow-raised space-y-2.5 max-h-[42vh] overflow-y-auto hide-scrollbar animate-slide-in-top">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-900">
              {searchResults.length === 1
                ? "1 ruta encontrada"
                : `${searchResults.length} rutas encontradas`}
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs space-y-3">
              <p>No se encontraron rutas con "{searchQuery}".</p>
              <button
                type="button"
                onClick={() =>
                  navigate("/buscar", { state: { query: searchQuery } })
                }
                className="text-xs font-bold text-brand-primary bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors"
              >
                Buscar en todas las ciudades
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((route) => (
                <div
                  key={route.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectOption(route)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectOption(route);
                    }
                  }}
                  aria-label={`Seleccionar ruta ${route.code}: ${route.name}`}
                  className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs space-y-1.5 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="px-2.5 py-1 text-white font-bold text-xs rounded-xl flex items-center justify-center shrink-0 uppercase tracking-wider"
                        style={{ backgroundColor: route.color || "#2563eb" }}
                      >
                        {route.code}
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {route.name}
                      </span>
                    </div>

                    {route.fare && (
                      <span className="text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        {route.fare}
                      </span>
                    )}
                  </div>

                  {route.transportLineName && (
                    <p className="text-xs text-slate-500 truncate">
                      {route.transportLineName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quick Action Filter Chips (when not expanded) ─────────────────── */}
      {!isExpanded && (
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 pt-0.5 text-xs">
          <button
            onClick={() => locateNearestRoute()}
            disabled={isLocating || loadingFiltered}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border shadow-sm transition-all active:scale-95 ${
              onlyNearby
                ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50 font-medium"
            }`}
          >
            <Navigation
              className={`w-3.5 h-3.5 ${
                isLocating || loadingFiltered
                  ? "animate-spin text-emerald-300"
                  : "text-emerald-500"
              }`}
            />
            <span>
              {isLocating || loadingFiltered ? "Buscando..." : "Cercanas"}
            </span>
          </button>

          <button
            onClick={() => {
              clearSelection();
              setSearchQuery("");
            }}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border shadow-sm transition-all active:scale-95 ${
              !onlyNearby && !searchQuery
                ? "bg-slate-900 text-white border-slate-900 font-bold"
                : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50 font-medium"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Ver Todas</span>
          </button>

          {quickPlaces.map((place) => (
            <button
              key={place.id}
              onClick={() => {
                setSearchQuery(place.name);
                setIsExpanded(true);
              }}
              className={`flex-shrink-0 max-w-44 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border shadow-sm transition-all active:scale-95 ${
                searchQuery === place.name
                  ? "bg-brand-primary text-white border-brand-primary font-bold"
                  : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50 font-medium"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">{place.name}</span>
            </button>
          ))}

          <button
            onClick={() => navigate("/lugares?tab=rutas")}
            className="flex-shrink-0 bg-white rounded-full shadow-sm px-3.5 py-1.5 flex items-center gap-1.5 border border-slate-100 text-slate-700 font-medium hover:bg-slate-50 transition-all active:scale-95"
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Favoritos</span>
          </button>
        </div>
      )}
    </div>
  );
}
