import { X, Check, Loader2 } from "lucide-react";

/**
 * Bottom sheet shown while the user picks a destination point on the map.
 * Shows the resolved destination label and explicit Cancel / Confirm actions.
 */
export function DestinationPinSheet({
  label = "",
  resolvingLabel = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="pointer-events-auto mb-16 lg:mb-4 animate-slide-in-top">
      <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-raised space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-base shrink-0">
            📍
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Destino elegido
            </p>
            {resolvingLabel ? (
              <p className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Ubicando punto…
              </p>
            ) : (
              <p className="text-sm font-bold text-slate-900 truncate">
                {label || "Punto en el mapa"}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Arrastra el pin o toca otro punto del mapa para moverlo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-[0.99]"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={resolvingLabel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-dark transition-colors shadow-2xs active:scale-[0.99] disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Buscar rutas aquí
          </button>
        </div>
      </div>
    </div>
  );
}
