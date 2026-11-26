import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { AdminDataTable } from '../../../components/admin/common/AdminDataTable';
import { AdminFilterBar } from '../../../components/admin/common/AdminFilterBar';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { CityFormDrawer } from './CityFormDrawer';
import { cityService } from '../../../services/cityService';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { useQueryErrorToast } from '../../../hooks/useQueryErrorToast';
import { STALE_TIMES } from '../../../lib/queryClient';
import { adminKeys } from '../../../lib/queryKeys';

const EMPTY_CITIES = [];

export function CityListPage() {
  const toast = useAdminToast();
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const {
    data: cities = EMPTY_CITIES,
    isPending,
    isFetching,
    isError,
    error,
    errorUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: adminKeys.cities(),
    queryFn: () => cityService.getAdminCities(),
    staleTime: STALE_TIMES.CATALOG,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  useQueryErrorToast({
    isError,
    isFetching,
    errorUpdatedAt,
    error,
    message: 'Error al cargar la lista de ciudades.',
    toast,
    logLabel: 'Error cargando ciudades:',
  });

  const filteredCities = useMemo(() => {
    return cities.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.department?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q)
      );
    });
  }, [cities, searchQuery]);

  const saveCityMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? cityService.updateCity(id, data) : cityService.createCity(data),
    onSuccess: async (_result, { id, data }) => {
      toast.success(
        id
          ? `Ciudad "${data.name}" actualizada con éxito.`
          : `Ciudad "${data.name}" registrada con éxito.`,
      );
      setDrawerOpen(false);
      setEditingCity(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.cities() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error('Error guardando ciudad:', err);
      toast.error(err.response?.data?.message || 'Error al guardar la ciudad.');
    },
  });

  const deleteCityMutation = useMutation({
    mutationFn: (city) => cityService.deleteCity(city.id),
    onSuccess: async (_result, city) => {
      toast.success(`Ciudad "${city.name}" eliminada.`);
      setDeleteConfirm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.cities() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.lines() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.stops() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error('Error eliminando ciudad:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar la ciudad.');
    },
  });

  const handleFormSubmit = (formData) => {
    saveCityMutation.mutate({
      id: editingCity?.id ?? null,
      data: formData,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    deleteCityMutation.mutate(deleteConfirm);
  };

  const columns = [
    {
      key: 'name',
      label: 'Ciudad',
      render: (city) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="font-bold text-slate-900 text-sm">{city.name}</span>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Departamento',
      render: (city) => (
        <span className="font-semibold text-slate-700">{city.department}</span>
      ),
    },
    {
      key: 'country',
      label: 'País',
      width: '120px',
      render: (city) => (
        <span className="text-slate-600">{city.country || 'Perú'}</span>
      ),
    },
    {
      key: 'latitude',
      label: 'Coordenadas Centro',
      render: (city) => (
        <div className="font-mono text-[11px] text-slate-600">
          <div>Lat: {city.latitude != null ? Number(city.latitude).toFixed(4) : '—'}</div>
          <div>Lng: {city.longitude != null ? Number(city.longitude).toFixed(4) : '—'}</div>
        </div>
      ),
    },
    {
      key: 'radiusKm',
      label: 'Radio Cobertura',
      width: '140px',
      render: (city) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {city.radiusKm || 30} km
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      sortable: false,
      align: 'right',
      width: '100px',
      render: (city) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditingCity(city);
              setDrawerOpen(true);
            }}
            title="Editar ciudad"
            aria-label="Editar ciudad"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(city)}
            title="Eliminar ciudad"
            aria-label="Eliminar ciudad"
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
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Building2 className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Ciudades de Cobertura
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Zonas urbanas y departamentos donde opera el ecosistema de transporte QRuta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No se pudo cargar la lista de ciudades.</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
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
        placeholder="Buscar por ciudad, departamento o país..."
        actionLabel="Nueva Ciudad"
        onAction={() => {
          setEditingCity(null);
          setDrawerOpen(true);
        }}
      />

      {/* Cities Table */}
      <AdminDataTable
        columns={columns}
        data={filteredCities}
        loading={isPending}
        caption="Listado de ciudades registradas"
        emptyTitle="No se encontraron ciudades"
        emptyDescription="Registra una nueva ciudad o ajusta los términos de búsqueda."
        emptyActionLabel="Registrar Primera Ciudad"
        onEmptyAction={() => {
          setEditingCity(null);
          setDrawerOpen(true);
        }}
      />

      {/* Create / Edit Drawer */}
      <CityFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingCity(null);
        }}
        initialData={editingCity}
        onSubmit={handleFormSubmit}
        loading={saveCityMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Ciudad"
        description={`¿Estás seguro de eliminar la ciudad "${deleteConfirm?.name}"? Esta acción borrará la ciudad y afectará en cascada a sus líneas y paraderos asociados.`}
        confirmLabel="Eliminar Ciudad"
        tone="danger"
        loading={deleteCityMutation.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default CityListPage;
