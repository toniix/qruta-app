import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import { DepartmentCombobox } from '../../../components/admin/common/DepartmentCombobox';

function CityFormDrawerContent({
  onClose,
  initialData,
  onSubmit,
  loading = false,
}) {
  const isEdit = Boolean(initialData?.id);

  const [form, setForm] = useState(() => ({
    name: initialData?.name || '',
    department: initialData?.department || '',
    country: initialData?.country || 'Perú',
    latitude: initialData?.latitude != null ? String(initialData.latitude) : '',
    longitude: initialData?.longitude != null ? String(initialData.longitude) : '',
    radiusKm: initialData?.radiusKm != null ? Number(initialData.radiusKm) : 30,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      radiusKm: parseFloat(form.radiusKm) || 30.0,
    });
  };

  return (
    <AdminDrawer
      open={true}
      onClose={onClose}
      title={isEdit ? 'Editar Ciudad de Cobertura' : 'Nueva Ciudad de Cobertura'}
      subtitle={isEdit ? `Modificando ${initialData.name}` : 'Registra una nueva ciudad o zona metropolitana'}
      icon={Building2}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? 'Actualizar Ciudad' : 'Crear Ciudad'}
      loading={loading}
    >
      {/* Nombre */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Nombre de la Ciudad <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ej: Ica, Pisco, Chincha Alta"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Departamento Combobox */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Departamento del Perú <span className="text-rose-500">*</span>
        </label>
        <DepartmentCombobox
          value={form.department}
          onChange={(dept) => setForm((f) => ({ ...f, department: dept }))}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* País */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            País
          </label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none"
          />
        </div>

        {/* Radio de Cobertura */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Radio de Cobertura (Km)
          </label>
          <input
            type="number"
            min="1"
            max="200"
            step="1"
            value={form.radiusKm}
            onChange={(e) => setForm((f) => ({ ...f, radiusKm: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Coordenadas Centrales */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-900">Coordenadas Centrales de la Ciudad</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Latitud Centro
            </label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              placeholder="-14.0678"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Longitud Centro
            </label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              placeholder="-75.7286"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Utilizadas como centro focal del mapa ciudadano cuando los usuarios seleccionan esta ciudad.
        </p>
      </div>
    </AdminDrawer>
  );
}

export function CityFormDrawer({ open, ...props }) {
  if (!open) return null;
  return <CityFormDrawerContent {...props} />;
}
