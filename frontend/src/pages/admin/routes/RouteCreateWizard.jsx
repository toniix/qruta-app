import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Route as RouteIcon,
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  Compass,
} from 'lucide-react';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';
import { StopQuickCreateModal } from '../../../components/admin/map/StopQuickCreateModal';
import { FieldError } from '../../../components/common/FieldError';
import { routeBasicsSchema, routePayloadSchema, validateWith } from '../../../schemas';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { BRAND_PRIMARY } from '../../../constants/brand';

const PRESET_COLORS = [
  '#B7F34A', // Route Lime
  '#60A5FA', // Route Blue
  '#A78BFA', // Route Violet
  '#FB923C', // Route Orange
  '#35B779', // Emerald
  '#F5B942', // Amber
  '#F97066', // Coral
  '#0B1220', // Midnight Navy
];

const STEPS = [
  { id: 1, label: 'Datos básicos' },
  { id: 2, label: 'Sentidos' },
  { id: 3, label: 'Paraderos' },
];

function emptyDirection(type = 'IDA') {
  return {
    direction: type,
    originName: '',
    destinationName: '',
    totalDistanceKm: 10,
    estimatedMinutes: 30,
    stops: [],
  };
}

function initialBasics(linesList, citiesList) {
  const firstCityId = citiesList[0]?.id || '';
  const firstLine = linesList.find(
    (l) => !firstCityId || String(l.cityId) === String(firstCityId)
  );
  return {
    cityId: firstCityId,
    transportLineId: firstLine?.id || '',
    code: '',
    name: '',
    color: BRAND_PRIMARY,
    fare: '',
    schedule: '',
    frequency: '',
    description: '',
    status: 'ACTIVE',
  };
}

/**
 * Single-shot route creation wizard. Everything is held in memory and
 * persisted with ONE POST /admin/routes (scalars + directions + stops +
 * points) on confirm — no draft rows, no GET/PUT round trips.
 * New stops are the only exception: they must exist before being referenced,
 * so each one costs its own POST /admin/stops.
 */
