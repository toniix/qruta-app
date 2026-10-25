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
        className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 animate-slide-in-bottom cursor-pointer hover:border-blue-200 transition-all group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        {/* Stop header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-base leading-tight pr-2 group-hover:text-brand-primary transition-colors truncate">
              {stop.name}
            </h3>
            {(stop.reference || stop.address) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Ref: {stop.reference || stop.address}
              </p>
            )}
          </div>

          {distanceKm != null && (
            <div className="flex items-center gap-1.5 text-brand-primary text-sm font-bold shrink-0 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/50">
              <span>{formatDistance(distanceKm)}</span>
              <ChevronRight className="w-4 h-4 text-blue-500" />
            </div>
          )}
        </div>

        {/* Route count + CTA — opens StopRoutesModal with the full list */}
        {routeCount > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-brand-primary-dark bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 shrink-0">
              {routeCount} {routeCount === 1 ? "ruta" : "rutas"}
            </span>
            <span className="text-xs font-bold text-brand-primary group-hover:text-brand-primary-dark transition-colors flex items-center gap-1 min-w-0 truncate">
              Ver rutas del paradero
              <ChevronRight className="w-4 h-4 shrink-0" />
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 text-xs font-bold text-brand-primary group-hover:text-brand-primary-dark transition-colors">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 shrink-0" />
              Ver paradero en el mapa
            </span>
            <ChevronRight className="w-4 h-4 shrink-0" />
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
