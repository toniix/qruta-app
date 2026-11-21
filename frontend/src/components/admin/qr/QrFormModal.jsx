import { useState, useEffect, useMemo, useRef } from 'react';
import { X, QrCode as QrIcon, Loader2, Sparkles } from 'lucide-react';
import { generateQrSvg, resolveAbsoluteQrUrl } from '../../../utils/qrGenerator';

// Stable identities for default props. Storing them at module scope keeps the
// initialization effect from re-running on every render when a consumer omits
// a prop (a fresh `[]` literal would change identity each time).
const EMPTY_LIST = [];

/**
 * Routes inherit their city from the transport line, so the admin API exposes
 * `transportLineId` but no `cityId` on the route summary. Both helpers mirror
 * the lookup already used by the admin routes page.
 */
function routesOfCity(routes, lineCityMap, cityId) {
  if (!cityId) return [];
  return routes.filter(
    (route) =>
      String(lineCityMap.get(String(route.transportLineId)) || '') ===
      String(cityId),
  );
}

function stopsOfCity(stops, cityId) {
  if (!cityId) return [];
  return stops.filter((stop) => String(stop.cityId) === String(cityId));
}

export function QrFormModal({
  open,
  onClose,
  onSave,
  saving = false,
  routes = EMPTY_LIST,
  stops = EMPTY_LIST,
  operators = EMPTY_LIST,
  cities = EMPTY_LIST,
  lines = EMPTY_LIST,
  isOperator = false,
  initialData = null,
}) {
  const [formData, setFormData] = useState({
    label: '',
    targetType: 'ROUTE',
    cityId: '',
    targetId: '',
    campaignSource: '',
    campaignMedium: 'print',
    campaignName: '',
    operatorId: '',
  });

  const [errors, setErrors] = useState({});

  // Initialize once per open cycle. Later prop updates (e.g. data finishing its
  // load while the modal is open) must not wipe what the admin already typed.
  const initializedRef = useRef(false);

  const lineCityMap = useMemo(() => {
    const map = new Map();
    lines.forEach((line) => map.set(String(line.id), String(line.cityId || '')));
    return map;
  }, [lines]);

  // The city filter only makes sense when the caller supplies the city catalog.
  // Operator flows omit it, keeping the previous behaviour untouched.
  const cityFilterEnabled = cities.length > 0;
  const requiresTarget =
    formData.targetType === 'ROUTE' || formData.targetType === 'STOP';

  const routesInCity = useMemo(
    () => routesOfCity(routes, lineCityMap, formData.cityId),
    [routes, lineCityMap, formData.cityId],
  );

  const stopsInCity = useMemo(
    () => stopsOfCity(stops, formData.cityId),
    [stops, formData.cityId],
  );

  // What the target selects actually render. Without the city filter the full
  // lists stay available, preserving operator behaviour.
  const routesForPicker = cityFilterEnabled ? routesInCity : routes;
  const stopsForPicker = cityFilterEnabled ? stopsInCity : stops;

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;

    const pickDefaultTarget = (type, cityId) => {
      if (type === 'ROUTE') {
        const list = cityFilterEnabled
          ? routesOfCity(routes, lineCityMap, cityId)
          : routes;
        return list[0]?.id || '';
      }
      if (type === 'STOP') {
        const list = cityFilterEnabled ? stopsOfCity(stops, cityId) : stops;
        return list[0]?.id || '';
      }
      return '';
    };

    // Editing (or pre-seeding) resolves the city from the stored target so the
    // preselected resource stays visible inside the scoped list.
    const resolveInitialCityId = () => {
      if (!initialData?.targetId) return '';
      if (initialData.targetType === 'STOP') {
        const stop = stops.find(
          (s) => String(s.id) === String(initialData.targetId),
        );
        return stop?.cityId ? String(stop.cityId) : '';
      }
      if (initialData.targetType === 'ROUTE') {
        const route = routes.find(
          (r) => String(r.id) === String(initialData.targetId),
        );
        return route
          ? String(lineCityMap.get(String(route.transportLineId)) || '')
          : '';
      }
      return '';
    };

    const initialCityId =
      resolveInitialCityId() ||
      (cityFilterEnabled && cities.length === 1 ? String(cities[0].id) : '');
    const initialTargetType = initialData?.targetType || 'ROUTE';

    setFormData({
      label: initialData?.label || '',
      targetType: initialTargetType,
      cityId: initialCityId,
      targetId:
        initialData?.targetId ||
        (initialTargetType === 'ROUTE' || initialTargetType === 'STOP'
          ? pickDefaultTarget(initialTargetType, initialCityId)
          : ''),
      campaignSource: initialData?.campaignSource || '',
      campaignMedium: initialData?.campaignMedium || 'print',
      campaignName: initialData?.campaignName || '',
      operatorId: initialData?.operatorId || '',
    });
    setErrors({});
    initializedRef.current = true;
  }, [
    open,
    initialData,
    cities,
    routes,
    stops,
    lineCityMap,
    cityFilterEnabled,
  ]);

  if (!open) return null;

  const handleCityChange = (nextCityId) => {
    setFormData((prev) => ({
      ...prev,
      cityId: nextCityId,
      targetId:
        prev.targetType === 'ROUTE'
          ? routesOfCity(routes, lineCityMap, nextCityId)[0]?.id || ''
          : prev.targetType === 'STOP'
            ? stopsOfCity(stops, nextCityId)[0]?.id || ''
            : '',
    }));
  };

  const handleTargetTypeChange = (nextType) => {
    setFormData((prev) => ({
      ...prev,
      targetType: nextType,
      targetId:
        nextType === 'ROUTE'
          ? routesForPicker[0]?.id || ''
          : nextType === 'STOP'
            ? stopsForPicker[0]?.id || ''
            : '',
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.label.trim()) errs.label = 'La etiqueta es obligatoria.';
    if (requiresTarget && cityFilterEnabled && !formData.cityId) {
      errs.cityId = 'Seleccione una ciudad para filtrar rutas y paraderos.';
    }
    if (requiresTarget && !formData.targetId) {
      errs.targetId = 'Debe seleccionar un recurso de destino.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      label: formData.label.trim(),
      targetType: formData.targetType,
      targetId: formData.targetType === 'HOME' || formData.targetType === 'CAMPAIGN' ? null : formData.targetId,
      campaignSource: formData.campaignSource.trim() || null,
      campaignMedium: formData.campaignMedium.trim() || null,
      campaignName: formData.campaignName.trim() || null,
      operatorId: !isOperator && formData.operatorId ? formData.operatorId : null,
    });
  };

  // Generate live preview preview URL
  const previewSlug = initialData?.code || 'PREVIEW';
  const previewUrl = resolveAbsoluteQrUrl(initialData || previewSlug);
  const previewSvg = generateQrSvg(previewUrl, { margin: 1 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <QrIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {initialData ? 'Editar Código QR' : 'Crear Código QR Inteligente'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Genera un enlace público rastreable y seguro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 cols: inputs */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Etiqueta / Nombre <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ej. Afiche Paradero Plaza Bolognesi"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                {errors.label && <p className="mt-1 text-[11px] text-rose-500">{errors.label}</p>}
              </div>

              {/* City scoping — must be chosen before picking a target */}
              {cityFilterEnabled && (
                <div>
                  <label
                    htmlFor="qr-city"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Ciudad{' '}
                    {requiresTarget && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    id="qr-city"
                    value={formData.cityId}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="">Seleccione una ciudad...</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  {errors.cityId ? (
                    <p className="mt-1 text-[11px] text-rose-500">
                      {errors.cityId}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Limita las rutas y paraderos disponibles a esa ciudad.
                    </p>
                  )}
                </div>
              )}

              {/* Target Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="qr-target-type"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Tipo de Destino <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="qr-target-type"
                    value={formData.targetType}
                    onChange={(e) => handleTargetTypeChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="ROUTE">Ruta específica</option>
                    <option value="STOP">Paradero específico</option>
                    <option value="HOME">Página de Inicio</option>
                    <option value="CAMPAIGN">Campaña general</option>
                  </select>
                </div>

                {/* Target Selector */}
                {formData.targetType === 'ROUTE' && (
                  <div>
                    <label
                      htmlFor="qr-target-route"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Seleccionar Ruta <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="qr-target-route"
                      value={formData.targetId}
                      disabled={cityFilterEnabled && !formData.cityId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Seleccione una ruta...</option>
                      {routesForPicker.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code} - {r.name}
                        </option>
                      ))}
                    </select>
                    {errors.targetId ? (
                      <p className="mt-1 text-[11px] text-rose-500">{errors.targetId}</p>
                    ) : (
                      cityFilterEnabled &&
                      formData.cityId &&
                      routesForPicker.length === 0 && (
                        <p className="mt-1 text-[11px] text-amber-600">
                          No hay rutas registradas en esta ciudad.
                        </p>
                      )
                    )}
                  </div>
                )}

                {formData.targetType === 'STOP' && (
                  <div>
                    <label
                      htmlFor="qr-target-stop"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Seleccionar Paradero <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="qr-target-stop"
                      value={formData.targetId}
                      disabled={cityFilterEnabled && !formData.cityId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Seleccione un paradero...</option>
                      {stopsForPicker.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {errors.targetId ? (
                      <p className="mt-1 text-[11px] text-rose-500">{errors.targetId}</p>
                    ) : (
                      cityFilterEnabled &&
                      formData.cityId &&
                      stopsForPicker.length === 0 && (
                        <p className="mt-1 text-[11px] text-amber-600">
                          No hay paraderos registrados en esta ciudad.
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Operator assignment (Admin only) */}
              {!isOperator && operators.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operador Asignado (Opcional)
                  </label>
                  <select
                    value={formData.operatorId}
                    onChange={(e) => setFormData({ ...formData, operatorId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="">Ninguno (Administración Global QRuta)</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.ruc})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campaign attribution */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Atribución y Campaña (Opcional)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Fuente</label>
                    <input
                      type="text"
                      value={formData.campaignSource}
                      onChange={(e) => setFormData({ ...formData, campaignSource: e.target.value })}
                      placeholder="afiche, sticker"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Soporte</label>
                    <input
                      type="text"
                      value={formData.campaignMedium}
                      onChange={(e) => setFormData({ ...formData, campaignMedium: e.target.value })}
                      placeholder="print, digital"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Campaña</label>
                    <input
                      type="text"
                      value={formData.campaignName}
                      onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                      placeholder="verano_2026"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right col: Live preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Vista Previa
              </span>
              <div
                className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center mb-3"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
              <p className="text-[11px] font-bold text-slate-800 line-clamp-1">
                {formData.label || 'Nombre del QR'}
              </p>
              <p className="text-[10px] text-blue-600 mt-0.5 font-mono">
                /q/{previewSlug}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-center gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>{initialData ? 'Guardar Cambios' : 'Generar QR'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
