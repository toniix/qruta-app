import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, MapPin, Edit2, Trash2, RefreshCw } from "lucide-react";
import { AdminDataTable } from "../../../components/admin/common/AdminDataTable";
import { AdminFilterBar } from "../../../components/admin/common/AdminFilterBar";
import { AccessibleBadge } from "../../../components/admin/common/StatusBadge";
import { ConfirmDialog } from "../../../components/admin/common/ConfirmDialog";
import { StopFormDrawer } from "./StopFormDrawer";
import { adminStopService } from "../../../services/adminStopService";
import { cityService } from "../../../services/cityService";
import { useAdminToast } from "../../../hooks/useAdminToast";
import { calculateDistanceKm } from "../../../utils/geoUtils";
import { STALE_TIMES } from "../../../lib/queryClient";
import { adminKeys } from "../../../lib/queryKeys";

const EMPTY_STOPS = [];
const EMPTY_CITIES = [];

export function StopListPage() {
  const toast = useAdminToast();
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCityId, setFilterCityId] = useState("");

  // Drawer & Delete state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const stopsQuery = useQuery({
    queryKey: adminKeys.stops(),
    queryFn: () => adminStopService.getAllStops(),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const citiesQuery = useQuery({
    queryKey: adminKeys.cities(),
    queryFn: () => cityService.getAdminCities(),
    staleTime: STALE_TIMES.CATALOG,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const stops = stopsQuery.data ?? EMPTY_STOPS;
  const cities = citiesQuery.data ?? EMPTY_CITIES;
  const isFetching = stopsQuery.isFetching || citiesQuery.isFetching;

  const lastErrorAtRef = useRef(0);

  useEffect(() => {
    if (
      stopsQuery.isError &&
      stopsQuery.errorUpdatedAt > 0 &&
      stopsQuery.errorUpdatedAt !== lastErrorAtRef.current
    ) {
      lastErrorAtRef.current = stopsQuery.errorUpdatedAt;
      console.error("Error cargando paraderos:", stopsQuery.error);
      toast.error("Error al cargar la lista de paraderos.");
    }
  }, [stopsQuery.isError, stopsQuery.error, stopsQuery.errorUpdatedAt, toast]);

  const handleRefresh = () => {
    Promise.all([stopsQuery.refetch(), citiesQuery.refetch()]);
  };

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

  const saveStopMutation = useMutation({
    mutationFn: async ({ editingStop: targetStop, formData }) => {
      // imageFile/removeImage are UI-only fields for the reference image step.
      const { imageFile, removeImage, ...stopFields } = formData;
      const savedStop = targetStop
        ? await adminStopService.updateStop(targetStop.id, stopFields)
        : await adminStopService.createStop(stopFields);

      // Saving the stop and its image are two separate operations: a failure
      // in the image step must NOT roll back the already-saved stop.
      const stopId = savedStop?.id || targetStop?.id;
      const hadImage = Boolean(targetStop?.imageUrl);
      let imageError = null;
      try {
        if (imageFile && stopId) {
          await adminStopService.uploadStopImage(stopId, imageFile);
        } else if (removeImage && hadImage && stopId) {
          await adminStopService.removeStopImage(stopId);
        }
      } catch (err) {
        console.error("Error guardando la imagen del paradero:", err);
        imageError = err;
      }

      return { savedStop, stopFields, imageError };
    },
    onSuccess: async ({ stopFields, imageError }, { editingStop: targetStop }) => {
      if (imageError) {
        toast.warning("Paradero guardado, pero la imagen no se pudo subir.");
      }
      toast.success(
        targetStop
          ? `Paradero "${stopFields.name}" actualizado.`
          : `Paradero "${stopFields.name}" creado con éxito.`,
      );
      setDrawerOpen(false);
      setEditingStop(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.stops() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error("Error guardando paradero:", err);
      toast.error(
        err.response?.data?.message ||
          "Error al guardar los datos del paradero.",
      );
    },
  });

  const deleteStopMutation = useMutation({
    mutationFn: (stop) => adminStopService.deleteStop(stop.id),
    onSuccess: async (_result, stop) => {
      toast.success(`Paradero "${stop.name}" eliminado.`);
      setDeleteConfirm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.stops() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.routes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
    onError: (err) => {
      console.error("Error eliminando paradero:", err);
      toast.error(
        err.response?.data?.message || "Error al eliminar el paradero.",
      );
    },
  });

  const handleFormSubmit = (formData) => {
    saveStopMutation.mutate({ editingStop, formData });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    deleteStopMutation.mutate(deleteConfirm);
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
          onClick={handleRefresh}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
          <span>Actualizar</span>
        </button>
      </div>

      {stopsQuery.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No se pudo cargar la lista de paraderos.</span>
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
        loading={stopsQuery.isPending}
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
        loading={saveStopMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Paradero"
        description={`¿Estás seguro de eliminar el paradero "${deleteConfirm?.name}"? Esta acción no se puede deshacer y retirará el punto de las rutas que lo utilicen.`}
        confirmLabel="Eliminar Paradero"
        tone="danger"
        loading={deleteStopMutation.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default StopListPage;
