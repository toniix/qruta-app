import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wifi,
  Bus,
  Clock3,
  Banknote,
} from "lucide-react";
import { useRoutes } from "../../contexts/RouteContext";

export function RouteCard({ route, isNearest, distanceKm }) {
  const navigate = useNavigate();
  const { selectedRoute, selectedStop, selectRoute, selectStop } = useRoutes();
  const [isStopsExpanded, setIsStopsExpanded] = useState(false);

  const isSelected = selectedRoute?.id === route.id;

  const keyStops = route.keyStops || [];
  const stops = keyStops.length > 0 ? keyStops : route.stops || [];
  const origin = route.origin || stops[0]?.name || "Origen";
  const destination =
    route.destination || stops[stops.length - 1]?.name || "Destino";

  const handleRouteClick = () => {
    selectRoute(route);
    if (route?.id) {
      navigate(`/mapa/ruta/${route.id}`);
    }
  };

  const handleToggleStopsDropdown = (e) => {
    e.stopPropagation();
    setIsStopsExpanded((prev) => !prev);
  };

  const handleStopClick = (e, stop) => {
    e.stopPropagation();
    selectRoute(route);
    selectStop(stop);
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
  const fare = route.fare || "S/ 2.00";
  const frequency = route.frequency || "Cada 8 min";

  return (
    <div
      onClick={handleRouteClick}
      className={`bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer ${
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

      {/* ── Footer Action Buttons ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
        {/* Puntos frecuentes button */}
        <button
          type="button"
          onClick={handleToggleStopsDropdown}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            isStopsExpanded
              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
              : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border-slate-200/60"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate">Puntos frecuentes</span>
          {isStopsExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>

        {/* Ver recorrido button */}
        <button
          type="button"
          onClick={handleViewMore}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs active:scale-95 shrink-0"
        >
          <span className="truncate">Ver recorrido</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

      {/* ── Key stops dropdown ──────────────────────────────────────────── */}
      {isStopsExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-slide-in-top"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-0.5">
            <span>Puntos frecuentes del trayecto</span>
            <span className="text-blue-600 font-semibold normal-case">
              Toca para enfocar
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1 hide-scrollbar">
            {stops.map((stop, idx) => {
              const isStopActive = selectedStop?.id === stop.id;
              return (
                <div
                  key={`${stop.id}-${idx}`}
                  onClick={(e) => handleStopClick(e, stop)}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border ${
                    isStopActive
                      ? "bg-amber-50 border-amber-400 font-semibold text-slate-900 shadow-2xs"
                      : "bg-slate-50/80 border-slate-100 hover:bg-blue-50/80 hover:border-blue-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span
                      className="w-4 h-4 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {idx + 1}
                    </span>
                    <div className="truncate min-w-0">
                      <p className="font-bold text-xs leading-snug truncate">
                        {stop.name}
                      </p>
                      {(stop.address || stop.reference) && (
                        <p className="text-xs text-slate-500 truncate">
                          {stop.address || stop.reference}
                        </p>
                      )}
                    </div>
                  </div>
                  {stop.isAccessible === true && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 font-medium">
                      ♿
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
