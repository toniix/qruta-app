import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import {
  Route as RouteIcon,
  X,
  Plus,
  Trash2,
  Save,
  Loader2,
  Clock,
  Compass,
} from "lucide-react";
import { adminRouteService } from "../../../services/adminRouteService";
import { adminStopService } from "../../../services/adminStopService";
import { StopQuickCreateModal } from "./StopQuickCreateModal";
import { useAdminToast } from "../../../hooks/useAdminToast";
import { updateRouteDirectionsSchema, validateWith } from "../../../schemas";
import { appendPointForStop, findStopIdForPoint } from "./routeGeometryUtils";
import { DirectionStopsPanel } from "./DirectionStopsPanel";
import { DirectionGeometryPanel } from "./DirectionGeometryPanel";
import { RouteDirectionMapPreview } from "./RouteDirectionMapPreview";

const DEFAULT_DIRECTION = {
  direction: "IDA",
  originName: "Origen Principal",
  destinationName: "Destino Final",
  totalDistanceKm: 10,
  estimatedMinutes: 30,
  stops: [],
  routePoints: [],
};

function mapRouteDetailDirections(routeDetail, stopsList) {
  if (!routeDetail?.directions || routeDetail.directions.length === 0) {
    return [{ ...DEFAULT_DIRECTION }];
  }

  const stopLookup = new Map(stopsList.map((s) => [s.id, s]));
  return routeDetail.directions.map((d) => {
    const mappedStops = (d.stops || []).map((s, idx) => {
      const fullStop = stopLookup.get(s.id) || stopLookup.get(s.stopId) || {};
      return {
        stopId: s.id || s.stopId || fullStop.id,
        stopOrder: s.stopOrder ?? idx + 1,
        name: fullStop.name || s.name || `Paradero #${idx + 1}`,
        latitude: fullStop.latitude ?? s.location?.latitude ?? s.latitude,
        longitude: fullStop.longitude ?? s.location?.longitude ?? s.longitude,
        distanceFromStart: s.distanceFromStart ?? 0,
      };
    });

    return {
      id: d.id,
      direction: d.direction || "IDA",
      originName: d.originName || "",
      destinationName: d.destinationName || "",
      totalDistanceKm: d.totalDistanceKm ?? 0,
      estimatedMinutes: d.estimatedMinutes ?? 30,
      stops: mappedStops,
      routePoints: (d.routePoints || []).map((p, idx) => ({
        pointOrder: idx + 1,
        latitude: Array.isArray(p) ? p[0] : p.latitude,
        longitude: Array.isArray(p) ? p[1] : p.longitude,
        stopId: findStopIdForPoint(p, mappedStops),
      })),
    };
  });
}

function buildDirectionsPayload(directions) {
  return {
    directions: directions.map((d) => ({
      id: d.id,
      direction: d.direction || "IDA",
      originName: d.originName?.trim() || "Origen",
      destinationName: d.destinationName?.trim() || "Destino",
      totalDistanceKm:
        d.totalDistanceKm !== undefined &&
        d.totalDistanceKm !== null &&
        d.totalDistanceKm !== ""
          ? Number(d.totalDistanceKm)
          : 0,
      estimatedMinutes:
        d.estimatedMinutes !== undefined &&
        d.estimatedMinutes !== null &&
        d.estimatedMinutes !== ""
          ? Math.round(Number(d.estimatedMinutes))
          : 15,
      stops: (d.stops || []).map((s, idx) => ({
        stopId: s.stopId,
        stopOrder: idx + 1,
        distanceFromStart: Number(s.distanceFromStart) || 0.0,
      })),
      // Authoritative geometry: never regenerate it from the stops list.
      routePoints: (d.routePoints || [])
        .filter(
          (point) =>
            point.latitude != null &&
            point.longitude != null &&
            Number.isFinite(Number(point.latitude)) &&
            Number.isFinite(Number(point.longitude)),
        )
        .map((point, idx) => ({
          pointOrder: idx + 1,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
        })),
    })),
  };
}

export function RouteDirectionEditorModal(props) {
  if (!props.open) return null;
  return <RouteDirectionEditorDialog key={props.route?.id || "new"} {...props} />;
}

