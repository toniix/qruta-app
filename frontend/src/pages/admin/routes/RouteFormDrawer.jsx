import { useState } from 'react';
import { Route, Check } from 'lucide-react';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import { BRAND_PRIMARY } from '../../../constants/brand';

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Crimson
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#0284c7', // Sky
  '#0d9488', // Teal
];

function RouteFormDrawerContent({
  onClose,
  initialData,
  lines = [],
  onSubmit,
  loading = false,
}) {
  const isEdit = Boolean(initialData?.id);

  const [form, setForm] = useState(() => ({
    transportLineId: initialData?.transportLineId || (lines[0]?.id || ''),
    code: initialData?.code || '',
    name: initialData?.name || '',
    color: initialData?.color || BRAND_PRIMARY,
    fare: initialData?.fare || '',
    schedule: initialData?.schedule || '',
    frequency: initialData?.frequency || '',
    description: initialData?.description || '',
    status: initialData?.status || 'ACTIVE',
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
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
      {/* Línea de Transporte */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Línea de Transporte <span className="text-rose-500">*</span>
        </label>
        <select
          value={form.transportLineId}
          onChange={(e) => setForm((f) => ({ ...f, transportLineId: e.target.value }))}
          required
          disabled={loading || isEdit}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
        >
          <option value="">Selecciona una línea...</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} {l.code ? `(${l.code})` : ''}
            </option>
          ))}
        </select>
        {isEdit && (
          <p className="mt-1 text-[11px] text-slate-400">
            La línea asociada es fija una vez creada la ruta.
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
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="Ej: R101, LINEA-1"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Tarifa */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Tarifa (S/.)
          </label>
          <input
            type="text"
            value={form.fare}
            onChange={(e) => setForm((f) => ({ ...f, fare: e.target.value }))}
            placeholder="Ej: 1.50"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
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
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ej: Huacachina - Mercado Central"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
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
            onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
            placeholder="Ej: 06:00 - 22:30"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Frecuencia */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Frecuencia Estimada
          </label>
          <input
            type="text"
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
            placeholder="Ej: Cada 8 - 12 min"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
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
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Información adicional sobre avenidas principales, terminales..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </AdminDrawer>
  );
}

export function RouteFormDrawer({ open, ...props }) {
  if (!open) return null;
  return <RouteFormDrawerContent {...props} />;
}
