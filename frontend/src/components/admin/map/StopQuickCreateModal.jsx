import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, Save, Loader2 } from 'lucide-react';
import { adminStopService } from '../../../services/adminStopService';
import { FieldError } from '../../common/FieldError';
import { stopSchema, validateWith } from '../../../schemas';
import { useAdminToast } from '../../../hooks/useAdminToast';

/**
 * Lightweight stop creation overlay designed to sit above other admin
 * overlays (z-9995). The city is fixed and comes from the caller — the user
 * never picks it here. On success it returns the created stop via onCreated.
 *
 * NOTE: no map picker inside on purpose (triple-stacked overlays break
 * focus/scroll). Coords are typed manually or prefilled from the city center;
 * fine-grained placement still lives in the Paraderos section.
 */
export function StopQuickCreateModal({ open, onClose, cityId = '', city = null, onCreated }) {
  const toast = useAdminToast();
  const [saving, setSaving] = useState(false);
  const blankForm = (cityCoords) => ({
    name: '',
    address: '',
    reference: '',
    latitude: cityCoords?.latitude != null ? String(cityCoords.latitude) : '',
    longitude: cityCoords?.longitude != null ? String(cityCoords.longitude) : '',
    isAccessible: true,
  });

  const [form, setForm] = useState(() => blankForm(city));
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

  // Reset the draft whenever the modal transitions closed -> open
  // (render-phase adjustment: the documented alternative to setState-in-effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(blankForm(city));
      setErrors({});
    }
  }

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validateWith(stopSchema, { ...form, cityId });
    if (!result.ok) {
      setErrors(result.fieldErrors);
      if (result.fieldErrors.cityId && !cityId) {
        toast.warning('No se pudo determinar la ciudad.');
      }
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const created = await adminStopService.createStop({
        ...result.data,
        address: result.data.address || undefined,
        reference: result.data.reference || undefined,
      });
      toast.success(`Paradero "${created.name}" creado con éxito.`);
      onCreated?.(created);
      onClose();
    } catch (err) {
      console.error('Error creando paradero:', err);
      toast.error(err.response?.data?.message || 'Error al crear el paradero.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-3 sm:p-5">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-stop-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <h3 id="quick-stop-title" className="text-sm font-bold text-slate-900">
                  Nuevo Paradero
                </h3>
                <p className="text-[11px] text-slate-500">
                  Se crea en{' '}
                  <strong className="text-slate-700">{city?.name || 'la ciudad'}</strong>
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
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-3.5">
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <FieldError message={errors.name} />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Coordenadas</span>
                {city?.latitude != null && city?.longitude != null && (
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        {
                          latitude: String(city.latitude),
                          longitude: String(city.longitude),
                        },
                        'latitude'
                      )
                    }
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 transition"
                  >
                    Usar centro de la ciudad
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <FieldError message={errors.longitude} />
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-blue-800/70">
                Tip: para elegir el punto exacto en el mapa, creá el paradero desde la
                sección Paraderos. Acá alcanza con una coordenada aproximada.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Dirección
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update({ address: e.target.value }, 'address')}
                placeholder="Ej: Av. Cutervo s/n, esquina con Grau"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <FieldError message={errors.address} />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Referencia
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => update({ reference: e.target.value }, 'reference')}
                placeholder="Ej: Frente al centro comercial"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <FieldError message={errors.reference} />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isAccessible}
                onChange={(e) => setForm((f) => ({ ...f, isAccessible: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Accesible (rampa o silla de ruedas)
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200/80 bg-slate-50/70 px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Crear paradero
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
