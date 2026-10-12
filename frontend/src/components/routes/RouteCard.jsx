import { useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Wifi,
  Bus,
  Clock3,
  Banknote,
  Heart,
} from "lucide-react";
import { useRoutes } from "../../contexts/RouteContext";
import { useFavorites } from "../../hooks/useFavorites";

export function RouteCard({ route, isNearest, distanceKm, onSelect }) {
  const navigate = useNavigate();
  const { selectedRoute, selectRoute } = useRoutes();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isSelected = selectedRoute?.id === route.id;

  const keyStops = route.keyStops || [];
  const stops = keyStops.length > 0 ? keyStops : route.stops || [];
  const origin = route.origin || stops[0]?.name || "Origen";
  const destination =
    route.destination || stops[stops.length - 1]?.name || "Destino";

  const handleRouteClick = () => {
    if (onSelect) {
      onSelect(route);
      return;
    }
    selectRoute(route);
    if (route?.id) {
      navigate(`/mapa/ruta/${route.id}`);
    }
  };

  const handleViewMore = (e) => {
    e.stopPropagation();
    handleRouteClick();
  };

  // Extract display code (e.g. R101, T20)
  const code = route.code || "Ruta";
  const color = route.color || "var(--color-brand-primary)";
  const name = (route.name || "").replace(/^Ruta \w+:\s*/i, "");
  const transportLine =
    route.transportLineName ||
    route.transportLine?.name ||
    "Línea de transporte";
  const fare = route.fare || "—";
  const frequency = route.frequency || "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRouteClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRouteClick();
        }
      }}
      aria-label={`Ver recorrido de la ruta ${code}: ${name}`}
      className={`bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md scale-[1.01]"
          : "border-slate-100 shadow-card hover:border-blue-200 hover:shadow-md"
      }`}
    >
      {/* ── Header: Colored strip + code + name + transport line ─────────── */}
      <div className="flex items-center gap-3">
        {/* Code Pill */}
        <div
          className="w-16 h-11 text-white font-bold text-sm rounded-2xl flex justify-center items-center shrink-0 shadow-2xs uppercase tracking-wider"
          style={{ backgroundColor: color }}
        >
          {code}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
            {name}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
            {transportLine}
          </p>
        </div>

        {/* Nearest / distance badge */}
        {isNearest && distanceKm != null && (
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70 shrink-0">
            <Wifi className="w-3 h-3" />
            <span>{Math.round(distanceKm * 1000)}m</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(route);
          }}
          className={`relative p-2 rounded-xl transition-all shrink-0 active:scale-90 after:absolute after:-inset-1.5 after:content-[''] ${
            isFavorite(route.id)
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
          title={isFavorite(route.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
          aria-label={isFavorite(route.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
        >
          <Heart
            className="w-4 h-4"
            fill={isFavorite(route.id) ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* ── Route visualization: Origin ── route ── Destination ─────────── */}
      {(origin || destination) && (
        <div className="mt-3.5 bg-slate-50/90 rounded-2xl border border-slate-100/90 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            {/* Origin */}
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate min-w-0 flex-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{origin}</span>
            </div>

            {/* Dashed connector */}
            <div
              className="hidden sm:block w-8 h-0.5 shrink-0 rounded-full opacity-50"
              style={{ backgroundColor: color }}
            />
            <Bus className="hidden sm:block w-3.5 h-3.5 text-slate-300 shrink-0" />

            {/* Destination */}
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate min-w-0 flex-1 justify-end">
              <span className="truncate text-right">{destination}</span>
              <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 shrink-0 bg-white" />
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Grid: Frecuencia · Tarifa ──────────────────────────── */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-orange-50/70 border border-orange-100/60 p-2.5 flex items-center gap-2.5 min-w-0">
          <Clock3 className="w-4 h-4 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
              Frecuencia
            </p>
            <p className="text-xs font-bold text-slate-800 leading-tight truncate">
              {frequency}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100/60 p-2.5 flex items-center gap-2.5 min-w-0">
          <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
              Tarifa
            </p>
            <p className="text-xs font-bold text-slate-800 leading-tight truncate">
              {fare}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer Action Button ─────────────────────────────────────────── */}
      <div className="pt-3 mt-3 border-t border-slate-100">
        {/* Ver recorrido button */}
        <button
          type="button"
          onClick={handleViewMore}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-dark transition-colors shadow-2xs active:scale-[0.99]"
        >
          <span className="truncate">Ver recorrido</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}
