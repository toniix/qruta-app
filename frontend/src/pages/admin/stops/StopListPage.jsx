import { useState, useEffect, useMemo, useCallback } from "react";
import { MapPin, Edit2, Trash2, RefreshCw } from "lucide-react";
import { AdminDataTable } from "../../../components/admin/common/AdminDataTable";
import { AdminFilterBar } from "../../../components/admin/common/AdminFilterBar";
import { AccessibleBadge } from "../../../components/admin/common/StatusBadge";
import { ConfirmDialog } from "../../../components/admin/common/ConfirmDialog";
import { StopFormDrawer } from "./StopFormDrawer";
import { adminStopService } from "../../../services/adminStopService";
import { cityService } from "../../../services/cityService";
import { useAdminToast } from "../../../hooks/useAdminToast";

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function StopListPage() {
  const toast = useAdminToast();
  const [stops, setStops] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCityId, setFilterCityId] = useState("");

  // Drawer & Delete state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stopsData, citiesData] = await Promise.all([
        adminStopService.getAllStops(),
        cityService.getAdminCities().catch(() => []),
      ]);
      setStops(Array.isArray(stopsData) ? stopsData : []);
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (err) {
      console.error("Error cargando paraderos:", err);
      toast.error("Error al cargar la lista de paraderos.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [stopsData, citiesData] = await Promise.all([
          adminStopService.getAllStops(),
          cityService.getAdminCities().catch(() => []),
        ]);
        if (isMounted) {
          setStops(Array.isArray(stopsData) ? stopsData : []);
          setCities(Array.isArray(citiesData) ? citiesData : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error cargando paraderos:", err);
          toast.error("Error al cargar la lista de paraderos.");
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const filteredStops = useMemo(() => {
    const selectedCity = cities.find(
      (c) => String(c.id) === String(filterCityId),
    );

    return stops.filter((stop) => {
      const matchesSearch =
        !searchQuery ||
        stop.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.reference?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (!filterCityId) return true;

      // 1. Direct cityId match (from backend)
      if (stop.cityId) {
        return String(stop.cityId) === String(filterCityId);
      }

      // 2. Geographic fallback against city coverage
      if (
        selectedCity &&
        selectedCity.latitude != null &&
        selectedCity.longitude != null &&
        stop.latitude != null &&
        stop.longitude != null
      ) {
        const distKm = calculateDistanceKm(
          Number(stop.latitude),
          Number(stop.longitude),
          Number(selectedCity.latitude),
          Number(selectedCity.longitude),
        );
        return distKm <= (Number(selectedCity.radiusKm) || 30);
      }

      return false;
    });
  }, [stops, searchQuery, filterCityId, cities]);

  const handleFormSubmit = async (formData) => {
    // imageFile/removeImage are UI-only fields for the reference image step.
    const { imageFile, removeImage, ...stopFields } = formData;
    setSaving(true);
    try {
      let savedStop;
      if (editingStop) {
        savedStop = await adminStopService.updateStop(
          editingStop.id,
          stopFields,
        );
      } else {
        savedStop = await adminStopService.createStop(stopFields);
      }

      // Saving the stop and its image are two separate operations: a failure
      // in the image step must NOT roll back the already-saved stop.
      const stopId = savedStop?.id || editingStop?.id;
      const hadImage = Boolean(editingStop?.imageUrl);
      try {
        if (imageFile && stopId) {
          console.log(
            "Uploading stop image for stopId:",
            stopId,
            "file:",
            imageFile,
          );
          await adminStopService.uploadStopImage(stopId, imageFile);
        } else if (removeImage && hadImage && stopId) {
          await adminStopService.removeStopImage(stopId);
        }
      } catch (imageErr) {
        console.error("Error guardando la imagen del paradero:", imageErr);
        toast.warning("Paradero guardado, pero la imagen no se pudo subir.");
      }

      toast.success(
        editingStop
          ? `Paradero "${stopFields.name}" actualizado.`
          : `Paradero "${stopFields.name}" creado con éxito.`,
      );
      setDrawerOpen(false);
      setEditingStop(null);
      await loadData();
    } catch (err) {
      console.error("Error guardando paradero:", err);
      toast.error(
        err.response?.data?.message ||
          "Error al guardar los datos del paradero.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminStopService.deleteStop(deleteConfirm.id);
      toast.success(`Paradero "${deleteConfirm.name}" eliminado.`);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error("Error eliminando paradero:", err);
      toast.error(
        err.response?.data?.message || "Error al eliminar el paradero.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Paradero",
      render: (stop) => (
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mt-0.5">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <span className="font-bold text-slate-900 block">{stop.name}</span>
            {stop.reference && (
              <span className="text-[11px] text-slate-500 line-clamp-1">
                Ref: {stop.reference}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      label: "Ciudad",
      width: "130px",
      render: (stop) => {
        const city = cities.find((c) => String(c.id) === String(stop.cityId));
        const cityName = stop.cityName || city?.name;
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
            {cityName || "—"}
          </span>
        );
      },
    },
    {
      key: "address",
      label: "Dirección",
      render: (stop) => (
        <span className="text-slate-600 text-xs">{stop.address || "—"}</span>
      ),
    },
    {
      key: "latitude",
      label: "Coordenadas",
      width: "180px",
      render: (stop) => (
        <div className="font-mono text-[11px] text-slate-600">
          <div>
            Lat:{" "}
            {stop.latitude != null ? Number(stop.latitude).toFixed(5) : "—"}
          </div>
          <div>
            Lng:{" "}
            {stop.longitude != null ? Number(stop.longitude).toFixed(5) : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "accessible",
      label: "Accesibilidad",
      width: "120px",
      render: (stop) => (
        <AccessibleBadge accessible={stop.accessible ?? stop.isAccessible} />
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      sortable: false,
      align: "right",
      width: "100px",
      render: (stop) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditingStop(stop);
              setDrawerOpen(true);
            }}
            title="Editar paradero"
            aria-label="Editar paradero"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(stop)}
            title="Eliminar paradero"
            aria-label="Eliminar paradero"
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
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <MapPin className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Paraderos Georreferenciados
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Puntos de abordaje y transbordo con coordenadas geográficas y
            condiciones de accesibilidad.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filter and Action Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por nombre, dirección o referencia..."
        actionLabel="Nuevo Paradero"
        onAction={() => {
          setEditingStop(null);
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

      {/* Stops Table */}
      <AdminDataTable
        columns={columns}
        data={filteredStops}
        loading={loading}
        caption="Listado de paraderos registrados"
        emptyTitle="No se encontraron paraderos"
        emptyDescription="Crea un nuevo paradero con ayuda del mapa interactivo."
        emptyActionLabel="Crear Primer Paradero"
        onEmptyAction={() => {
          setEditingStop(null);
          setDrawerOpen(true);
        }}
      />

      {/* Create / Edit Drawer */}
      <StopFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingStop(null);
        }}
        initialData={editingStop}
        cities={cities}
        onSubmit={handleFormSubmit}
        loading={saving}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Paradero"
        description={`¿Estás seguro de eliminar el paradero "${deleteConfirm?.name}"? Esta acción no se puede deshacer y retirará el punto de las rutas que lo utilicen.`}
        confirmLabel="Eliminar Paradero"
        tone="danger"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default StopListPage;
