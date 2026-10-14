import { X, MapPin, Loader2, Move, Flag } from "lucide-react";
import { RouteCard } from "../routes/RouteCard";
import {
  DESTINATION_RADIUS_PRESETS_M,
  formatDistanceBand,
} from "../../utils/distanceBands";

/**
 * Results sheet for a picked destination point.
 * Renders routes passing near BOTH the user's origin and the destination
 * (nearest to the whole trip first) with RouteCard + city badge and a
 * walking-distance hint per endpoint. Without GPS the search falls back to
 * destination-only results (legacy `{ route, nearest }` items) with an
 * inline hint. Empty state offers radius widen presets (re-runs both
 * endpoints, no re-picking) and "move the pin".
 */
export function DestinationResults({
  label = "",
  radiusMeters,
  loading = false,
  error = null,
  ranked = [],
  originApplied = true,
  onSelectRoute,
  onRadiusChange,
  onMovePin,
  onClose,
  onRetry,
}) {
  const isEmpty = !loading && !error && ranked.length === 0;

  // Dual-endpoint items carry `{ route, origin, destination }`; the no-GPS
  // fallback keeps the legacy `{ route, nearest }` shape.
  const getHints = (item) => ({
    origin: item?.origin ?? null,
    destination: item?.destination ?? item?.nearest ?? null,
  });

  return (
    <div className="pointer-events-auto mb-16 lg:mb-4 animate-slide-in-top">
      <div className="bg-white/98 backdrop-blur-xl rounded-2xl p-4 border border-slate-100 shadow-raised space-y-3 max-h-[52vh] overflow-y-auto hide-scrollbar">
        {/* Header: destination label + close */}
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Flag className="w-3.5 h-3.5 text-red-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Rutas cerca de
            </p>
            <p className="text-sm font-bold text-slate-900 truncate">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
            title="Cerrar resultados"
            aria-label="Cerrar resultados"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* No-GPS fallback notice: results only filtered by destination */}
        {!originApplied && !loading && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            Activa tu ubicación para filtrar también por tu origen
          </p>
        )}

        {/* Radius presets: re-run around the same point */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          <span className="text-xs font-bold text-slate-500 shrink-0">
            Radio:
          </span>
          {DESTINATION_RADIUS_PRESETS_M.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onRadiusChange?.(preset)}
              disabled={loading}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs border transition-all active:scale-95 disabled:opacity-50 ${
                radiusMeters === preset
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
              }`}
            >
              {preset >= 1000 ? `${preset / 1000} km` : `${preset} m`}
            </button>
          ))}
          <button
            type="button"
            onClick={onMovePin}
            className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-1"
          >
            <Move className="w-3 h-3" />
            Mover el pin
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs space-y-2">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-primary" />
            <p>Buscando rutas cerca del punto…</p>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-slate-500 text-xs space-y-3">
            <p>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-bold text-brand-primary bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200/60 hover:bg-blue-100 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : isEmpty ? (
          <div className="py-6 text-center text-slate-500 text-xs space-y-3">
            <MapPin className="w-6 h-6 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">
              {originApplied
                ? "Ninguna ruta pasa cerca de tu origen y del destino a la vez"
                : "No pasan rutas cerca de este punto"}
            </p>
            <p>Prueba con un radio más amplio o mueve el pin.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {DESTINATION_RADIUS_PRESETS_M.filter(
                (preset) => preset > radiusMeters,
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onRadiusChange?.(preset)}
                  className="text-xs font-bold text-white bg-brand-primary px-4 py-2.5 rounded-xl hover:bg-brand-primary-dark transition-colors"
                >
                  Buscar en {preset >= 1000 ? `${preset / 1000} km` : `${preset} m`}
                </button>
              ))}
              <button
                type="button"
                onClick={onMovePin}
                className="text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1"
              >
                <Move className="w-3 h-3" />
                Mover el pin
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-900 px-1">
              {ranked.length === 1
                ? "1 ruta encontrada"
                : `${ranked.length} rutas encontradas`}
            </p>
            {ranked.map((item, index) => {
              const { route } = item;
              const { origin, destination } = getHints(item);
              return (
                <div key={route.id} className="space-y-1">
                  <div className="px-1 space-y-0.5">
                    {origin && (
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <span>
                          🚶 {formatDistanceBand(origin?.distanceMeters)} de tu
                          origen
                        </span>
                        {origin?.stop?.name && (
                          <span className="truncate">
                            · cerca de {origin.stop.name}
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <span>
                        🚶 {formatDistanceBand(destination?.distanceMeters)}
                      </span>
                      {destination?.stop?.name && (
                        <span className="truncate">
                          · cerca de {destination.stop.name}
                        </span>
                      )}
                    </p>
                  </div>
                  <RouteCard
                    route={route}
                    showCity
                    isNearest={index === 0}
                    distanceKm={
                      destination?.distanceMeters != null
                        ? destination.distanceMeters / 1000
                        : null
                    }
                    onSelect={onSelectRoute}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
