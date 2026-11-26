import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bus,
  Edit2,
  Trash2,
  Building2,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { AdminDataTable } from '../../../components/admin/common/AdminDataTable';
import { AdminFilterBar } from '../../../components/admin/common/AdminFilterBar';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { LineFormDrawer } from './LineFormDrawer';
import { adminLineService } from '../../../services/adminLineService';
import { adminOperatorService } from '../../../services/adminOperatorService';
import { cityService } from '../../../services/cityService';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { useQueryErrorToast } from '../../../hooks/useQueryErrorToast';
import { STALE_TIMES } from '../../../lib/queryClient';
import { adminKeys } from '../../../lib/queryKeys';

const EMPTY_LINES = [];
const EMPTY_CITIES = [];
const EMPTY_OPERATORS = [];

export function LineListPage() {
  const toast = useAdminToast();
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCityId, setFilterCityId] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const operatorsQuery = useQuery({
    queryKey: adminKeys.operators(),
    queryFn: () => adminOperatorService.getAllOperators(),
    staleTime: STALE_TIMES.CATALOG,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const lines = linesQuery.data ?? EMPTY_LINES;
  const cities = citiesQuery.data ?? EMPTY_CITIES;
  const operators = operatorsQuery.data ?? EMPTY_OPERATORS;
  const isFetching =
    linesQuery.isFetching || citiesQuery.isFetching || operatorsQuery.isFetching;

  useQueryErrorToast({
    isError: linesQuery.isError,
    isFetching: linesQuery.isFetching,
    errorUpdatedAt: linesQuery.errorUpdatedAt,
    error: linesQuery.error,
    message: 'Error al cargar la lista de líneas.',
    toast,
    logLabel: 'Error cargando líneas:',
  });

  const handleRefresh = () => {
    Promise.all([
      linesQuery.refetch(),
      citiesQuery.refetch(),
      operatorsQuery.refetch(),
    ]);
  };

  const cityMap = useMemo(() => {
    const map = new Map();
    cities.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [cities]);

  const operatorMap = useMemo(() => {
    const map = new Map();
    operators.forEach((operator) => map.set(String(operator.id), operator.name));
    return map;
  }, [operators]);

  // Filtered lines
  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      const matchesSearch =
        !searchQuery ||
        line.company?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = !filterCityId || String(line.cityId) === String(filterCityId);

      return matchesSearch && matchesCity;
    });
  }, [lines, searchQuery, filterCityId]);

  const saveLineMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? adminLineService.updateLine(id, data) : adminLineService.createLine(data),
    onSuccess: async (_result, { id, data }) => {
      toast.success(
        id
          ? `Línea "${data.company}" actualizada con éxito.`
          : `Línea "${data.company}" creada con éxito.`,
      );
      setDrawerOpen(false);
      setEditingLine(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.lines() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error('Error guardando línea:', err);
      toast.error(err.response?.data?.message || 'Error al guardar los datos de la línea.');
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: (line) => adminLineService.deleteLine(line.id),
    onSuccess: async (_result, line) => {
      toast.success(`Línea "${line.company}" eliminada.`);
      setDeleteConfirm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.lines() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error('Error eliminando línea:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar la línea.');
    },
  });

  const handleFormSubmit = (formData) => {
    saveLineMutation.mutate({
      id: editingLine?.id ?? null,
      data: formData,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    deleteLineMutation.mutate(deleteConfirm);
  };

  const columns = [
    {
      key: 'company',
      label: 'Línea / Empresa',
      render: (line) => (
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: line.color || '#2563eb' }}
          />
          <div>
            <span className="font-bold text-slate-800 block">{line.company}</span>
            {line.description && (
              <span className="text-[11px] text-slate-400 line-clamp-1">{line.description}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'operatorId',
      label: 'Operador',
      width: '160px',
      render: (line) => {
        const operatorName =
          line.operatorName || operatorMap.get(String(line.operatorId));
        return operatorName ? (
          <span className="text-slate-600 font-medium">{operatorName}</span>
        ) : (
          <span className="text-slate-300">Plataforma</span>
        );
      },
    },
    {
      key: 'cityId',
      label: 'Ciudad',
      width: '130px',
      render: (line) => (
        <div className="flex items-center gap-1.5 text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>{cityMap.get(line.cityId) || 'General'}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contacto',
      width: '140px',
      render: (line) =>
        line.contact ? (
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{line.contact}</span>
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'status',
      label: 'Estado',
      width: '110px',
      render: (line) => <StatusBadge status={line.status || 'ACTIVE'} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      sortable: false,
      align: 'right',
      width: '100px',
      render: (line) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditingLine(line);
              setDrawerOpen(true);
            }}
            title="Editar línea"
            aria-label="Editar línea"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(line)}
            title="Eliminar línea"
            aria-label="Eliminar línea"
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
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Bus className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Líneas de Transporte
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestiona empresas operadoras, consorcios, códigos y colores distintivos de flota.
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

      {linesQuery.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No se pudo cargar la lista de líneas.</span>
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
        placeholder="Buscar por código, nombre o empresa..."
        actionLabel="Nueva Línea"
        onAction={() => {
          setEditingLine(null);
          setDrawerOpen(true);
        }}
      >
        <select
          value={filterCityId}
          onChange={(e) => setFilterCityId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las ciudades</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </AdminFilterBar>

      {/* Lines Table */}
      <AdminDataTable
        columns={columns}
        data={filteredLines}
        loading={linesQuery.isPending}
        caption="Listado de líneas de transporte"
        emptyTitle="No se encontraron líneas"
        emptyDescription="Crea una nueva línea de transporte o ajusta la búsqueda."
        emptyActionLabel="Crear Primera Línea"
        onEmptyAction={() => {
          setEditingLine(null);
          setDrawerOpen(true);
        }}
      />

      {/* Create / Edit Drawer */}
      <LineFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingLine(null);
        }}
        initialData={editingLine}
        cities={cities}
        operators={operators}
        loadingOperators={operatorsQuery.isPending}
        onSubmit={handleFormSubmit}
        loading={saveLineMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Línea"
        description={`¿Estás seguro de eliminar la línea "${deleteConfirm?.company}"? Esta acción borrará la línea y afectará a las rutas asociadas.`}
        confirmLabel="Eliminar Línea"
        tone="danger"
        loading={deleteLineMutation.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default LineListPage;
