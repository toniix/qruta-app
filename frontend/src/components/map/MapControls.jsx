import { Plus, Minus, Target } from "lucide-react";

export function MapControls({
  onZoomIn,
  onZoomOut,
  onRecenterGPS,
  isLocating = false,
}) {
  return (
    <div className="absolute -top-36 right-4 sm:right-2 z-40 pointer-events-auto flex flex-col items-center gap-2">
      {/* Zoom In & Zoom Out Compact Button Group */}
      <div className="flex flex-col bg-white rounded-2xl shadow-overlay border border-slate-100 overflow-hidden divide-y divide-slate-100">
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

      {/* GPS Recenter Button */}
      <button
        onClick={onRecenterGPS}
        disabled={isLocating}
        className="w-12 h-12 rounded-full bg-white text-slate-800 shadow-overlay border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90"
        title="Centrar en mi ubicación GPS"
        aria-label="Centrar en mi ubicación GPS"
      >
        <Target
          className={`w-5 h-5 ${
            isLocating
              ? "animate-spin text-blue-600"
              : "text-blue-600 hover:scale-110 transition-transform"
          }`}
        />
      </button>
    </div>
  );
}

