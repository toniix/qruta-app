import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Route as RouteIcon } from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { OperatorStatePanel } from '../../components/operator/OperatorStatePanel';
import { AdminFilterBar } from '../../components/admin/common/AdminFilterBar';
import { StatusBadge } from '../../components/admin/common/StatusBadge';
import { RouteFormDrawer } from '../admin/routes/RouteFormDrawer';
import { RouteDirectionEditorModal } from '../../components/admin/map/RouteDirectionEditorModal';
import { useAdminToast } from '../../hooks/useAdminToast';
import { STALE_TIMES } from '../../lib/queryClient';
import { operatorKeys } from '../../lib/queryKeys';
import { operatorPortalService } from '../../services/operatorPortalService';

const EMPTY_LIST = [];
const selectArray = (data) => (Array.isArray(data) ? data : []);

export function OperatorRoutesPage() {
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [directionEditorOpen, setDirectionEditorOpen] = useState(false);
  const [directionEditing, setDirectionEditing] = useState(null);

  const routesQuery = useQuery({
    queryKey: operatorKeys.routes(),
    queryFn: () => operatorPortalService.getRoutes(),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: selectArray,
  });

  const linesQuery = useQuery({
    queryKey: operatorKeys.lines(),
    queryFn: () => operatorPortalService.getLines(),
    staleTime: STALE_TIMES.CATALOG,
    select: selectArray,
  });

  const routes = routesQuery.data ?? EMPTY_LIST;
  const lines = linesQuery.data ?? EMPTY_LIST;
  const loading = routesQuery.isPending || linesQuery.isPending;
  const firstError = routesQuery.error || linesQuery.error;
  const error = firstError
    ? firstError.response?.data?.message || firstError.message || 'No se pudieron cargar las rutas'
    : null;

  const handleRetry = () => {
    void Promise.all([routesQuery.refetch(), linesQuery.refetch()]);
  };

  const handleDirectionsSaved = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: operatorKeys.routes() }),
      queryClient.invalidateQueries({ queryKey: operatorKeys.stops() }),
      queryClient.invalidateQueries({ queryKey: operatorKeys.overview() }),
    ]);
  };

  const filteredRoutes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return routes.filter((route) => {
      const matchesLine = !lineFilter || String(route.transportLineId) === lineFilter;
      const haystack = `${route.code || ''} ${route.name || ''} ${route.transportLineName || ''}`.toLowerCase();
      return matchesLine && (!query || haystack.includes(query));
    });
  }, [routes, searchQuery, lineFilter]);

  const openEditor = (route) => {
    setEditing(route);
    setDrawerOpen(true);
  };

  const openDirectionEditor = (route) => {
    setDirectionEditing(route);
    setDirectionEditorOpen(true);
  };

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, data }) => operatorPortalService.updateRoute(id, data),
    onSuccess: async (updated, { id }) => {
      queryClient.setQueryData(operatorKeys.routes(), (prev) =>
        Array.isArray(prev)
          ? prev.map((route) => (route.id === id ? { ...route, ...updated } : route))
          : prev,
      );
      toast.success('Ruta actualizada');
      setDrawerOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: operatorKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: operatorKeys.overview() }),
      ]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'No se pudo actualizar la ruta');
    },
  });

  const handleSubmit = (values) => {
    if (!editing) return;
    updateRouteMutation.mutate({
      id: editing.id,
      data: {
        name: values.name,
        code: values.code,
        category: values.category,
        color: values.color,
        description: values.description,
        status: values.status,
      },
    });
  };

  return (
    <div>
      <OperatorPageHeader
        title="Rutas"
        description="Administra la información de las rutas de tu red"
      />

      {loading ? (
        <OperatorStatePanel loading />
      ) : error ? (
        <OperatorStatePanel error={error} title="No se pudieron cargar las rutas" onRetry={handleRetry} />
      ) : routes.length === 0 ? (
        <OperatorStatePanel
          title="No hay rutas asignadas"
          description="Cuando tengas rutas en tu operación, aparecerán en este listado."
        />
      ) : (
        <>
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Buscar por código, nombre o línea"
          >
            <select
              value={lineFilter}
              onChange={(event) => setLineFilter(event.target.value)}
              aria-label="Filtrar por línea"
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="">Todas las líneas</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.company}
                </option>
              ))}
            </select>
          </AdminFilterBar>

          {filteredRoutes.length === 0 ? (
            <div className="mt-5">
              <OperatorStatePanel
                title="Sin resultados"
                description="Probá con otro término de búsqueda o quitá el filtro de línea."
              />
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Línea</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoutes.map((route) => (
                    <tr key={route.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex min-w-12 items-center justify-center rounded-lg px-2 py-1 text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: route.color || '#12345A' }}
                        >
                          {route.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{route.name}</td>
                      <td className="px-4 py-3 text-slate-600">{route.transportLineName || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{route.category || 'MICRO'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={route.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDirectionEditor(route)}
                            aria-label={`Editar sentidos de la ruta ${route.code}`}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <RouteIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditor(route)}
                            aria-label={`Editar ruta ${route.code}`}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <RouteFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={editing}
        lines={lines}
        cities={[]}
        onSubmit={handleSubmit}
        loading={updateRouteMutation.isPending}
      />

      <RouteDirectionEditorModal
        open={directionEditorOpen}
        onClose={() => setDirectionEditorOpen(false)}
        route={directionEditing}
        cities={[]}
        onSaved={handleDirectionsSaved}
        routeService={operatorPortalService}
        stopService={operatorPortalService}
        allowQuickCreate={false}
      />
    </div>
  );
}

export default OperatorRoutesPage;