export function RouteCreateWizard({ open, onClose, lines = [], cities = [], onCreated }) {
  const toast = useAdminToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [basics, setBasics] = useState(() => initialBasics(lines, cities));

  const [directions, setDirections] = useState(() => [emptyDirection('IDA')]);
  const [activeDirIndex, setActiveDirIndex] = useState(0);

  const [allStops, setAllStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [selectedStopToAdd, setSelectedStopToAdd] = useState('');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (field) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // The parent mounts the wizard only while it is open, so lazy initializers
  // above give a fresh draft every time. This effect only loads stops.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setStopsLoading(true);
      try {
        const stopsList = await adminStopService.getAllStops();
        if (isMounted) setAllStops(Array.isArray(stopsList) ? stopsList : []);
      } catch (err) {
        console.error('Error cargando paraderos:', err);
        if (isMounted) toast.error('No se pudieron cargar los paraderos.');
      } finally {
        if (isMounted) setStopsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const filteredLines = useMemo(() => {
    if (!basics.cityId) return lines;
    return lines.filter((l) => String(l.cityId) === String(basics.cityId));
  }, [lines, basics.cityId]);

  const routeCity = useMemo(
    () => cities.find((c) => String(c.id) === String(basics.cityId)),
    [cities, basics.cityId]
  );

  const cityStops = useMemo(() => {
    if (!basics.cityId) return allStops;
    return allStops.filter(
      (s) => !s.cityId || String(s.cityId) === String(basics.cityId)
    );
  }, [allStops, basics.cityId]);

  const activeDirection = directions[activeDirIndex] || null;

  const clearDirectionStops = (dirs) => dirs.map((d) => ({ ...d, stops: [] }));

  const updateBasics = (patch, field) => {
    setBasics((b) => ({ ...b, ...patch }));
    if (field) clearError(field);
  };

  const handleCityChange = (nextCityId) => {
    setBasics((b) => {
      const firstOfCity = lines.find((l) => String(l.cityId) === String(nextCityId));
      return { ...b, cityId: nextCityId, transportLineId: firstOfCity?.id || '' };
    });
    clearError('transportLineId');
    // Stops belong to the previous city — they can't travel along.
    setDirections((prev) => clearDirectionStops(prev));
    setSelectedStopToAdd('');
  };

  const updateActiveDirection = (patch) => {
    setDirections((prev) =>
      prev.map((d, idx) => (idx === activeDirIndex ? { ...d, ...patch } : d))
    );
  };

  const handleAddDirection = () => {
    const isFirstIda = directions.some((d) => d.direction === 'IDA');
    const newDirType = isFirstIda ? 'VUELTA' : 'IDA';
    setDirections((prev) => [
      ...prev,
      {
        ...emptyDirection(newDirType),
        originName: activeDirection?.destinationName || '',
        destinationName: activeDirection?.originName || '',
      },
    ]);
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
    updateActiveDirection({
      stops: [
        ...(activeDirection.stops || []),
        {
          stopId: stopObj.id,
          name: stopObj.name,
          latitude: stopObj.latitude,
          longitude: stopObj.longitude,
        },
      ],
    });
    setSelectedStopToAdd('');
  };

  const handleQuickStopCreated = (created) => {
    setAllStops((prev) => [...prev, created]);
    if (activeDirection) {
      updateActiveDirection({
        stops: [
          ...(activeDirection.stops || []),
          {
            stopId: created.id,
            name: created.name,
            latitude: created.latitude,
            longitude: created.longitude,
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
    updateActiveDirection({ stops: stopsList });
  };

  const handleRemoveStop = (index) => {
    if (!activeDirection) return;
    updateActiveDirection({
      stops: activeDirection.stops.filter((_, idx) => idx !== index),
    });
  };

  const basicsPayload = () => ({
    transportLineId: basics.transportLineId,
    code: basics.code,
    name: basics.name,
    color: basics.color,
    fare: basics.fare,
    schedule: basics.schedule,
    frequency: basics.frequency,
    description: basics.description,
    status: basics.status,
  });

  const handleNextFromBasics = () => {
    const result = validateWith(routeBasicsSchema, basicsPayload());
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async () => {
    const payload = {
      ...basicsPayload(),
      directions: directions.map((d) => ({
        direction: d.direction || 'IDA',
        originName: d.originName?.trim() || 'Origen',
        destinationName: d.destinationName?.trim() || 'Destino',
        totalDistanceKm: d.totalDistanceKm,
        estimatedMinutes: d.estimatedMinutes,
        stops: (d.stops || []).map((s, idx) => ({
          stopId: s.stopId,
          stopOrder: idx + 1,
          distanceFromStart: 0.0,
        })),
        routePoints: (d.stops || [])
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s, idx) => ({
            pointOrder: idx + 1,
            latitude: s.latitude,
            longitude: s.longitude,
          })),
      })),
    };
    const result = validateWith(routePayloadSchema, payload);
    if (!result.ok) {
      const basicsKeys = Object.keys(basicsPayload());
      if (basicsKeys.some((k) => result.fieldErrors[k])) {
        setErrors(result.fieldErrors);
        setStep(1);
        toast.warning('Revisá los datos básicos de la ruta.');
        return;
      }
      toast.warning(result.fieldErrors.directions || 'Revisá los sentidos y paraderos.');
      return;
    }
    setSaving(true);
    try {
      const created = await adminRouteService.createRoute(result.data);
      toast.success(`Ruta ${created.code} creada completa con éxito.`);
      onCreated?.();
      onClose();
    } catch (err) {
      console.error('Error creando ruta:', err);
      toast.error(err.response?.data?.message || 'Error al crear la ruta.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-wizard-title"
        className="relative flex h-[94vh] max-h-[900px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <RouteIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 id="route-wizard-title" className="text-base font-bold text-slate-900">
                Nueva Ruta de Transporte
              </h2>
              <p className="text-xs text-slate-500">
                Se guarda todo junto al confirmar — nada queda a medias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white px-6 py-3">
          {STEPS.map((s, idx) => {
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDone
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {step === 1 && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Ciudad <span className="text-rose-500">*</span>
                </label>
                <select
                  value={basics.cityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Selecciona una ciudad...</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Línea de Transporte <span className="text-rose-500">*</span>
                </label>
                <select
                  value={basics.transportLineId}
                  onChange={(e) => updateBasics({ transportLineId: e.target.value }, 'transportLineId')}
                  required
                  disabled={filteredLines.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                >
                  <option value="">Selecciona una línea...</option>
                  {filteredLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.code ? `(${l.code})` : ''}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.transportLineId} />
                {basics.cityId && filteredLines.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    No hay líneas registradas en esta ciudad. Creá una línea primero.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Código de Ruta <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={basics.code}
                    onChange={(e) => updateBasics({ code: e.target.value }, 'code')}
                    placeholder="Ej: R101"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <FieldError message={errors.code} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Tarifa (S/.)
                  </label>
                  <input
                    type="text"
                    value={basics.fare}
                    onChange={(e) => updateBasics({ fare: e.target.value }, 'fare')}
                    placeholder="Ej: 1.50"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <FieldError message={errors.fare} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nombre de la Ruta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={basics.name}
                  onChange={(e) => updateBasics({ name: e.target.value }, 'name')}
                  placeholder="Ej: Huacachina - Mercado Central"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <FieldError message={errors.name} />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Color Distintivo de Ruta
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBasics((b) => ({ ...b, color: c }))}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-xs transition hover:scale-110 active:scale-95"
                    >
                      {basics.color === c && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={basics.color}
                    onChange={(e) => setBasics((b) => ({ ...b, color: e.target.value }))}
                    className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Horario de Operación
                  </label>
                  <input
                    type="text"
                    value={basics.schedule}
                    onChange={(e) => updateBasics({ schedule: e.target.value }, 'schedule')}
                    placeholder="Ej: 06:00 - 22:30"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <FieldError message={errors.schedule} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Frecuencia Estimada
                  </label>
                  <input
                    type="text"
                    value={basics.frequency}
                    onChange={(e) => updateBasics({ frequency: e.target.value }, 'frequency')}
                    placeholder="Ej: Cada 8 - 12 min"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <FieldError message={errors.frequency} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Estado Operativo
                </label>
                <select
                  value={basics.status}
                  onChange={(e) => setBasics((b) => ({ ...b, status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">Activo (Visible en mapa ciudadano)</option>
                  <option value="INACTIVE">Inactivo (Suspendido)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Descripción o Notas de Ruta
                </label>
                <textarea
                  rows={3}
                  value={basics.description}
                  onChange={(e) => updateBasics({ description: e.target.value }, 'description')}
                  placeholder="Información adicional sobre avenidas principales, terminales..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <FieldError message={errors.description} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                {directions.map((d, index) => (
                  <div key={index} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveDirIndex(index)}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                        index === activeDirIndex
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Compass className="h-3.5 w-3.5" />
                      <span>{d.direction === 'IDA' ? 'Sentido Ida' : 'Sentido Vuelta'}</span>
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
                ))}
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

              {activeDirection && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
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
                      <input
                        type="number"
                        min="1"
                        value={activeDirection.estimatedMinutes || ''}
                        onChange={(e) =>
                          updateActiveDirection({ estimatedMinutes: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
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
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                {directions.map((d, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setActiveDirIndex(index);
                      setSelectedStopToAdd('');
                    }}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      index === activeDirIndex
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>{d.direction === 'IDA' ? 'Sentido Ida' : 'Sentido Vuelta'}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        index === activeDirIndex
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {d.stops?.length || 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Secuencia de Paraderos ({activeDirection?.stops?.length || 0})
                  </h4>
                  {routeCity && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      <MapPin className="h-3 w-3" />
                      {routeCity.name}
                    </span>
                  )}
                </div>

                {stopsLoading ? (
                  <div className="flex h-16 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : (
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
                )}

                <button
                  type="button"
                  onClick={() => setQuickCreateOpen(true)}
                  disabled={!basics.cityId}
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

              <div className="space-y-1.5 min-h-[120px]">
                {(!activeDirection?.stops || activeDirection.stops.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                    <MapPin className="mx-auto h-6 w-6 text-slate-300 mb-1.5" />
                    No hay paraderos en este sentido. Agregá al menos uno para trazar el recorrido.
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Atrás
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => (step === 1 ? handleNextFromBasics() : setStep((s) => s + 1))}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 disabled:opacity-60"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-card transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Crear ruta completa
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <StopQuickCreateModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        cityId={basics.cityId}
        city={routeCity}
        onCreated={handleQuickStopCreated}
      />
    </div>,
    document.body
  );
}
