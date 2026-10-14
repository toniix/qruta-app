import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Route as RouteIcon,
  Loader2,
  Bus,
  ArrowLeftRight,
  ArrowRight,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { stopService } from "../../services/stopService";
import { useRoutes } from "../../contexts/RouteContext";
import { calculateDistanceKm } from "../../utils/geoUtils";
import { formatDistanceBand } from "../../utils/distanceBands";

export function StopDetailDrawer({ stop, onClose }) {
  const navigate = useNavigate();
  const { routes: allContextRoutes, selectRoute, selectStop, userLocation } =
    useRoutes();

  const [stopRoutes, setStopRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!stop?.id) return;
    let isMounted = true;

    async function fetchRoutes() {
      setLoading(true);
      setError(null);
      try {
        const data = await stopService.getStopRoutes(stop.id);
        if (isMounted) {
          setStopRoutes(data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error al obtener rutas del paradero:", err);
          setError("No se pudieron cargar las rutas de este paradero.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRoutes();
    return () => {
      isMounted = false;
    };
  }, [stop?.id, reloadKey]);

  if (!stop) return null;

  // Straight-line walking estimate to this stop (same Haversine + bands as
  // the rest of the app). Shown only when the GPS location is known.
  let distanceHint = "";
  if (
    userLocation?.lat != null &&
    userLocation?.lng != null &&
    stop.latitude != null &&
    stop.longitude != null
  ) {
    const meters =
      calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        stop.latitude,
        stop.longitude,
      ) * 1000;
    const band = formatDistanceBand(meters);
    if (band) distanceHint = `${band} de tu ubicación`;
  }

  const handleSelectRouteItem = (item) => {
    const matched = allContextRoutes.find(
      (r) => r.id === item.id || r.code === item.code,
    );
    if (matched) {
      selectRoute(matched);
    } else if (item.route) {
      selectRoute(item.route);
    } else {
      selectRoute({
        id: item.id,
        code: item.code,
        name: item.name,
        color: item.color,
      });
    }
    const targetId = matched?.id || item.route?.id || item.id;
    selectStop(null);
    navigate(`/mapa/ruta/${targetId}`);
  };

  return (
    <div className="pointer-events-auto p-4 sm:p-5 space-y-3 bg-white/98 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl shadow-overlay border border-slate-100/90 animate-slide-in-bottom mb-16 lg:mb-4 transition-all duration-300">
      {/* Drag / Touch Handle Indicator */}
      <div
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="w-10 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-1 shrink-0 cursor-pointer hover:bg-slate-300 transition-colors"
        title={isCollapsed ? "Expandir" : "Contraer"}
      />

      {/* Header: Stop Info + Expand/Collapse & Close Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <MapPin className="w-5 h-5 text-amber-600" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                Paradero
              </span>
              {stop.accessible && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  ♿ Accesible
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 mt-1 truncate">
              {stop.name}
            </h3>

            {(stop.reference || stop.address) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {stop.reference || stop.address}
              </p>
            )}
            {distanceHint && (
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                🚶 {distanceHint}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
            title={isCollapsed ? "Ver rutas de este paradero" : "Ocultar rutas"}
            aria-label={isCollapsed ? "Ver rutas de este paradero" : "Ocultar rutas"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
            title="Cerrar paradero"
            aria-label="Cerrar paradero"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsed CTA button to expand routes */}
      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between bg-blue-50/80 hover:bg-blue-100 text-brand-primary-dark px-3.5 py-2.5 rounded-xl border border-blue-200/60 font-bold text-xs transition-colors cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-brand-primary shrink-0" />
            <span>Ver rutas de este paradero</span>
          </div>
        </button>
      )}

      {/* Collapsible Routes Section */}
      {!isCollapsed && (
        <div className="space-y-2.5 pt-2 border-t border-slate-100 animate-fade-in">
          {/* Subheader: Route Counter */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <RouteIcon className="w-3.5 h-3.5 text-brand-primary" />
              <span>Rutas que transitan por aquí</span>
            </div>

            {!loading && !error && (
              <span className="text-xs font-bold text-brand-primary-dark bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                {stopRoutes.length} {stopRoutes.length === 1 ? "ruta" : "rutas"}
              </span>
            )}
          </div>

          {/* Routes list with vertical scroll */}
          <div className="max-h-52 sm:max-h-60 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
            {loading ? (
              <div className="py-6 text-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary mx-auto mb-1.5" />
                <p className="text-xs text-slate-500 font-medium">
                  Cargando rutas de este paradero...
                </p>
              </div>
            ) : error ? (
              <div
                role="alert"
                className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 font-medium space-y-2.5"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors min-h-11"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
              </div>
            ) : stopRoutes.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-500 text-xs font-medium border border-slate-100">
                No hay rutas comerciales registradas que transiten por este
                paradero actualmente.
              </div>
            ) : (
              stopRoutes.map((item) => {
                const isBoth = item.directionLabel === "IDA Y VUELTA";

                return (
                  <button
                    type="button"
                    key={item.code || item.id}
                    onClick={() => handleSelectRouteItem(item)}
                    className="w-full text-left bg-slate-50/80 hover:bg-white rounded-xl p-3 border border-slate-100 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-12 h-8 text-white font-bold text-xs rounded-lg flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
                        style={{
                          backgroundColor:
                            item.color || "var(--color-brand-primary)",
                        }}
                      >
                        {item.code || <Bus className="w-3.5 h-3.5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-tight group-hover:text-brand-primary transition-colors">
                          {item.name?.replace(/^Ruta \w+:\s*/i, "")}
                        </h4>

                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          {isBoth ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                              <ArrowLeftRight className="w-2.5 h-2.5" /> Ida y
                              Vuelta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary-dark bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                              <ArrowRight className="w-2.5 h-2.5" />{" "}
                              {item.directionLabel || "IDA"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
                        {item.fare || "—"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-primary transition-colors" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
