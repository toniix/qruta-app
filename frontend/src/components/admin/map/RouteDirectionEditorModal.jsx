import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Route as RouteIcon,
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  MapPin,
  Clock,
  Compass,
} from 'lucide-react';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';
import { StopQuickCreateModal } from './StopQuickCreateModal';
import { useAdminToast } from '../../../hooks/useAdminToast';

const DEFAULT_CENTER = [-14.0678, -75.7286]; // Ica

function createNumberedStopIcon(order, name) {
  return L.divIcon({
    className: '!bg-transparent !border-none',
    html: `
      <div class="flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group pointer-events-auto">
        <div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-[11px] shadow-md border-2 border-white ring-2 ring-blue-500/20">
          ${order}
        </div>
        <div class="mt-0.5 max-w-[100px] truncate rounded bg-slate-900/80 px-1 py-0.2 text-[9px] font-semibold text-white shadow-xs">
          ${name || ''}
        </div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [0, 0],
  });
}

function MapBoundsController({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (points && points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [points, map]);
  return null;
}

export function RouteDirectionEditorModal({
  open,
  onClose,
  route,
  cities = [],
  cityId = '',
  onSaved,
}) {
  const toast = useAdminToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allStops, setAllStops] = useState([]);

  // Quick-create stop overlay (city is fixed: it comes from the route's line)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Directions state: array of { id, direction, originName, destinationName, totalDistanceKm, estimatedMinutes, stops: [{ stopId, stopOrder, stopName, lat, lng, distanceFromStart }] }
  const [directions, setDirections] = useState([]);
  const [activeDirIndex, setActiveDirIndex] = useState(0);

  // Selected stop to add
  const [selectedStopToAdd, setSelectedStopToAdd] = useState('');

  // Load route detail with directions and all system stops
  useEffect(() => {
    if (!open || !route?.id) return;

    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const [routeDetail, stopsList] = await Promise.all([
          adminRouteService.getRouteById(route.id),
          adminStopService.getAllStops(),
        ]);

        if (!isMounted) return;
        setAllStops(stopsList);

        const stopLookup = new Map(stopsList.map((s) => [s.id, s]));

        if (routeDetail.directions && routeDetail.directions.length > 0) {
          const parsedDirs = routeDetail.directions.map((d) => {
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
              direction: d.direction || 'IDA',
              originName: d.originName || '',
              destinationName: d.destinationName || '',
              totalDistanceKm: d.totalDistanceKm || 0,
              estimatedMinutes: d.estimatedMinutes || 30,
              stops: mappedStops,
              routePoints: (d.routePoints || []).map((p, idx) => ({
                pointOrder: idx + 1,
                latitude: Array.isArray(p) ? p[0] : p.latitude,
                longitude: Array.isArray(p) ? p[1] : p.longitude,
              })),
            };
          });

          setDirections(parsedDirs);
          setActiveDirIndex(0);
        } else {
          // Default empty Inbound (IDA) direction
          setDirections([
            {
              direction: 'IDA',
              originName: 'Origen Principal',
              destinationName: 'Destino Final',
              totalDistanceKm: 10,
              estimatedMinutes: 30,
              stops: [],
              routePoints: [],
            },
          ]);
          setActiveDirIndex(0);
        }
      } catch (err) {
        console.error('Error cargando direcciones de ruta:', err);
        toast.error('No se pudieron cargar los datos de las direcciones.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, route?.id, toast]);

  const activeDirection = directions[activeDirIndex] || null;

  const routeCity = useMemo(
    () => cities.find((c) => String(c.id) === String(cityId)),
    [cities, cityId]
  );

  // Stops scoped to the route's city. Stops without cityId (legacy data)
  // are kept visible since we can't prove they belong elsewhere.
  const cityStops = useMemo(() => {
    if (!cityId) return allStops;
    return allStops.filter(
      (s) => !s.cityId || String(s.cityId) === String(cityId)
    );
  }, [allStops, cityId]);

  const updateActiveDirection = (patch) => {
    setDirections((prev) =>
      prev.map((d, idx) => (idx === activeDirIndex ? { ...d, ...patch } : d))
    );
  };

  const handleAddDirection = () => {
    const isFirstIda = directions.some((d) => d.direction === 'IDA');
    const newDirType = isFirstIda ? 'VUELTA' : 'IDA';
    const newDir = {
      direction: newDirType,
      originName: activeDirection?.destinationName || 'Origen',
      destinationName: activeDirection?.originName || 'Destino',
      totalDistanceKm: activeDirection?.totalDistanceKm || 10,
      estimatedMinutes: activeDirection?.estimatedMinutes || 30,
      stops: [],
      routePoints: [],
    };
    setDirections((prev) => [...prev, newDir]);
    setActiveDirIndex(directions.length);
  };

  const handleRemoveDirection = (indexToRemove) => {
    if (directions.length <= 1) {
      toast.warning('Debe existir al menos un sentido para la ruta.');
      return;
    }
    setDirections((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setActiveDirIndex(0);
  };

  const handleAddStopToDirection = () => {
    if (!selectedStopToAdd || !activeDirection) return;
    const stopObj = allStops.find((s) => s.id === selectedStopToAdd);
    if (!stopObj) return;

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
    });
    setSelectedStopToAdd('');
  };

  const handleQuickStopCreated = (created) => {
    setAllStops((prev) => [...prev, created]);
    // Add it straight into the active direction sequence.
    if (activeDirection) {
      updateActiveDirection({
        stops: [
          ...(activeDirection.stops || []),
          {
            stopId: created.id,
            stopOrder: (activeDirection.stops || []).length + 1,
            name: created.name,
            latitude: created.latitude,
            longitude: created.longitude,
            distanceFromStart: 0,
          },
        ],
      });
    }
  };

  const handleMoveStop = (index, direction) => {
    if (!activeDirection) return;
    const stopsList = [...activeDirection.stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stopsList.length) return;

    const [moved] = stopsList.splice(index, 1);
    stopsList.splice(targetIndex, 0, moved);

    // Reassign stopOrder
    const reordered = stopsList.map((s, idx) => ({
      ...s,
      stopOrder: idx + 1,
    }));

    updateActiveDirection({ stops: reordered });
  };

  const handleRemoveStop = (index) => {
    if (!activeDirection) return;
    const stopsList = activeDirection.stops.filter((_, idx) => idx !== index);
    const reordered = stopsList.map((s, idx) => ({
      ...s,
      stopOrder: idx + 1,
    }));
    updateActiveDirection({ stops: reordered });
  };

  const handleSave = async () => {
    if (directions.length === 0) {
      toast.warning('Debes configurar al menos una dirección.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        directions: directions.map((d) => ({
          id: d.id,
          direction: d.direction || 'IDA',
          originName: d.originName?.trim() || 'Origen',
          destinationName: d.destinationName?.trim() || 'Destino',
          totalDistanceKm: Number(d.totalDistanceKm) || 1.0,
          estimatedMinutes: Number(d.estimatedMinutes) || 15,
          stops: (d.stops || []).map((s, idx) => ({
            stopId: s.stopId,
            stopOrder: idx + 1,
            distanceFromStart: Number(s.distanceFromStart) || 0.0,
          })),
          routePoints: (d.stops || [])
            .filter((s) => s.latitude != null && s.longitude != null)
            .map((s, idx) => ({
              pointOrder: idx + 1,
              latitude: Number(s.latitude),
              longitude: Number(s.longitude),
            })),
        })),
      };

      await adminRouteService.updateRouteDirections(route.id, payload);
      toast.success('Sentidos y paraderos de la ruta guardados con éxito.');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error guardando direcciones:', err);
      toast.error(err.response?.data?.message || 'Error al guardar los sentidos de la ruta.');
    } finally {
      setSaving(false);
    }
  };

  // Derive points for polyline preview from stops sequence
  const activePolylinePoints = useMemo(() => {
    if (!activeDirection?.stops) return [];
    return activeDirection.stops
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => [Number(s.latitude), Number(s.longitude)]);
  }, [activeDirection]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
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
                  {route?.code || 'Ruta'}
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

        {/* Direction Tabs bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {directions.map((d, index) => {
              const isActive = index === activeDirIndex;
              return (
                <div key={index} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveDirIndex(index)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>
                      {d.direction === 'IDA'
                        ? 'Sentido Ida'
                        : d.direction === 'VUELTA'
                        ? 'Sentido Vuelta'
                        : d.direction}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
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
                <span>+ Agregar Vuelta</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Main Content: Split View (Left: Form & Stops List, Right: Map Preview) */}
        <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Left Panel: Configuration & Stops Sequencer */}
          <div className="flex w-full lg:w-1/2 flex-col border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : activeDirection ? (
              <>
                {/* Leg Details Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Detalles del Sentido
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Origen
                      </label>
                      <input
                        type="text"
                        value={activeDirection.originName || ''}
                        onChange={(e) => updateActiveDirection({ originName: e.target.value })}
                        placeholder="Ej. Terminal Norte"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Destino
                      </label>
                      <input
                        type="text"
                        value={activeDirection.destinationName || ''}
                        onChange={(e) => updateActiveDirection({ destinationName: e.target.value })}
                        placeholder="Ej. Plaza de Armas"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tiempo estimado (min)
                      </label>
                      <div className="relative flex items-center">
                        <Clock className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="number"
                          min="1"
                          value={activeDirection.estimatedMinutes || ''}
                          onChange={(e) =>
                            updateActiveDirection({ estimatedMinutes: Number(e.target.value) })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Distancia total (km)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={activeDirection.totalDistanceKm || ''}
                        onChange={(e) =>
                          updateActiveDirection({ totalDistanceKm: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Add Stop to sequence Bar */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Secuencia de Paraderos ({activeDirection.stops?.length || 0})
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
                      onChange={(e) => setSelectedStopToAdd(e.target.value)}
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">
                        {cityStops.length === 0
                          ? 'No hay paraderos en esta ciudad...'
                          : 'Seleccionar un paradero del sistema...'}
                      </option>
                      {cityStops.map((stop) => (
                        <option key={stop.id} value={stop.id}>
                          {stop.name} {stop.reference ? `(${stop.reference})` : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddStopToDirection}
                      disabled={!selectedStopToAdd}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen(true)}
                    disabled={!cityId}
                    title={
                      cityId
                        ? 'Crear un paradero nuevo en esta ciudad sin salir del editor'
                        : 'La ciudad de la ruta no está disponible'
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>
                      {cityStops.length === 0
                        ? 'Crear el primer paradero de esta ciudad'
                        : 'Nuevo paradero en esta ciudad'}
                    </span>
                  </button>
                </div>

                {/* Stops Sequencer List */}
                <div className="space-y-1.5 min-h-[160px]">
                  {(!activeDirection.stops || activeDirection.stops.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      <MapPin className="mx-auto h-6 w-6 text-slate-300 mb-1.5" />
                      No hay paraderos agregados a este sentido. Selecciona uno en el menú superior para comenzar.
                    </div>
                  ) : (
                    activeDirection.stops.map((stopItem, index) => {
                      const isFirst = index === 0;
                      const isLast = index === activeDirection.stops.length - 1;

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
                                Lat: {Number(stopItem.latitude).toFixed(4)}, Lng:{' '}
                                {Number(stopItem.longitude).toFixed(4)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveStop(index, 'up')}
                              disabled={isFirst}
                              aria-label="Subir paradero"
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStop(index, 'down')}
                              disabled={isLast}
                              aria-label="Bajar paradero"
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStop(index)}
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
            ) : null}
          </div>

          {/* Right Panel: Interactive Map Preview */}
          <div className="relative flex-1 min-h-[300px] lg:min-h-0 w-full bg-slate-100">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={13}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <MapBoundsController points={activePolylinePoints} />

              {/* Connected stops polyline */}
              {activePolylinePoints.length > 1 && (
                <Polyline
                  positions={activePolylinePoints}
                  pathOptions={{
                    color: route?.color || '#2563eb',
                    weight: 5,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              {/* Stop Markers */}
              {(activeDirection?.stops || []).map((stop, sIdx) => {
                if (stop.latitude == null || stop.longitude == null) return null;
                const icon = createNumberedStopIcon(sIdx + 1, stop.name);
                return (
                  <Marker
                    key={`${stop.stopId}-${sIdx}`}
                    position={[Number(stop.latitude), Number(stop.longitude)]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold">
                          #{sIdx + 1} {stop.name}
                        </strong>
                        <span className="text-slate-500 font-mono">
                          {Number(stop.latitude).toFixed(5)}, {Number(stop.longitude).toFixed(5)}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Map Info Badge */}
            <div className="absolute top-3 right-3 z-[1000] rounded-xl bg-white/95 px-3 py-1.5 shadow-md border border-slate-200 text-xs font-semibold text-slate-700 backdrop-blur-md">
              <span>{activePolylinePoints.length} paraderos en trazado</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/70 px-6 py-4">
          <p className="text-xs text-slate-500">
            Los cambios en el orden y paraderos se guardarán directamente en el servidor.
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
      {/* Quick-create stop overlay (above the directions modal) */}
      <StopQuickCreateModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        cityId={cityId}
        city={routeCity}
        onCreated={handleQuickStopCreated}
      />
    </div>,
    document.body
  );
}
