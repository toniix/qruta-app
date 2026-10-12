import { useState, useEffect, useMemo, useCallback } from 'react';
import {
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
import { RouteDirectionEditorModal } from '../../../components/admin/map/RouteDirectionEditorModal';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminLineService } from '../../../services/adminLineService';
import { useAdminToast } from '../../../hooks/useAdminToast';

export function RouteListPage() {
  const toast = useAdminToast();
  const [routes, setRoutes] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLineId, setFilterLineId] = useState('');

  // Drawer & Modals state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [saving, setSaving] = useState(false);

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedRouteForMap, setSelectedRouteForMap] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [routesData, linesData] = await Promise.all([
        adminRouteService.getAllRoutes(),
        adminLineService.getAllLines(),
      ]);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setLines(Array.isArray(linesData) ? linesData : []);
    } catch (err) {
      console.error('Error cargando rutas:', err);
      toast.error('Error al cargar la lista de rutas.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [routesData, linesData] = await Promise.all([
          adminRouteService.getAllRoutes(),
          adminLineService.getAllLines(),
        ]);
        if (isMounted) {
          setRoutes(Array.isArray(routesData) ? routesData : []);
          setLines(Array.isArray(linesData) ? linesData : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error cargando rutas:', err);
          toast.error('Error al cargar la lista de rutas.');
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  // Filtered routes list
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.transportLineName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLine = !filterLineId || String(r.transportLineId) === String(filterLineId);

      return matchesSearch && matchesLine;
    });
  }, [routes, searchQuery, filterLineId]);

  // Form submit handler
  const handleFormSubmit = async (formData) => {
    setSaving(true);
    try {
      if (editingRoute) {
        await adminRouteService.updateRoute(editingRoute.id, formData);
        toast.success(`Ruta ${formData.code} actualizada correctamente.`);
      } else {
        await adminRouteService.createRoute(formData);
        toast.success(`Ruta ${formData.code} creada con éxito.`);
      }
      setDrawerOpen(false);
      setEditingRoute(null);
      await loadData();
    } catch (err) {
      console.error('Error guardando ruta:', err);
      toast.error(err.response?.data?.message || 'Error al guardar los datos de la ruta.');
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminRouteService.deleteRoute(deleteConfirm.id);
      toast.success(`Ruta ${deleteConfirm.code} eliminada.`);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error eliminando ruta:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar la ruta.');
    } finally {
      setDeleting(false);
    }
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
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filter and Action Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por código, nombre o línea..."
        actionLabel="Nueva Ruta"
        onAction={() => {
          setEditingRoute(null);
          setDrawerOpen(true);
        }}
      >
        {/* Line filter dropdown */}
        <select
          value={filterLineId}
          onChange={(e) => setFilterLineId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las líneas</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </AdminFilterBar>

      {/* Routes Table */}
      <AdminDataTable
        columns={columns}
        data={filteredRoutes}
        loading={loading}
        caption="Listado de rutas de transporte"
        emptyTitle="No se encontraron rutas"
        emptyDescription="Crea una nueva ruta o ajusta los filtros de búsqueda."
        emptyActionLabel="Crear Primera Ruta"
        onEmptyAction={() => {
          setEditingRoute(null);
          setDrawerOpen(true);
        }}
      />

      {/* Create / Edit Drawer */}
      <RouteFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingRoute(null);
        }}
        initialData={editingRoute}
        lines={lines}
        onSubmit={handleFormSubmit}
        loading={saving}
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
          onSaved={loadData}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Ruta"
        description={`¿Estás seguro de eliminar la ruta "${deleteConfirm?.name}" (${deleteConfirm?.code})? Esta acción borrará también sus sentidos y paraderos asociados.`}
        confirmLabel="Eliminar Definitivamente"
        tone="danger"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default RouteListPage;
