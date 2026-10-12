import { useState } from 'react';
import { Bus, Check } from 'lucide-react';
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

function LineFormDrawerContent({
  onClose,
  initialData,
  cities = [],
  onSubmit,
  loading = false,
}) {
  const isEdit = Boolean(initialData?.id);

  const [form, setForm] = useState(() => ({
    cityId: initialData?.cityId || (cities[0]?.id || ''),
    name: initialData?.name || '',
    code: initialData?.code || '',
    color: initialData?.color || BRAND_PRIMARY,
    company: initialData?.company || '',
    contact: initialData?.contact || '',
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
      title={isEdit ? 'Editar Línea de Transporte' : 'Nueva Línea de Transporte'}
      subtitle={isEdit ? `Modificando ${initialData.name}` : 'Registra una empresa o consorcio concesionario'}
      icon={Bus}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? 'Actualizar Línea' : 'Crear Línea'}
      loading={loading}
    >
      {/* Ciudad de Operación */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Ciudad de Operación <span className="text-rose-500">*</span>
        </label>
        <select
          value={form.cityId}
          onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
          required
          disabled={loading || isEdit}
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
            La ciudad es fija una vez creada la línea.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Código */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Código
          </label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="Ej: L01"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Nombre */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Nombre de Línea <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Línea 1 - Los Rápidos"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Color Preset Palette */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Color Distintivo
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
        {/* Empresa */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Empresa / Razón Social
          </label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            placeholder="Ej: Empresa de Transportes Ica S.A."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Contacto */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Teléfono o Contacto
          </label>
          <input
            type="text"
            value={form.contact}
            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            placeholder="Ej: +51 956 000 000"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Estado
        </label>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Descripción o Flota
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Detalles sobre flota de microbuses, paraderos base..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </AdminDrawer>
  );
}

export function LineFormDrawer({ open, ...props }) {
  if (!open) return null;
  return <LineFormDrawerContent {...props} />;
}
