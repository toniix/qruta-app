import { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Upload, Trash2 } from 'lucide-react';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import { StopLocationPickerModal } from '../../../components/admin/map/StopLocationPickerModal';
import { FieldError } from '../../../components/common/FieldError';
import { stopSchema, validateWith } from '../../../schemas';

// Mirrors the backend hard limits for stop reference images.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

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

  const [errors, setErrors] = useState({});

  // Reference image is UI-only state: the File (if any) and the removal flag
  // travel with the submit payload but are never part of the zod schema.
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState('');
  // True while the rendered preview failed to decode/load, so the broken
  // <img> hides instead of showing a broken-image icon.
  const [previewFailed, setPreviewFailed] = useState(false);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  // Revoke the last object URL on unmount so the preview never leaks memory.
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    // Reset the input so selecting the same file again re-fires change.
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Formato no permitido. Solo se aceptan imágenes JPG o PNG.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('La imagen supera el tamaño máximo permitido (2 MB).');
      return;
    }

    clearPreview();
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setImageError('');
    setPreviewFailed(false);
    setRemoveImage(false);
    setImageFile(file);
  };

  const handleRemoveImage = () => {
    clearPreview();
    setImageFile(null);
    setRemoveImage(true);
    setImageError('');
    setPreviewFailed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasExistingImage = isEdit && Boolean(initialData?.imageUrl) && !removeImage;
  const hasImageSelection = Boolean(previewUrl) || hasExistingImage;
  const showImagePreview = hasImageSelection && !previewFailed;

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
    // Validate only the schema fields; imageFile/removeImage are UI-only and
    // are re-attached to the payload after validation succeeds.
    const result = validateWith(stopSchema, form);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    // The image step is in a failed state (e.g. the admin picked an invalid
    // replacement file). Block the submit while the picker shows an error;
    // a valid selection or "quitar imagen" clears it.
    if (imageError) {
      return;
    }
    setErrors({});
    onSubmit({
      ...result.data,
      imageFile: imageFile || undefined,
      removeImage,
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
            onChange={(e) => update({ cityId: e.target.value }, 'cityId')}
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
          <FieldError message={errors.cityId} />
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
            onChange={(e) => update({ name: e.target.value }, 'name')}
            placeholder="Ej: Paradero Puente Blanco"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.name} />
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
                onChange={(e) => update({ latitude: e.target.value }, 'latitude')}
                placeholder="-14.0678"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <FieldError message={errors.latitude} />
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
                onChange={(e) => update({ longitude: e.target.value }, 'longitude')}
                placeholder="-75.7286"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <FieldError message={errors.longitude} />
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
            onChange={(e) => update({ address: e.target.value }, 'address')}
            placeholder="Ej: Av. Cutervo s/n, esquina con Grau"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.address} />
        </div>

        {/* Referencia */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Referencia
          </label>
          <input
            type="text"
            value={form.reference}
            onChange={(e) => update({ reference: e.target.value }, 'reference')}
            placeholder="Ej: Frente al centro comercial, poste con luminaria azul"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.reference} />
        </div>

        {/* Foto de referencia */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Foto de referencia (opcional)
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Seleccionar foto de referencia"
            onChange={handleImageSelect}
            className="hidden"
          />

          {showImagePreview && (
            <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <img
                src={previewUrl || initialData.imageUrl}
                alt="Vista previa de la foto de referencia"
                onError={() => setPreviewFailed(true)}
                className="h-36 w-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{hasImageSelection ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
            </button>

            {hasImageSelection && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Quitar imagen</span>
              </button>
            )}
          </div>

          <p className="mt-1.5 text-[11px] text-slate-400">
            Formatos permitidos: JPG o PNG. Tamaño máximo: 2 MB.
          </p>
          <FieldError message={imageError} />
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
