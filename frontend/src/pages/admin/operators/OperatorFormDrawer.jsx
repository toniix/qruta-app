import { useState, useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import { FieldError } from '../../../components/common/FieldError';
import { operatorSchema, validateWith } from '../../../schemas';
import { cityService } from '../../../services/cityService';

const EMPTY_FORM = {
  name: '',
  ruc: '',
  cityId: '',
  plan: 'PRO',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  active: true,
};

function OperatorFormDrawerContent({ onClose, initialData, onSubmit, loading = false }) {
  const isEdit = Boolean(initialData?.id);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...initialData,
    cityId: initialData?.cityId || '',
    plan: initialData?.plan || 'PRO',
    active: initialData?.active ?? true,
  }));
  const [cities, setCities] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingCities, setLoadingCities] = useState(true);

  useEffect(() => {
    let cancelled = false;
    cityService
      .getAdminCities()
      .then((data) => {
        if (!cancelled) setCities(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    const payload = { ...form, contactEmail: form.contactEmail || '' };
    const result = validateWith(operatorSchema, payload);
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
      title={isEdit ? 'Editar Operador' : 'Nuevo Operador'}
      subtitle={
        isEdit
          ? `Modificando ${initialData.name}`
          : 'Registra una empresa transportista y asígnale un plan'
      }
      icon={Building2}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? 'Actualizar Operador' : 'Crear Operador'}
      loading={loading}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Nombre del Operador <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update({ name: e.target.value }, 'name')}
            placeholder="Ej: Expreso Ica S.A.C."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            RUC <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            inputMode="numeric"
            maxLength={11}
            value={form.ruc}
            onChange={(e) => update({ ruc: e.target.value.replace(/\D/g, '') }, 'ruc')}
            placeholder="20512345678"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.ruc} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Ciudad <span className="text-rose-500">*</span>
          </label>
          <select
            value={form.cityId}
            onChange={(e) => update({ cityId: e.target.value }, 'cityId')}
            disabled={loadingCities || loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
          >
            <option value="">
              {loadingCities ? 'Cargando ciudades...' : 'Selecciona una ciudad...'}
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.department})
              </option>
            ))}
          </select>
          <FieldError message={errors.cityId} />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Plan
          </label>
          <select
            value={form.plan}
            onChange={(e) => update({ plan: e.target.value }, 'plan')}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="BASIC">BASIC</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Contacto
          </label>
          <input
            type="text"
            value={form.contactName}
            onChange={(e) => update({ contactName: e.target.value }, 'contactName')}
            placeholder="Nombre y apellido"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.contactName} />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Correo de Contacto
          </label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => update({ contactEmail: e.target.value }, 'contactEmail')}
            placeholder="contacto@empresa.pe"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.contactEmail} />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Teléfono
          </label>
          <input
            type="text"
            value={form.contactPhone}
            onChange={(e) => update({ contactPhone: e.target.value }, 'contactPhone')}
            placeholder="+51 956 000 000"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <FieldError message={errors.contactPhone} />
        </div>
      </div>

      <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(form.active)}
          onChange={(e) => update({ active: e.target.checked }, 'active')}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-semibold text-slate-700">
          Operador activo (sus usuarios pueden ingresar al portal)
        </span>
      </label>

      {loadingCities && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando ciudades...
        </p>
      )}
    </AdminDrawer>
  );
}

export function OperatorFormDrawer({ open, ...props }) {
  if (!open) return null;
  return <OperatorFormDrawerContent {...props} />;
}

export default OperatorFormDrawer;