import { ArrowDown, ArrowUp, MapPin, Plus, Trash2 } from "lucide-react";
import { formatCoord } from "./routeGeometryUtils";

export function DirectionStopsPanel({
  stops,
  cityStops,
  routeCity,
  selectedStopToAdd,
  onSelectStopToAdd,
  onAddStop,
  onMoveStop,
  onRemoveStop,
  allowQuickCreate,
  cityId,
  onOpenQuickCreate,
}) {
  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-900">
            Secuencia de Paraderos ({stops.length})
          </h4>
          {routeCity && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              <MapPin className="h-3 w-3" />
              {routeCity.name}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={selectedStopToAdd}
            onChange={(e) => onSelectStopToAdd(e.target.value)}
            className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">
              {cityStops.length === 0
                ? "No hay paraderos en esta ciudad..."
                : "Seleccionar un paradero del sistema..."}
            </option>
            {cityStops.map((stop) => {
              const alreadyAdded = stops.some(
                (s) => String(s.stopId) === String(stop.id),
              );
              return (
                <option key={stop.id} value={stop.id} disabled={alreadyAdded}>
                  {stop.name} {stop.reference ? `(${stop.reference})` : ""}
                  {alreadyAdded ? " — Ya agregado" : ""}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={onAddStop}
            disabled={!selectedStopToAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar</span>
          </button>
        </div>

        {allowQuickCreate && (
          <button
            type="button"
            onClick={onOpenQuickCreate}
            disabled={!cityId}
            title={
              cityId
                ? "Crear un paradero nuevo en esta ciudad sin salir del editor"
                : "La ciudad de la ruta no está disponible"
            }
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>
              {cityStops.length === 0
                ? "Crear el primer paradero de esta ciudad"
                : "Nuevo paradero en esta ciudad"}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-1.5 min-h-[160px]">
        {stops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            <MapPin className="mx-auto h-6 w-6 text-slate-300 mb-1.5" />
            No hay paraderos agregados a este sentido. Selecciona uno en el
            menú superior para comenzar.
          </div>
        ) : (
          stops.map((stopItem, index) => {
            const isFirst = index === 0;
            const isLast = index === stops.length - 1;

            return (
              <div
                key={`${stopItem.stopId}-${index}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-slate-300"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700 text-[11px]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 truncate">
                      {stopItem.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Lat: {formatCoord(stopItem.latitude, 4)}, Lng:{" "}
                      {formatCoord(stopItem.longitude, 4)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMoveStop(index, "up")}
                    disabled={isFirst}
                    aria-label="Subir paradero"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveStop(index, "down")}
                    disabled={isLast}
                    aria-label="Bajar paradero"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveStop(index)}
                    aria-label="Eliminar paradero"
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
