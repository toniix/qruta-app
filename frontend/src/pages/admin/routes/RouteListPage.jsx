import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Route,
  Edit2,
  Trash2,
  Compass,
  Bus,
  RefreshCw,
} from 'lucide-react';
import { AdminDataTable } from '../../../components/admin/common/AdminDataTable';
import { AdminFilterBar } from '../../../components/admin/common/AdminFilterBar';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { RouteFormDrawer } from './RouteFormDrawer';
import { RouteCreateWizard } from './RouteCreateWizard';
import { RouteDirectionEditorModal } from '../../../components/admin/map/RouteDirectionEditorModal';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminLineService } from '../../../services/adminLineService';
import { cityService } from '../../../services/cityService';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { STALE_TIMES } from '../../../lib/queryClient';
import { adminKeys } from '../../../lib/queryKeys';

const EMPTY_ROUTES = [];
const EMPTY_LINES = [];
const EMPTY_CITIES = [];

export function RouteListPage() {
  const toast = useAdminToast();
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCityId, setFilterCityId] = useState('');
  const [filterLineId, setFilterLineId] = useState('');

  // Drawer & Modals state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedRouteForMap, setSelectedRouteForMap] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const routesQuery = useQuery({
    queryKey: adminKeys.routes(),
    queryFn: () => adminRouteService.getAllRoutes(),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const linesQuery = useQuery({
    queryKey: adminKeys.lines(),
    queryFn: () => adminLineService.getAllLines(),
    staleTime: STALE_TIMES.CATALOG,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const citiesQuery = useQuery({
    queryKey: adminKeys.cities(),
    queryFn: () => cityService.getAdminCities(),
    staleTime: STALE_TIMES.CATALOG,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const routes = routesQuery.data ?? EMPTY_ROUTES;
  const lines = linesQuery.data ?? EMPTY_LINES;
  const cities = citiesQuery.data ?? EMPTY_CITIES;
  const isFetching =
    routesQuery.isFetching || linesQuery.isFetching || citiesQuery.isFetching;

  const lastErrorAtRef = useRef(0);

  useEffect(() => {
    if (
      routesQuery.isError &&
      routesQuery.errorUpdatedAt > 0 &&
      routesQuery.errorUpdatedAt !== lastErrorAtRef.current
    ) {
      lastErrorAtRef.current = routesQuery.errorUpdatedAt;
      console.error('Error cargando rutas:', routesQuery.error);
      toast.error('Error al cargar la lista de rutas.');
    }
  }, [routesQuery.isError, routesQuery.error, routesQuery.errorUpdatedAt, toast]);

  const handleRefresh = () => {
    Promise.all([
      routesQuery.refetch(),
      linesQuery.refetch(),
      citiesQuery.refetch(),
    ]);
  };

  const handleRouteOrDirectionsSaved = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.stops() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
    ]);
  }, [queryClient]);

  // Line id -> city id lookup (routes inherit the city from their line)
  const lineCityMap = useMemo(() => {
    const map = new Map();
    lines.forEach((l) => map.set(String(l.id), String(l.cityId || '')));
    return map;
  }, [lines]);

  // Lines available for the line filter (scoped to the chosen city)
  const cityScopedLines = useMemo(() => {
    if (!filterCityId) return lines;
    return lines.filter((l) => String(l.cityId) === String(filterCityId));
  }, [lines, filterCityId]);

  // Filtered routes list
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.transportLineName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLine = !filterLineId || String(r.transportLineId) === String(filterLineId);

      const matchesCity =
        !filterCityId ||
        String(lineCityMap.get(String(r.transportLineId)) || '') === String(filterCityId);

      return matchesSearch && matchesLine && matchesCity;
    });
  }, [routes, searchQuery, filterLineId, filterCityId, lineCityMap]);

  const handleCityFilterChange = (nextCityId) => {
    setFilterCityId(nextCityId);
    // Drop the line filter if the line doesn't belong to the chosen city.
    if (
      filterLineId &&
      nextCityId &&
      String(lineCityMap.get(String(filterLineId)) || '') !== String(nextCityId)
    ) {
      setFilterLineId('');
    }
  };

  // City of the route shown in the directions modal (via its line)
  const selectedRouteCityId = useMemo(() => {
    if (!selectedRouteForMap) return '';
    const lineId =
      selectedRouteForMap.transportLineId || selectedRouteForMap.transportLine?.id;
    return lineCityMap.get(String(lineId)) || '';
  }, [selectedRouteForMap, lineCityMap]);

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, data }) => adminRouteService.updateRoute(id, data),
    onSuccess: async (_result, { data }) => {
      toast.success(`Ruta ${data.code} actualizada correctamente.`);
      setDrawerOpen(false);
      setEditingRoute(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error('Error guardando ruta:', err);
      toast.error(err.response?.data?.message || 'Error al guardar los datos de la ruta.');
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (route) => adminRouteService.deleteRoute(route.id),
    onSuccess: async (_result, route) => {
      toast.success(`Ruta ${route.code} eliminada.`);
      setDeleteConfirm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error('Error eliminando ruta:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar la ruta.');
    },
  });

  // Form submit handler (drawer is edit-only; creation goes through the wizard)
  const handleFormSubmit = (formData) => {
    if (!editingRoute) return;
    updateRouteMutation.mutate({ id: editingRoute.id, data: formData });
  };

  // Delete handler
  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    deleteRouteMutation.mutate(deleteConfirm);
  };

  const columns = [
    {
      key: 'code',
      label: 'Código',
      width: '110px',
      render: (r) => (
        <span
          className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-black text-white shadow-xs"
          style={{ backgroundColor: r.color || '#2563eb' }}
        >
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Nombre de Ruta',
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 block">{r.name}</span>
          {r.description && (
            <span className="text-[11px] text-slate-400 line-clamp-1">{r.description}</span>
          )}
        </div>
      ),
    },
    {
      key: 'transportLineName',
      label: 'Línea Concesionada',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-slate-700">
          <Bus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-medium">{r.transportLineName || '—'}</span>
        </div>
      ),
    },
    {
      key: 'fare',
      label: 'Tarifa',
      width: '100px',
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.fare ? `S/ ${r.fare}` : '—'}
        </span>
      ),
    },
    {
      key: 'schedule',
      label: 'Horario / Frec.',
      render: (r) => (
        <div className="text-[11px] text-slate-600">
          <div>{r.schedule || 'Sin horario'}</div>
          {r.frequency && <div className="text-slate-400">{r.frequency}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      width: '110px',
      render: (r) => <StatusBadge status={r.status || 'ACTIVE'} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      sortable: false,
      align: 'right',
      width: '140px',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Edit Trajectory/Directions on Map */}
          <button
            type="button"
            onClick={() => {
              setSelectedRouteForMap(r);
              setMapModalOpen(true);
            }}
            title="Configurar sentidos y paraderos en mapa"
            aria-label="Configurar mapa de ruta"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            <Compass className="h-4 w-4" />
          </button>

          {/* Edit Basic Info */}
          <button
            type="button"
            onClick={() => {
              setEditingRoute(r);
              setDrawerOpen(true);
            }}
            title="Editar datos de ruta"
            aria-label="Editar ruta"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          {/* Delete Route */}
          <button
            type="button"
            onClick={() => setDeleteConfirm(r)}
            title="Eliminar ruta"
            aria-label="Eliminar ruta"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Route className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Rutas de Transporte
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra recorridos, frecuencias, tarifas y la asignación espacial de paraderos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {routesQuery.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No se pudo cargar la lista de rutas.</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            className="inline-flex items-center rounded-xl bg-rose-700 px-3 py-1.5 font-bold text-white hover:bg-rose-800 disabled:opacity-60 transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Filter and Action Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por código, nombre o línea..."
        actionLabel="Nueva Ruta"
        onAction={() => {
          setWizardOpen(true);
        }}
      >
        {/* City filter dropdown */}
        <select
          value={filterCityId}
          onChange={(e) => handleCityFilterChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las ciudades</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {/* Line filter dropdown (scoped to the chosen city) */}
        <select
          value={filterLineId}
          onChange={(e) => setFilterLineId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las líneas</option>
          {cityScopedLines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.company}
            </option>
          ))}
        </select>
      </AdminFilterBar>

      {/* Routes Table */}
      <AdminDataTable
        columns={columns}
        data={filteredRoutes}
        loading={routesQuery.isPending}
        caption="Listado de rutas de transporte"
        emptyTitle="No se encontraron rutas"
        emptyDescription="Crea una nueva ruta o ajusta los filtros de búsqueda."
        emptyActionLabel="Crear Primera Ruta"
        onEmptyAction={() => {
          setWizardOpen(true);
        }}
      />

      {/* Create Wizard (single POST: basics + directions + stops) */}
      {wizardOpen && (
        <RouteCreateWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          lines={lines}
          cities={cities}
          onCreated={handleRouteOrDirectionsSaved}
        />
      )}

      {/* Edit Drawer (basic data only) */}
      <RouteFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingRoute(null);
        }}
        initialData={editingRoute}
        lines={lines}
        cities={cities}
        onSubmit={handleFormSubmit}
        loading={updateRouteMutation.isPending}
      />

      {/* Spatial Directions & Stops Modal */}
      {selectedRouteForMap && (
        <RouteDirectionEditorModal
          open={mapModalOpen}
          onClose={() => {
            setMapModalOpen(false);
            setSelectedRouteForMap(null);
          }}
          route={selectedRouteForMap}
          cities={cities}
          cityId={selectedRouteCityId}
          onSaved={handleRouteOrDirectionsSaved}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Ruta"
        description={`¿Estás seguro de eliminar la ruta "${deleteConfirm?.name}" (${deleteConfirm?.code})? Esta acción borrará también sus sentidos y paraderos asociados.`}
        confirmLabel="Eliminar Definitivamente"
        tone="danger"
        loading={deleteRouteMutation.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default RouteListPage;
