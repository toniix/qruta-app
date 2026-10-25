import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Navigation } from "lucide-react";
import { useRoutes } from "../../contexts/RouteContext";
import { formatDistance } from "../../utils/geoUtils";
import { StopRoutesModal } from "./StopRoutesModal";

/** A single nearby stop card — compact summary; the full route list lives in StopRoutesModal */
export function NearbyStopCard({ stop, routes, distanceKm }) {
  const navigate = useNavigate();
  const { selectStop, clearSelectedRoute } = useRoutes();
  const [activeModalStop, setActiveModalStop] = useState(null);

  // Count routes that pass through this stop (full list is fetched by the modal)
  const routeCount = routes.filter((r) =>
    r.stops?.some((s) => s.id === stop.id),
  ).length;

  // Stops without routes go straight to the map; stops with routes open the modal
  const handleCardClick = () => {
    if (routeCount > 0) {
      setActiveModalStop(stop);
    } else {
      clearSelectedRoute();
      selectStop(stop);
      navigate("/mapa", { state: { from: "/" } });
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Paradero ${stop.name}${routeCount > 0 ? `, ${routeCount} ${routeCount === 1 ? "ruta" : "rutas"}` : ", ver en el mapa"}`}
        className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-slate-200/90 animate-slide-in-bottom cursor-pointer hover:border-slate-300 hover:shadow-raised transition-all group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime"
      >
        {/* Stop header */}
        <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-slate-900 text-base leading-tight pr-2 group-hover:text-brand-secondary transition-colors truncate">
              {stop.name}
            </h3>
            {(stop.reference || stop.address) && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                Ref: {stop.reference || stop.address}
              </p>
            )}
          </div>

          {distanceKm != null && (
            <div className="flex items-center gap-1.5 text-brand-secondary text-xs font-black shrink-0 bg-brand-lime-soft px-2.5 py-1 rounded-full border border-brand-lime/40 shadow-2xs">
              <span>{formatDistance(distanceKm)}</span>
              <ChevronRight className="w-3.5 h-3.5 text-brand-secondary" />
            </div>
          )}
        </div>

        {/* Route count + CTA — opens StopRoutesModal with the full list */}
        {routeCount > 0 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 shrink-0">
              {routeCount} {routeCount === 1 ? "ruta" : "rutas"}
            </span>
            <span className="text-xs font-extrabold text-slate-900 group-hover:text-brand-secondary transition-colors flex items-center gap-1 min-w-0 truncate">
              Ver rutas
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 text-xs font-extrabold text-slate-900 group-hover:text-brand-secondary transition-colors pt-1">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 shrink-0 text-brand-secondary" />
              Ver en el mapa
            </span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </div>
        )}
      </div>

      {/* Render StopRoutesModal when stop is clicked */}
      {activeModalStop && (
        <StopRoutesModal
          key={activeModalStop.id}
          stop={activeModalStop}
          onClose={() => setActiveModalStop(null)}
        />
      )}
    </>
  );
}
