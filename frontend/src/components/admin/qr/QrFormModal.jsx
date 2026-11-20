import { useState, useEffect } from 'react';
import { X, QrCode as QrIcon, Loader2, Sparkles } from 'lucide-react';
import { generateQrSvg } from '../../../utils/qrGenerator';

export function QrFormModal({
  open,
  onClose,
  onSave,
  saving = false,
  routes = [],
  stops = [],
  operators = [],
  isOperator = false,
  initialData = null,
}) {
  const [formData, setFormData] = useState({
    label: '',
    targetType: 'ROUTE',
    targetId: '',
    campaignSource: '',
    campaignMedium: 'print',
    campaignName: '',
    operatorId: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        label: initialData.label || '',
        targetType: initialData.targetType || 'ROUTE',
        targetId: initialData.targetId || '',
        campaignSource: initialData.campaignSource || '',
        campaignMedium: initialData.campaignMedium || 'print',
        campaignName: initialData.campaignName || '',
        operatorId: initialData.operatorId || '',
      });
    } else {
      setFormData({
        label: '',
        targetType: 'ROUTE',
        targetId: routes.length > 0 ? routes[0].id : '',
        campaignSource: '',
        campaignMedium: 'print',
        campaignName: '',
        operatorId: '',
      });
    }
    setErrors({});
  }, [initialData, open, routes]);

  if (!open) return null;

  const validate = () => {
    const errs = {};
    if (!formData.label.trim()) errs.label = 'La etiqueta es obligatoria.';
    if ((formData.targetType === 'ROUTE' || formData.targetType === 'STOP') && !formData.targetId) {
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
  const previewUrl = `${window.location.origin}/q/${previewSlug}`;
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

              {/* Target Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Destino <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetType: e.target.value,
                        targetId:
                          e.target.value === 'ROUTE' && routes.length > 0
                            ? routes[0].id
                            : e.target.value === 'STOP' && stops.length > 0
                            ? stops[0].id
                            : '',
                      })
                    }
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Seleccionar Ruta <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      <option value="">Seleccione una ruta...</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code} - {r.name}
                        </option>
                      ))}
                    </select>
                    {errors.targetId && (
                      <p className="mt-1 text-[11px] text-rose-500">{errors.targetId}</p>
                    )}
                  </div>
                )}

                {formData.targetType === 'STOP' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Seleccionar Paradero <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      <option value="">Seleccione un paradero...</option>
                      {stops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {errors.targetId && (
                      <p className="mt-1 text-[11px] text-rose-500">{errors.targetId}</p>
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
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
