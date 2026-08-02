import { useState } from "react";
import {
  X,
  Bus,
  Navigation,
  MapPin,
} from "lucide-react";
import { useRoutes } from "../../contexts/RouteContext";

export function RouteDrawer() {
  const { selectedRoute, selectedStop, selectStop, clearSelection } =
    useRoutes();

  const [isMinimized, setIsMinimized] = useState(true);

  if (!selectedRoute) return null;

  const handleStopSelect = (stop) => {
    selectStop(stop);
    setIsMinimized(true);
  };

  return (
    <div className="w-full glass-panel rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 max-h-[50vh] sm:max-h-[420px] animate-in slide-in-from-bottom duration-300">
      <div
        onClick={() => setIsMinimized((prev) => !prev)}
        className="p-3 sm:p-3.5 text-white relative flex items-center justify-between shadow-xs cursor-pointer select-none transition-colors"
        style={{ backgroundColor: selectedRoute.color || "#2563eb" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
            <Bus className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                {selectedRoute.code}
              </span>
              <span className="text-xs text-white/80 font-medium truncate">
                {selectedRoute.transportLineName}
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold leading-tight line-clamp-1">
              {selectedRoute.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Cerrar detalle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selectedStop && (
        <div className="bg-amber-500 text-white px-3.5 py-2 text-xs flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <span className="truncate">
              Enfocado: <strong>{selectedStop.name}</strong>
            </span>
          </div>
          {isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="text-[11px] font-bold underline bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors whitespace-nowrap ml-2"
            >
              Ver puntos clave
            </button>
          )}
        </div>
      )}

      {!isMinimized && (
        <>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/60 p-2.5 text-center text-xs">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">
                Tarifa
              </div>
              <div className="font-bold text-slate-800 mt-0.5">
                {selectedRoute.fare || '-'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">
                Horario
              </div>
              <div className="font-bold text-slate-800 mt-0.5 line-clamp-1">
                {selectedRoute.schedule || '-'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">
                Frecuencia
              </div>
              <div className="font-bold text-blue-600 mt-0.5 line-clamp-1">
                {selectedRoute.frequency || '-'}
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-blue-50/50 border-b border-blue-100/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="text-slate-700 font-medium">
                Recorrido total:{" "}
                <strong className="text-slate-900">
                  {selectedRoute.origin && selectedRoute.destination
                    ? `${selectedRoute.origin} → ${selectedRoute.destination}`
                    : 'Ver direcciones'}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Puntos Clave ({selectedRoute.stops?.length || 0})</span>
              <span className="text-[11px] text-blue-600 normal-case font-normal">
                Toca para volar en mapa
              </span>
            </h4>

            <div className="relative pl-6 space-y-2.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {selectedRoute.stops?.map((stop, index) => {
                const isStopSelected = selectedStop?.id === stop.id;
                return (
                  <div
                    key={stop.id}
                    onClick={() => handleStopSelect(stop)}
                    className={`relative cursor-pointer group p-2 rounded-xl transition-all border ${
                      isStopSelected
                        ? "bg-amber-50 border-amber-400 shadow-2xs font-semibold text-slate-900"
                        : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`absolute -left-6 top-3 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-transform ${
                        isStopSelected
                          ? "bg-amber-500 text-white border-white scale-110 shadow-sm"
                          : "bg-white text-slate-600 border-slate-300 group-hover:border-blue-500"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <h5 className="font-semibold text-xs text-slate-900 leading-snug">
                          {stop.name}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {stop.address || stop.reference}
                        </p>
                      </div>
                      {stop.isAccessible && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                          ♿
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
