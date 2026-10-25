import { useState, useMemo } from 'react';
import { Route, Check } from 'lucide-react';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import { FieldError } from '../../../components/common/FieldError';
import { routeBasicsSchema, validateWith } from '../../../schemas';
import { BRAND_PRIMARY } from '../../../constants/brand';

const PRESET_COLORS = [
  '#B7F34A', // Route Lime
  '#60A5FA', // Route Blue
  '#A78BFA', // Route Violet
  '#FB923C', // Route Orange
  '#35B779', // Emerald
  '#F5B942', // Amber
  '#F97066', // Coral
  '#111B2E', // Surface Navy
];

function RouteFormDrawerContent({
  onClose,
  initialData,
  lines = [],
  cities = [],
  onSubmit,
  loading = false,
}) {
  const isEdit = Boolean(initialData?.id);

  // City comes from the assigned line (routes inherit the line's city).
  // On create it acts as a filter for the lines dropdown.
  const initialCityId = useMemo(() => {
    const lineCity = lines.find(
      (l) => String(l.id) === String(initialData?.transportLineId)
    )?.cityId;
    return lineCity || (cities[0]?.id || '');
  }, [lines, cities, initialData?.transportLineId]);

  const [cityId, setCityId] = useState(initialCityId);

  const filteredLines = useMemo(() => {
    if (!cityId) return lines;
    return lines.filter((l) => String(l.cityId) === String(cityId));
  }, [lines, cityId]);

  const [form, setForm] = useState(() => ({
    transportLineId: initialData?.transportLineId || '',
    code: initialData?.code || '',
    name: initialData?.name || '',
    color: initialData?.color || BRAND_PRIMARY,
    fare: initialData?.fare || '',
    schedule: initialData?.schedule || '',
    frequency: initialData?.frequency || '',
    description: initialData?.description || '',
    status: initialData?.status || 'ACTIVE',
  }));

  const handleCityChange = (nextCityId) => {
    setCityId(nextCityId);
    setForm((f) => {
      // Keep the current line if it still belongs to the chosen city.
      const stillValid = lines.some(
        (l) =>
          String(l.id) === String(f.transportLineId) &&
          String(l.cityId) === String(nextCityId)
      );
      if (stillValid) return f;
      const firstOfCity = lines.find(
        (l) => String(l.cityId) === String(nextCityId)
      );
      return { ...f, transportLineId: firstOfCity?.id || '' };
    });
  };

  const [errors, setErrors] = useState({});

  const update = (patch, field) => {
    setForm((f) => ({ ...f, ...patch }));
    if (field) {
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateWith(routeBasicsSchema, form);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <AdminDrawer
      open={true}
      onClose={onClose}
      title={isEdit ? 'Editar Ruta de Transporte' : 'Nueva Ruta de Transporte'}
      subtitle={isEdit ? `Modificando ${initialData.code} - ${initialData.name}` : 'Registra una nueva ruta en el sistema'}
      icon={Route}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? 'Actualizar Ruta' : 'Crear Ruta'}
      loading={loading}
    >
      {/* Ciudad (filtra las líneas disponibles) */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Ciudad <span className="text-rose-500">*</span>
        </label>
        <select
          value={cityId}
          onChange={(e) => handleCityChange(e.target.value)}
          required
          disabled={loading || isEdit || cities.length === 0}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
        >
          <option value="">Selecciona una ciudad...</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.department})
            </option>
          ))}
        </select>
        {isEdit && (
          <p className="mt-1 text-[11px] text-slate-400">
            La ciudad viene de la línea asignada y no puede cambiarse.
          </p>
        )}
      </div>

      {/* Línea de Transporte */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Línea de Transporte <span className="text-rose-500">*</span>
        </label>
        <select
          value={form.transportLineId}
          onChange={(e) => update({ transportLineId: e.target.value }, 'transportLineId')}
          required
          disabled={loading || isEdit || filteredLines.length === 0}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
        >
          <option value="">Selecciona una línea...</option>
          {filteredLines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} {l.code ? `(${l.code})` : ''}
            </option>
          ))}
        </select>
        <FieldError message={errors.transportLineId} />
        {isEdit && (
          <p className="mt-1 text-[11px] text-slate-400">
            La línea asociada es fija una vez creada la ruta.
          </p>
        )}
        {!isEdit && cityId && filteredLines.length === 0 && (
          <p className="mt-1 text-[11px] text-amber-600">
            No hay líneas registradas en esta ciudad. Creá una línea primero.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Código */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Código de Ruta <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.code}
            onChange={(e) => update({ code: e.target.value }, 'code')}
            placeholder="Ej: R101, LINEA-1"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.code} />
        </div>

        {/* Tarifa */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Tarifa (S/.)
          </label>
          <input
            type="text"
            value={form.fare}
            onChange={(e) => update({ fare: e.target.value }, 'fare')}
            placeholder="Ej: 1.50"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.fare} />
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Nombre de la Ruta <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => update({ name: e.target.value }, 'name')}
          placeholder="Ej: Huacachina - Mercado Central"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <FieldError message={errors.name} />
      </div>

      {/* Color Preset Palette */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Color Distintivo de Ruta
        </label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-xs transition hover:scale-110 active:scale-95"
            >
              {form.color === c && <Check className="h-4 w-4" />}
            </button>
          ))}
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Horario */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Horario de Operación
          </label>
          <input
            type="text"
            value={form.schedule}
            onChange={(e) => update({ schedule: e.target.value }, 'schedule')}
            placeholder="Ej: 06:00 - 22:30"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.schedule} />
        </div>

        {/* Frecuencia */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Frecuencia Estimada
          </label>
          <input
            type="text"
            value={form.frequency}
            onChange={(e) => update({ frequency: e.target.value }, 'frequency')}
            placeholder="Ej: Cada 8 - 12 min"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.frequency} />
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Estado Operativo
        </label>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="ACTIVE">Activo (Visible en mapa ciudadano)</option>
          <option value="INACTIVE">Inactivo (Suspendido)</option>
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Descripción o Notas de Ruta
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => update({ description: e.target.value }, 'description')}
          placeholder="Información adicional sobre avenidas principales, terminales..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <FieldError message={errors.description} />
      </div>
    </AdminDrawer>
  );
}

export function RouteFormDrawer({ open, ...props }) {
  if (!open) return null;
  return <RouteFormDrawerContent {...props} />;
}
