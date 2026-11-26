import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Search } from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { OperatorStatePanel } from '../../components/operator/OperatorStatePanel';
import { AdminDrawer } from '../../components/admin/common/AdminDrawer';
import { AccessibleBadge } from '../../components/admin/common/StatusBadge';
import { useAdminToast } from '../../hooks/useAdminToast';
import { STALE_TIMES } from '../../lib/queryClient';
import { operatorKeys } from '../../lib/queryKeys';
import { operatorPortalService } from '../../services/operatorPortalService';

const EMPTY_LIST = [];
const selectArray = (data) => (Array.isArray(data) ? data : []);

const emptyForm = {
  name: '',
  address: '',
  reference: '',
  keyStop: false,
  accessible: false,
  latitude: '',
  longitude: '',
};

export function OperatorStopsPage() {
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const stopsQuery = useQuery({
    queryKey: operatorKeys.stops(),
    queryFn: () => operatorPortalService.getStops(),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: selectArray,
  });

  const stops = stopsQuery.data ?? EMPTY_LIST;
  const loading = stopsQuery.isPending;
  const error = stopsQuery.isError
    ? stopsQuery.error?.response?.data?.message ||
      stopsQuery.error?.message ||
      'No se pudieron cargar los paraderos'
    : null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stops;
    return stops.filter((stop) =>
      [stop.name, stop.address, stop.reference].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [stops, search]);

  const handleOpen = (stop) => {
    setSelected(stop);
    setForm({
      name: stop.name || '',
      address: stop.address || '',
      reference: stop.reference || '',
      keyStop: Boolean(stop.keyStop),
      accessible: Boolean(stop.accessible),
      latitude: stop.latitude ?? '',
      longitude: stop.longitude ?? '',
    });
  };

  const updateStopMutation = useMutation({
    mutationFn: ({ id, payload }) => operatorPortalService.updateStop(id, payload),
    onSuccess: async (updated, { id }) => {
      queryClient.setQueryData(operatorKeys.stops(), (prev) =>
        Array.isArray(prev)
          ? prev.map((stop) => (stop.id === id ? { ...stop, ...updated } : stop))
          : prev,
      );
      toast.success('Paradero actualizado');
      setSelected(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: operatorKeys.stops() }),
        queryClient.invalidateQueries({ queryKey: operatorKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: operatorKeys.overview() }),
      ]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'No se pudo guardar el paradero');
    },
  });

  const handleSave = (event) => {
    event.preventDefault();
    if (!selected) return;
    const payload = {
      ...form,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    };
    updateStopMutation.mutate({ id: selected.id, payload });
  };

  return (
    <div>
      <OperatorPageHeader
        title="Paraderos"
        description="Paraderos asignados a las rutas de tu organización"
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paradero"
              className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        }
      />

      {loading ? (
        <OperatorStatePanel loading />
      ) : error ? (
        <OperatorStatePanel
          error={error}
          title="No se pudieron cargar los paraderos"
          onRetry={() => void stopsQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <OperatorStatePanel
          title="No hay paraderos para mostrar"
          description={search ? 'Prueba con otro término de búsqueda.' : 'Todavía no hay paraderos asignados.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Paradero</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Accesibilidad</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((stop) => (
                <tr key={stop.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-bold text-slate-800">{stop.name}</td>
                  <td className="px-4 py-3 text-slate-600">{stop.address || '—'}</td>
                  <td className="px-4 py-3">
                    <AccessibleBadge accessible={stop.accessible} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{stop.keyStop ? 'Clave' : 'Regular'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpen(stop)}
                      aria-label={`Editar ${stop.name}`}
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
        title="Editar paradero"
        subtitle={selected?.name || ''}
        icon={MapPin}
        onSubmit={handleSave}
        loading={updateStopMutation.isPending}
      >
        {[
          ['name', 'Nombre'],
          ['address', 'Dirección'],
          ['reference', 'Referencia'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
            <input
              value={form[key] || ''}
              onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Latitud</label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Longitud</label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.keyStop}
            onChange={(event) => setForm((prev) => ({ ...prev, keyStop: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Paradero clave
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.accessible}
            onChange={(event) => setForm((prev) => ({ ...prev, accessible: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Accesible
        </label>
      </AdminDrawer>
    </div>
  );
}

export default OperatorStopsPage;
