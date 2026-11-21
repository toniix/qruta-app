import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { OperatorStatePanel } from '../../components/operator/OperatorStatePanel';
import { AdminDrawer } from '../../components/admin/common/AdminDrawer';
import { ConfirmDialog } from '../../components/admin/common/ConfirmDialog';
import { useAdminToast } from '../../hooks/useAdminToast';
import { operatorPortalService } from '../../services/operatorPortalService';

export const DISRUPTION_TYPES = [
  { value: 'DESVIO', label: 'Desvío de ruta' },
  { value: 'CORTE', label: 'Corte de vía / tránsito' },
  { value: 'HORARIO', label: 'Cambio de horario' },
  { value: 'PARADERO', label: 'Paradero inhabilitado' },
  { value: 'OTRO', label: 'Otro comunicado' },
];

const emptyForm = {
  routeId: '',
  type: 'DESVIO',
  description: '',
  startsAt: '',
  endsAt: '',
  active: true,
};

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-AR');
}

export function OperatorDisruptionsPage() {
  const toast = useAdminToast();
  const [disruptions, setDisruptions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [disruptionData, routeData] = await Promise.all([
        operatorPortalService.getDisruptions(),
        operatorPortalService.getRoutes(),
      ]);
      setDisruptions(disruptionData);
      setRoutes(routeData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudieron cargar los desvíos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, routeId: routes[0]?.id || '' });
    setDrawerOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      routeId: item.routeId || '',
      type: item.type || 'DESVIO',
      description: item.description || '',
      startsAt: item.startsAt ? String(item.startsAt).slice(0, 16) : '',
      endsAt: item.endsAt ? String(item.endsAt).slice(0, 16) : '',
      active: Boolean(item.active),
    });
    setDrawerOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const updated = await operatorPortalService.updateDisruption(editing.id, {
          type: form.type,
          description: form.description,
          startsAt: form.startsAt,
          endsAt: form.endsAt || null,
          active: form.active,
        });
        setDisruptions((prev) =>
          prev.map((item) => (item.id === editing.id ? { ...item, ...updated } : item))
        );
        toast.success('Desvío actualizado');
      } else {
        const created = await operatorPortalService.createDisruption({
          routeId: form.routeId,
          type: form.type,
          description: form.description,
          startsAt: form.startsAt,
          endsAt: form.endsAt || null,
          active: form.active,
        });
        setDisruptions((prev) => [created, ...prev]);
        toast.success('Desvío creado');
      }
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'No se pudo guardar el desvío');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await operatorPortalService.deleteDisruption(deleting.id);
      setDisruptions((prev) => prev.filter((item) => item.id !== deleting.id));
      toast.success('Desvío eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'No se pudo eliminar el desvío');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <OperatorPageHeader
        title="Desvíos"
        description="Comunica alteraciones del servicio en tus rutas"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 text-brand-lime" />
            Nuevo desvío
          </button>
        }
      />

      {loading ? (
        <OperatorStatePanel loading />
      ) : error ? (
        <OperatorStatePanel error={error} title="No se pudieron cargar los desvíos" onRetry={load} />
      ) : disruptions.length === 0 ? (
        <OperatorStatePanel
          title="No hay desvíos registrados"
          description="Cuando comuniques una alteración, aparecerá en este listado."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Vigencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {disruptions.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{item.routeName || item.routeCode || 'Ruta'}</p>
                    <p className="text-[10px] text-slate-400">{item.routeCode || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {DISRUPTION_TYPES.find((t) => t.value === item.type)?.label || item.type}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{item.description}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(item.startsAt)} → {formatDateTime(item.endsAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.active
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.active ? 'Activo' : 'Finalizado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label="Editar desvío"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(item)}
                      aria-label="Eliminar desvío"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Editar desvío' : 'Nuevo desvío'}
        subtitle="Datos de la alteración del servicio"
        icon={TriangleAlert}
        onSubmit={handleSave}
        loading={saving}
      >
        {!editing && (
          <div>
            <label htmlFor="disruption-route" className="mb-1 block text-xs font-semibold text-slate-700">Ruta</label>
            <select
              id="disruption-route"
              required
              value={form.routeId}
              onChange={(event) => setForm((prev) => ({ ...prev, routeId: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Seleccionar ruta</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.code} · {route.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="disruption-type" className="mb-1 block text-xs font-semibold text-slate-700">Tipo</label>
          <select
            id="disruption-type"
            required
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {DISRUPTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="disruption-description" className="mb-1 block text-xs font-semibold text-slate-700">Descripción</label>
          <textarea
            id="disruption-description"
            required
            rows={4}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="disruption-starts-at" className="mb-1 block text-xs font-semibold text-slate-700">Inicio</label>
            <input
              id="disruption-starts-at"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label htmlFor="disruption-ends-at" className="mb-1 block text-xs font-semibold text-slate-700">Fin estimado</label>
            <input
              id="disruption-ends-at"
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Desvío activo
        </label>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar desvío"
        description={`¿Eliminar el desvío de ${deleting?.routeName || 'la ruta'}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default OperatorDisruptionsPage;
