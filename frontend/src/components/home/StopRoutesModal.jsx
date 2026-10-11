import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X,
  Bus,
  Loader2,
  MapPin,
  ChevronRight,
  Navigation,
  Route,
  ArrowLeftRight,
  ArrowRight,
} from "lucide-react";
import { stopService } from "../../services/stopService";
import { useRoutes } from "../../contexts/RouteContext";

export function StopRoutesModal({ stop, onClose }) {
  const navigate = useNavigate();
  const {
    routes: allContextRoutes,
    selectRoute,
    selectStop,
    clearSelectedRoute,
  } = useRoutes();

  const [stopRoutes, setStopRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stop || !stop.id) return;
    let isMounted = true;

    async function fetchRoutes() {
      try {
        const data = await stopService.getStopRoutes(stop.id);
        if (isMounted) {
          setStopRoutes(data);
        }
      } catch {
        if (isMounted) {
          setError("No se pudieron obtener las rutas para este paradero.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRoutes();
    return () => {
      isMounted = false;
    };
  }, [stop]);

  // Grouping by route and direction label are already computed by the backend
  const groupedRoutes = stopRoutes || [];

  if (!stop) return null;

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
    onClose();
    navigate(`/mapa/ruta/${targetId}`);
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Rutas del paradero ${stop?.name || ""}`}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-900/35 backdrop-blur-[2px] p-0 sm:p-4 animate-fade-in overflow-hidden"
    >
      {/* Modal backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container */}
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-overlay space-y-4 animate-slide-in-bottom max-h-[75vh] sm:max-h-[80vh] flex flex-col z-10 overflow-hidden">
        {/* Top Handle bar for mobile */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden -mt-1 mb-1 shrink-0" />

        {/* Header: Stop Name & Close */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <MapPin className="w-5.5 h-5.5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold tracking-wider uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/50">
                Paradero
              </span>
              <h3 className="font-bold text-slate-900 text-lg leading-tight truncate mt-1">
                {stop.name}
              </h3>
              {(stop.reference || stop.address) && (
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  Ref: {stop.reference || stop.address}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader: Route Count */}
        <div className="flex items-center justify-between shrink-0">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Route className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Rutas que transitan por aquí</span>
          </h4>
          {!loading && !error && (
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 shrink-0">
              {groupedRoutes.length}{" "}
              {groupedRoutes.length === 1 ? "ruta" : "rutas"}
            </span>
          )}
        </div>

        {/* Content list with min-h-0 and smooth visible vertical scrolling */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5 scroll-smooth">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">
                Cargando rutas de este paradero...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center text-xs font-medium text-red-700">
              {error}
            </div>
          ) : groupedRoutes.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-500 text-xs font-medium border border-slate-100">
              No hay rutas registradas que transiten por este paradero.
            </div>
          ) : (
            groupedRoutes.map((item) => {
              const isBoth = item.directionLabel === "IDA Y VUELTA";

              return (
                <button
                  type="button"
                  key={item.code || item.id}
                  onClick={() => handleSelectRouteItem(item)}
                  className="w-full text-left bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-2xs space-y-2 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Code Badge */}
                      <div
                        className="w-13 h-9 text-white font-bold text-xs rounded-xl flex justify-center items-center shrink-0 uppercase tracking-wider shadow-2xs"
                        style={{ backgroundColor: item.color || "var(--color-brand-primary)" }}
                      >
                        {item.code || <Bus className="w-4 h-4" />}
                      </div>

                      {/* Name & Direction Tag */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate leading-tight group-hover:text-blue-600 transition-colors">
                          {item.name.replace(/^Ruta \w+:\s*/i, "")}
                        </h4>

                        <div className="mt-1 flex items-center gap-2">
                          {isBoth ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                              <ArrowLeftRight className="w-3 h-3 text-emerald-600" />
                              <span>Ida y Vuelta</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full">
                              <ArrowRight className="w-3 h-3 text-blue-600" />
                              <span>{item.directionLabel || "IDA"}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fare & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                        {item.fare || "S/ 2.00"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-2 shrink-0 border-t border-slate-100">
          <button
            onClick={() => {
              clearSelectedRoute();
              selectStop(stop);
              onClose();
              navigate("/mapa");
            }}
            className="w-full bg-blue-600 text-white font-bold text-xs py-3.5 rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            <span>Ver paradero en el mapa</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
