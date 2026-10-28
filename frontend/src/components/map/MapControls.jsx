import { Plus, Minus, Target, Loader2 } from "lucide-react";

export function MapControls({
  onZoomIn,
  onZoomOut,
  onRecenterGPS,
  isLocating = false,
  gpsReady = false,
}) {
  return (
    <div className="absolute -top-36 right-4 sm:right-2 z-40 pointer-events-auto flex flex-col items-center gap-2">
      {/* Zoom In & Zoom Out Compact Button Group */}
      <div className="flex flex-col bg-white rounded-2xl shadow-raised border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
        <button
          onClick={onZoomIn}
          className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-90"
          title="Acercar mapa"
          aria-label="Acercar mapa"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={onZoomOut}
          className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-90"
          title="Alejar mapa"
          aria-label="Alejar mapa"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* GPS Recenter / Activate Button */}
      <button
        onClick={onRecenterGPS}
        disabled={isLocating}
        className={`relative w-12 h-12 rounded-full shadow-raised flex items-center justify-center transition-all active:scale-90 ${
          gpsReady
            ? "bg-brand-navy text-brand-lime border-2 border-brand-lime shadow-[0_0_12px_rgba(183,243,74,0.35)]"
            : isLocating
            ? "bg-brand-navy text-brand-lime border border-brand-lime/50 animate-pulse"
            : "bg-brand-navy/90 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-brand-navy"
        }`}
        title={
          gpsReady
            ? "Centrar en mi ubicación GPS"
            : isLocating
            ? "Obteniendo ubicación GPS..."
            : "Activar mi ubicación GPS"
        }
        aria-label={
          gpsReady
            ? "Centrar en mi ubicación GPS"
            : isLocating
            ? "Obteniendo ubicación GPS..."
            : "Activar mi ubicación GPS"
        }
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 animate-spin text-brand-lime" />
        ) : (
          <Target
            className={`w-5 h-5 transition-transform ${
              gpsReady
                ? "text-brand-lime scale-105"
                : "text-slate-400 hover:scale-110"
            }`}
          />
        )}
      </button>
    </div>
  );
}

