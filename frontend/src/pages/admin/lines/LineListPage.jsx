import { useState, useEffect, useMemo, useCallback } from 'react';
import {
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
import { cityService } from '../../../services/cityService';
import { useAdminToast } from '../../../hooks/useAdminToast';

export function LineListPage() {
  const toast = useAdminToast();
  const [lines, setLines] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCityId, setFilterCityId] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [linesData, citiesData] = await Promise.all([
        adminLineService.getAllLines(),
        cityService.getAdminCities().catch(() => []),
      ]);
      setLines(Array.isArray(linesData) ? linesData : []);
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (err) {
      console.error('Error cargando líneas:', err);
      toast.error('Error al cargar la lista de líneas.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [linesData, citiesData] = await Promise.all([
          adminLineService.getAllLines(),
          cityService.getAdminCities().catch(() => []),
        ]);
        if (isMounted) {
          setLines(Array.isArray(linesData) ? linesData : []);
          setCities(Array.isArray(citiesData) ? citiesData : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error cargando líneas:', err);
          toast.error('Error al cargar la lista de líneas.');
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const cityMap = useMemo(() => {
    const map = new Map();
    cities.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [cities]);

  // Filtered lines
  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      const matchesSearch =
        !searchQuery ||
        line.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.company?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = !filterCityId || String(line.cityId) === String(filterCityId);

      return matchesSearch && matchesCity;
    });
  }, [lines, searchQuery, filterCityId]);

  const handleFormSubmit = async (formData) => {
    setSaving(true);
    try {
      if (editingLine) {
        await adminLineService.updateLine(editingLine.id, formData);
        toast.success(`Línea "${formData.name}" actualizada con éxito.`);
      } else {
        await adminLineService.createLine(formData);
        toast.success(`Línea "${formData.name}" creada con éxito.`);
      }
      setDrawerOpen(false);
      setEditingLine(null);
      await loadData();
    } catch (err) {
      console.error('Error guardando línea:', err);
      toast.error(err.response?.data?.message || 'Error al guardar los datos de la línea.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminLineService.deleteLine(deleteConfirm.id);
      toast.success(`Línea "${deleteConfirm.name}" eliminada.`);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error eliminando línea:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar la línea.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'code',
      label: 'Línea',
      width: '130px',
      render: (line) => (
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: line.color || '#2563eb' }}
          />
          <span className="font-bold text-slate-900">{line.code || '—'}</span>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Nombre de Línea',
      render: (line) => (
        <div>
          <span className="font-bold text-slate-800 block">{line.name}</span>
          {line.description && (
            <span className="text-[11px] text-slate-400 line-clamp-1">{line.description}</span>
          )}
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Empresa / Consorcio',
      render: (line) => (
        <span className="text-slate-600 font-medium">{line.company || '—'}</span>
      ),
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
        loading={loading}
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
        onSubmit={handleFormSubmit}
        loading={saving}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Línea"
        description={`¿Estás seguro de eliminar la línea "${deleteConfirm?.name}"? Esta acción borrará la línea y afectará a las rutas asociadas.`}
        confirmLabel="Eliminar Línea"
        tone="danger"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default LineListPage;