function RouteDirectionEditorDialog({
  open,
  onClose,
  route,
  cities = [],
  cityId = "",
  onSaved,
  routeService = adminRouteService,
  stopService = adminStopService,
  allowQuickCreate = true,
}) {
  const toast = useAdminToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allStops, setAllStops] = useState([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [directions, setDirections] = useState([]);
  const [activeDirIndex, setActiveDirIndex] = useState(0);
  const [editingGeometry, setEditingGeometry] = useState(false);
  const [selectedStopToAdd, setSelectedStopToAdd] = useState("");

  useEffect(() => {
    if (!open || !route?.id) return;

    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const fetchStops = stopService.getAllStops
          ? () => stopService.getAllStops()
          : () => stopService.getStops();
        const [routeDetail, stopsList] = await Promise.all([
          routeService.getRouteById(route.id),
          fetchStops(),
        ]);
        if (!isMounted) return;
        setAllStops(stopsList);
        setDirections(mapRouteDetailDirections(routeDetail, stopsList));
        setActiveDirIndex(0);
      } catch (err) {
        console.error("Error cargando direcciones de ruta:", err);
        toast.error("No se pudieron cargar los datos de las direcciones.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, route?.id, routeService, stopService, toast]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving && !quickCreateOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, saving, quickCreateOpen, onClose]);

  const activeDirection = directions[activeDirIndex] || null;

  const routeCity = useMemo(
    () => cities.find((c) => String(c.id) === String(cityId)),
    [cities, cityId],
  );

  // Stops scoped to the route's city. Stops without cityId (legacy data)
  // are kept visible since we can't prove they belong elsewhere.
  const cityStops = useMemo(() => {
    if (!cityId) return allStops;
    return allStops.filter(
      (s) => !s.cityId || String(s.cityId) === String(cityId),
    );
  }, [allStops, cityId]);

  const updateActiveDirection = (patch) => {
    setDirections((prev) =>
      prev.map((d, idx) => (idx === activeDirIndex ? { ...d, ...patch } : d)),
    );
  };

  const handleAddDirection = () => {
    const hasIda = directions.some((d) => d.direction === "IDA");
    const newDir = {
      direction: hasIda ? "VUELTA" : "IDA",
      originName: activeDirection?.destinationName || "Origen",
      destinationName: activeDirection?.originName || "Destino",
      totalDistanceKm: activeDirection?.totalDistanceKm ?? 10,
      estimatedMinutes: activeDirection?.estimatedMinutes ?? 30,
      stops: [],
      routePoints: [],
    };
    setDirections((prev) => [...prev, newDir]);
    setActiveDirIndex(directions.length);
  };

  const handleRemoveDirection = (indexToRemove) => {
    if (directions.length <= 1) {
      toast.warning("Debe existir al menos un sentido para la ruta.");
      return;
    }
    setDirections((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setActiveDirIndex(0);
  };

  const appendStopToActiveDirection = (stopObj) => {
    const newStop = {
      stopId: stopObj.id,
      stopOrder: (activeDirection.stops || []).length + 1,
      name: stopObj.name,
      latitude: stopObj.latitude,
      longitude: stopObj.longitude,
      distanceFromStart: 0,
    };
    updateActiveDirection({
      stops: [...(activeDirection.stops || []), newStop],
      routePoints: appendPointForStop(activeDirection.routePoints, newStop),
    });
  };

  const handleAddStopToDirection = () => {
    if (!selectedStopToAdd || !activeDirection) return;
    if (
      (activeDirection.stops || []).some(
        (s) => String(s.stopId) === String(selectedStopToAdd),
      )
    ) {
      toast.warning("Este paradero ya está en la secuencia de este sentido.");
      return;
    }
    const stopObj = allStops.find((s) => s.id === selectedStopToAdd);
    if (!stopObj) return;

    appendStopToActiveDirection(stopObj);
    setSelectedStopToAdd("");
  };

  const handleQuickStopCreated = (created) => {
    setAllStops((prev) => [...prev, created]);
    if (activeDirection) {
      appendStopToActiveDirection(created);
    }
  };

  const handleMoveStop = (index, move) => {
    if (!activeDirection) return;
    const stopsList = [...activeDirection.stops];
    const targetIndex = move === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stopsList.length) return;

    const [moved] = stopsList.splice(index, 1);
    stopsList.splice(targetIndex, 0, moved);

    const reordered = stopsList.map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
    const currentPoints = activeDirection.routePoints || [];
    const allStopLinked =
      currentPoints.length > 0 && currentPoints.every((point) => Boolean(point.stopId));
    const reorderedPoints = allStopLinked
      ? reordered
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s, idx) => ({
            pointOrder: idx + 1,
            latitude: Number(s.latitude),
            longitude: Number(s.longitude),
            stopId: s.stopId,
          }))
      : currentPoints;

    updateActiveDirection({ stops: reordered, routePoints: reorderedPoints });
  };

  const handleRemoveStop = (index) => {
    if (!activeDirection) return;
    const removedStopId = activeDirection.stops[index]?.stopId;
    const reordered = activeDirection.stops
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({ ...s, stopOrder: idx + 1 }));

    const remainingPoints = (activeDirection.routePoints || [])
      .filter((point) => !removedStopId || !point.stopId || point.stopId !== removedStopId)
      .map((point, idx) => ({ ...point, pointOrder: idx + 1 }));

    updateActiveDirection({ stops: reordered, routePoints: remainingPoints });
  };

  const handleAddPoint = ({ latitude, longitude }) => {
    if (!activeDirection) return;
    const points = activeDirection.routePoints || [];
    updateActiveDirection({
      routePoints: [
        ...points,
        { pointOrder: points.length + 1, latitude, longitude },
      ],
    });
  };

  const handleMovePoint = (index, move) => {
    if (!activeDirection) return;
    const points = [...(activeDirection.routePoints || [])];
    const target = move === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= points.length) return;
    const [moved] = points.splice(index, 1);
    points.splice(target, 0, moved);
    updateActiveDirection({
      routePoints: points.map((point, idx) => ({ ...point, pointOrder: idx + 1 })),
    });
  };

  const handleRemovePoint = (index) => {
    if (!activeDirection) return;
    if (activeDirection.routePoints?.[index]?.stopId) {
      toast.warning("Este punto pertenece a un paradero. Eliminá el paradero para quitarlo.");
      return;
    }
    const points = (activeDirection.routePoints || []).filter(
      (_, idx) => idx !== index,
    );
    updateActiveDirection({
      routePoints: points.map((point, idx) => ({ ...point, pointOrder: idx + 1 })),
    });
  };

  const handleDragPoint = (index, event) => {
    if (!activeDirection) return;
    const latlng = event.target.getLatLng();
    updateActiveDirection({
      routePoints: (activeDirection.routePoints || []).map((point, idx) =>
        idx === index
          ? { ...point, latitude: latlng.lat, longitude: latlng.lng, stopId: null }
          : point,
      ),
    });
  };

  const handleInitializeFromStops = () => {
    if (!activeDirection || (activeDirection.routePoints || []).length > 0) return;
    const points = (activeDirection.stops || [])
      .filter((stop) => stop.latitude != null && stop.longitude != null)
      .map((stop, idx) => ({
        pointOrder: idx + 1,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        stopId: stop.stopId,
      }));
    if (points.length === 0) {
      toast.warning("Los paraderos de este sentido no tienen coordenadas.");
      return;
    }
    updateActiveDirection({ routePoints: points });
    toast.success("Trazado inicial generado desde los paraderos.");
  };

  const handleSave = async () => {
    if (directions.length === 0) {
      toast.warning("Debes configurar al menos una dirección.");
      return;
    }

    const payload = buildDirectionsPayload(directions);
    const validation = validateWith(updateRouteDirectionsSchema, payload);
    if (!validation.ok) {
      const firstError = Object.values(validation.fieldErrors)[0];
      toast.warning(firstError || "Revisá los datos de los sentidos antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      await routeService.updateRouteDirections(route.id, payload);
      toast.success("Sentidos y paraderos de la ruta guardados con éxito.");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Error guardando direcciones:", err);
      const data = err.response?.data;
      const firstFieldError =
        data?.errors && typeof data.errors === "object"
          ? Object.values(data.errors)[0]
          : null;
      toast.error(
        data?.message || firstFieldError || "Error al guardar los sentidos de la ruta.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Stored geometry is authoritative; stops are only a fallback when empty.
  const activePolylinePoints = useMemo(() => {
    const points = activeDirection?.routePoints || [];
    if (points.length > 0) {
      return points
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => [Number(p.latitude), Number(p.longitude)]);
    }
    return (activeDirection?.stops || [])
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => [Number(s.latitude), Number(s.longitude)]);
  }, [activeDirection]);

  const usingStopFallback = (activeDirection?.routePoints || []).length === 0;

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-dir-title"
        className="relative flex h-[94vh] max-h-[900px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <RouteIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="route-dir-title" className="text-base font-bold text-slate-900">
                  Gestor de Sentidos y Paraderos
                </h2>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                  {route?.code || "Ruta"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {route?.name} — Configura el trayecto de ida/vuelta y la secuencia de paraderos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Direction Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {directions.map((d, index) => {
              const isActive = index === activeDirIndex;
              return (
                <div key={d.id || d.direction || index} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveDirIndex(index)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>
                      {d.direction === "IDA"
                        ? "Sentido Ida"
                        : d.direction === "VUELTA"
                          ? "Sentido Vuelta"
                          : d.direction}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {d.stops?.length || 0}
                    </span>
                  </button>

                  {directions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDirection(index)}
                      title="Eliminar este sentido"
                      className="ml-1 text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {directions.length < 2 && (
              <button
                type="button"
                onClick={handleAddDirection}
                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  {directions.some((d) => d.direction === "IDA")
                    ? "+ Agregar Vuelta"
                    : "+ Agregar Ida"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
          <div className="flex w-full lg:w-1/2 flex-col border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : activeDirection ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Detalles del Sentido
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="dir-origin-name" className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Origen
                      </label>
                      <input
                        id="dir-origin-name"
                        type="text"
                        value={activeDirection.originName || ""}
                        onChange={(e) => updateActiveDirection({ originName: e.target.value })}
                        placeholder="Ej. Terminal Norte"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="dir-destination-name" className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Destino
                      </label>
                      <input
                        id="dir-destination-name"
                        type="text"
                        value={activeDirection.destinationName || ""}
                        onChange={(e) => updateActiveDirection({ destinationName: e.target.value })}
                        placeholder="Ej. Plaza de Armas"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="dir-estimated-minutes" className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tiempo estimado (min)
                      </label>
                      <div className="relative flex items-center">
                        <Clock className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          id="dir-estimated-minutes"
                          type="number"
                          min="1"
                          value={activeDirection.estimatedMinutes ?? ""}
                          onChange={(e) =>
                            updateActiveDirection({
                              estimatedMinutes: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="dir-total-distance" className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Distancia total (km)
                      </label>
                      <input
                        id="dir-total-distance"
                        type="number"
                        step="0.1"
                        min="0"
                        value={activeDirection.totalDistanceKm ?? ""}
                        onChange={(e) =>
                          updateActiveDirection({
                            totalDistanceKm: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <DirectionStopsPanel
                  stops={activeDirection.stops || []}
                  cityStops={cityStops}
                  routeCity={routeCity}
                  selectedStopToAdd={selectedStopToAdd}
                  onSelectStopToAdd={setSelectedStopToAdd}
                  onAddStop={handleAddStopToDirection}
                  onMoveStop={handleMoveStop}
                  onRemoveStop={handleRemoveStop}
                  allowQuickCreate={allowQuickCreate}
                  cityId={cityId}
                  onOpenQuickCreate={() => setQuickCreateOpen(true)}
                />

                <DirectionGeometryPanel
                  routePoints={activeDirection.routePoints || []}
                  editingGeometry={editingGeometry}
                  usingStopFallback={usingStopFallback}
                  onToggleEditing={() => setEditingGeometry((prev) => !prev)}
                  onStopEditing={() => setEditingGeometry(false)}
                  onInitializeFromStops={handleInitializeFromStops}
                  onMovePoint={handleMovePoint}
                  onRemovePoint={handleRemovePoint}
                />
              </>
            ) : null}
          </div>

          <RouteDirectionMapPreview
            routeColor={route?.color}
            fitKey={`${route?.id ?? ""}:${activeDirIndex}`}
            activePolylinePoints={activePolylinePoints}
            routePoints={activeDirection?.routePoints || []}
            stops={activeDirection?.stops || []}
            editingGeometry={editingGeometry}
            usingStopFallback={usingStopFallback}
            onAddPoint={handleAddPoint}
            onDragPoint={handleDragPoint}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/70 px-6 py-4">
          <p className="text-xs text-slate-500">
            Los cambios en paraderos y en el trazado se guardan directamente en el servidor.
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Guardar Sentidos y Trazado
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {allowQuickCreate && (
        <StopQuickCreateModal
          open={quickCreateOpen}
          onClose={() => setQuickCreateOpen(false)}
          cityId={cityId}
          city={routeCity}
          onCreated={handleQuickStopCreated}
        />
      )}
    </div>,
    document.body,
  );
}
