import { ArrowLeft, MapPin } from "lucide-react";
import { SearchBar } from "../search/SearchBar";

export function MapTopHeader({
  selectedRoute = null,
  selectedStop = null,
  isRouteLoading = false,
  onCloseDetail,
  onClearStop,
  onBack = null,
  onPickDestination = null,
  destinationActive = false,
  onCloseDestination = null,
}) {
  // Render when searching for a destination
  if (destinationActive) {
    return (
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 pointer-events-none max-w-lg mx-auto w-full">
        <div className="pointer-events-auto flex items-center justify-between gap-2.5 animate-slide-in-top">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
              title="Volver"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="bg-slate-900/90 text-white backdrop-blur-md rounded-full px-4 py-2 shadow-overlay border border-slate-700/80 flex items-center gap-2 text-xs sm:text-sm font-bold truncate flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate">Elige tu destino en el mapa</span>
          </div>

          <button
            onClick={onCloseDestination}
            className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
            title="Cerrar destino"
            aria-label="Cerrar destino"
          >
            <span className="text-sm font-bold">✕</span>
          </button>
        </div>
      </div>
    );
  }
  if (selectedRoute) {
    const hasBack = Boolean(selectedStop || onBack);
    const handleBack = selectedStop ? onClearStop : onBack;
    const backLabel = selectedStop ? "Volver al detalle de ruta" : "Volver";

    return (
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 pointer-events-none max-w-lg mx-auto w-full">
        <div className="space-y-2 animate-slide-in-top">
          <div className="pointer-events-auto flex items-center justify-between gap-2.5">
            {/* Back button (clears stop if focused, or navigates back if external origin) */}
            {hasBack && (
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
                title={backLabel}
                aria-label={backLabel}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Selected Route Title Pill / Tracing Badge */}
            <div className="bg-white rounded-full px-4 py-2 shadow-raised border border-slate-100 flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 truncate flex-1 min-w-0 transition-all duration-200">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isRouteLoading ? "animate-ping" : ""
                }`}
                style={{
                  backgroundColor:
                    selectedRoute.color || "var(--color-brand-primary)",
                }}
              />
              {isRouteLoading ? (
                <span className="truncate text-brand-primary font-semibold flex items-center gap-1.5 animate-pulse">
                  <span>Trazando trayecto</span>
                  {selectedRoute.code && (
                    <span className="font-bold text-slate-800">
                      ({selectedRoute.code})
                    </span>
                  )}
                  <span>...</span>
                </span>
              ) : (
                <span className="truncate">
                  {selectedRoute.code ? `${selectedRoute.code} - ` : ""}
                  {selectedRoute.name?.replace(/^Ruta \w+:\s*/i, "") || "Ruta"}
                </span>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onCloseDetail}
              className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
              title="Cerrar vista de detalle"
              aria-label="Cerrar vista de detalle"
            >
              <span className="text-sm font-bold">✕</span>
            </button>
          </div>

          {/* Focused Stop Pill beneath header */}
          {selectedStop && (
            <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-overlay border border-slate-700/80 text-xs animate-slide-in-top mx-auto max-w-fit">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ring-2 ring-amber-400/30 animate-pulse" />
              <span className="font-semibold text-amber-300">
                Punto frecuente enfocado
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedStop) {
    return (
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 pointer-events-none max-w-lg mx-auto w-full">
        <div className="pointer-events-auto flex items-center justify-between gap-2.5 animate-slide-in-top">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
              title="Volver"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="bg-white rounded-full px-4 py-2 shadow-raised border border-slate-100 flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 truncate flex-1 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ring-2 ring-amber-300" />
            <span className="truncate">{selectedStop.name}</span>
          </div>

          <button
            onClick={onClearStop}
            className="w-10 h-10 rounded-full bg-white shadow-raised border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-transform active:scale-90 shrink-0"
            title="Cerrar paradero"
            aria-label="Cerrar paradero"
          >
            <span className="text-sm font-bold">✕</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 pointer-events-none max-w-lg mx-auto w-full">
      <SearchBar onPickDestination={onPickDestination} />
    </div>
  );
}
