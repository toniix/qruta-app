import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bus, Pencil, Search } from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { OperatorStatePanel } from '../../components/operator/OperatorStatePanel';
import { AdminDrawer } from '../../components/admin/common/AdminDrawer';
import { StatusBadge } from '../../components/admin/common/StatusBadge';
import { useAdminToast } from '../../hooks/useAdminToast';
import { operatorPortalService } from '../../services/operatorPortalService';

const emptyForm = {
  color: '#3B82F6',
  contact: '',
  description: '',
  status: 'ACTIVE',
};

export function OperatorLinesPage() {
  const toast = useAdminToast();
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLines(await operatorPortalService.getLines());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudieron cargar las líneas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return lines;
    return lines.filter((line) =>
      String(line.company || '').toLowerCase().includes(term)
    );
  }, [lines, search]);

  const handleOpen = (line) => {
    setSelected(line);
    setForm({
      color: line.color || '#3B82F6',
      contact: line.contact || '',
      description: line.description || '',
      status: line.status || 'ACTIVE',
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await operatorPortalService.updateLine(selected.id, form);
      setLines((prev) => prev.map((line) => (line.id === selected.id ? { ...line, ...updated } : line)));
      toast.success('Línea actualizada');
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'No se pudo guardar la línea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <OperatorPageHeader
        title="Líneas"
        description="Información operativa de las líneas asignadas a tu organización"
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar línea"
              className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        }
      />

      {loading ? (
        <OperatorStatePanel loading />
      ) : error ? (
        <OperatorStatePanel error={error} title="No se pudieron cargar las líneas" onRetry={load} />
      ) : filtered.length === 0 ? (
        <OperatorStatePanel
          title="No hay líneas para mostrar"
          description={search ? 'Prueba con otro término de búsqueda.' : 'Tu organización todavía no tiene líneas asignadas.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Línea</th>
                <th className="px-4 py-3">Rutas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: line.color || '#3B82F6' }}
                      />
                      <p className="font-bold text-slate-800">{line.company}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{line.routeCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={line.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpen(line)}
                      aria-label={`Editar ${line.company}`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Editar línea"
        subtitle={selected?.company || ''}
        icon={Bus}
        onSubmit={handleSave}
        loading={saving}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Empresa</label>
          <input
            value={selected?.company || ''}
            readOnly
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Contacto</label>
          <input
            value={form.contact || ''}
            onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Color</label>
          <input
            type="color"
            value={form.color || '#3B82F6'}
            onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
            className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Descripción</label>
          <textarea
            rows={3}
            value={form.description || ''}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Estado</label>
          <select
            value={form.status || 'ACTIVE'}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="ACTIVE">Activa</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
        </div>
      </AdminDrawer>
    </div>
  );
}

export default OperatorLinesPage;
