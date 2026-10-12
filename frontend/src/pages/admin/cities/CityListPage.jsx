import { useState, useEffect, useMemo, useCallback } from 'react';
import {
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

export function CityListPage() {
  const toast = useAdminToast();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cityService.getAdminCities();
      setCities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando ciudades:', err);
      toast.error('Error al cargar la lista de ciudades.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await cityService.getAdminCities();
        if (isMounted) {
          setCities(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error cargando ciudades:', err);
          toast.error('Error al cargar la lista de ciudades.');
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

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

  const handleFormSubmit = async (formData) => {
    setSaving(true);
    try {
      if (editingCity) {
        await cityService.updateCity(editingCity.id, formData);
        toast.success(`Ciudad "${formData.name}" actualizada con éxito.`);
      } else {
        await cityService.createCity(formData);
        toast.success(`Ciudad "${formData.name}" registrada con éxito.`);
      }
      setDrawerOpen(false);
      setEditingCity(null);
      await loadData();
    } catch (err) {
      console.error('Error guardando ciudad:', err);
      toast.error(err.response?.data?.message || 'Error al guardar la ciudad.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await cityService.deleteCity(deleteConfirm.id);
      toast.success(`Ciudad "${deleteConfirm.name}" eliminada.`);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error eliminando ciudad:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar la ciudad.');
    } finally {
      setDeleting(false);
    }
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
            Zonas urbanas y departamentos donde opera el ecosistema de transporte RutaYa.
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
        loading={loading}
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
        loading={saving}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Ciudad"
        description={`¿Estás seguro de eliminar la ciudad "${deleteConfirm?.name}"? Esta acción borrará la ciudad y afectará en cascada a sus líneas y paraderos asociados.`}
        confirmLabel="Eliminar Ciudad"
        tone="danger"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default CityListPage;
