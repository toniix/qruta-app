import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { formatCoord } from "./routeGeometryUtils";

export function DirectionGeometryPanel({
  routePoints,
  editingGeometry,
  usingStopFallback,
  onToggleEditing,
  onStopEditing,
  onInitializeFromStops,
  onMovePoint,
  onRemovePoint,
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-emerald-900">
          Trazado del recorrido ({routePoints.length} puntos)
        </h4>
        <button
          type="button"
          onClick={onToggleEditing}
          aria-pressed={editingGeometry}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
            editingGeometry
              ? "bg-emerald-600 text-white"
              : "bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
          }`}
        >
          {editingGeometry ? "Edición activa" : "Editar trazado"}
        </button>
      </div>

      {usingStopFallback && (
        <p className="text-[10px] text-slate-500">
          El trazado actual son líneas rectas entre paraderos. Agregá puntos en
          el mapa para seguir las calles.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onInitializeFromStops}
          disabled={routePoints.length > 0}
          className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
        >
          Inicializar desde paradas
        </button>
        <button
          type="button"
          onClick={onStopEditing}
          disabled={!editingGeometry}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          Dejar de agregar puntos
        </button>
      </div>

      {routePoints.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {routePoints.map((point, index) => (
            <div
              key={`geometry-${point.pointOrder ?? index}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1"
            >
              <span className="flex min-w-0 items-center gap-1">
                <span className="text-[10px] font-mono text-slate-600">
                  #{point.pointOrder} · {formatCoord(point.latitude, 5)},{" "}
                  {formatCoord(point.longitude, 5)}
                </span>
                {point.stopId && (
                  <span
                    title="Punto vinculado a un paradero: se elimina junto al paradero"
                    className="shrink-0 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-bold text-blue-600"
                  >
                    paradero
                  </span>
                )}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onMovePoint(index, "up")}
                  disabled={index === 0}
                  aria-label="Subir punto"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMovePoint(index, "down")}
                  disabled={index === routePoints.length - 1}
                  aria-label="Bajar punto"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemovePoint(index)}
                  disabled={Boolean(point.stopId)}
                  title={
                    point.stopId
                      ? "Este punto pertenece a un paradero: eliminá el paradero para quitarlo"
                      : "Eliminar punto del trazado"
                  }
                  aria-label="Eliminar punto"
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
