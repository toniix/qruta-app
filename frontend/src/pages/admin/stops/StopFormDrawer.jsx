import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import { StopLocationPickerModal } from '../../../components/admin/map/StopLocationPickerModal';

function StopFormDrawerContent({
  onClose,
  initialData,
  cities = [],
  onSubmit,
  loading = false,
}) {
  const isEdit = Boolean(initialData?.id);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const [form, setForm] = useState(() => ({
    cityId: initialData?.cityId || (cities[0]?.id || ''),
    name: initialData?.name || '',
    latitude: initialData?.latitude != null ? String(initialData.latitude) : '',
    longitude: initialData?.longitude != null ? String(initialData.longitude) : '',
    reference: initialData?.reference || '',
    address: initialData?.address || '',
    isAccessible: Boolean(initialData?.accessible ?? initialData?.isAccessible ?? true),
  }));

  // Selected city coords for map center
  const selectedCity = cities.find((c) => String(c.id) === String(form.cityId));
  const cityCoords = selectedCity
    ? { latitude: selectedCity.latitude, longitude: selectedCity.longitude }
    : null;

  const handleLocationSelected = ({ latitude, longitude, address }) => {
    setForm((f) => ({
      ...f,
      latitude: String(latitude),
      longitude: String(longitude),
      ...(address && !f.address ? { address } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    });
  };

  return (
    <>
      <AdminDrawer
        open={true}
        onClose={onClose}
        title={isEdit ? 'Editar Paradero' : 'Nuevo Paradero'}
        subtitle={isEdit ? `Modificando ${initialData.name}` : 'Registra un nuevo punto de abordaje con coordenadas'}
        icon={MapPin}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? 'Actualizar Paradero' : 'Crear Paradero'}
        loading={loading}
      >
        {/* Ciudad */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Ciudad de Cobertura <span className="text-rose-500">*</span>
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
              La ciudad asociada no puede modificarse tras crearse el paradero.
            </p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Nombre del Paradero <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Paradero Puente Blanco"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Coordinates Group with Interactive Map Picker Button */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Coordenadas Geográficas</span>
            <button
              type="button"
              onClick={() => setMapPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Seleccionar en mapa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Latitud <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                placeholder="-14.0678"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Longitud <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                placeholder="-75.7286"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Dirección
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Ej: Av. Cutervo s/n, esquina con Grau"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Referencia */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Referencia
          </label>
          <input
            type="text"
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            placeholder="Ej: Frente al centro comercial, poste con luminaria azul"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Accesibilidad */}
        <div className="pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isAccessible}
              onChange={(e) => setForm((f) => ({ ...f, isAccessible: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-slate-800">
              Cuenta con accesibilidad universal (rampa o silla de ruedas)
            </span>
          </label>
        </div>
      </AdminDrawer>

      {/* Map Picker Modal */}
      <StopLocationPickerModal
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialCoords={
          form.latitude && form.longitude
            ? { latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) }
            : null
        }
        cityCoords={cityCoords}
        onSelectLocation={handleLocationSelected}
      />
    </>
  );
}

export function StopFormDrawer({ open, ...props }) {
  if (!open) return null;
  return <StopFormDrawerContent {...props} />;
}
