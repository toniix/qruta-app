import { useCallback, useEffect, useState } from 'react';

/**
 * Shared controller hook for Admin and Operator QR detail pages.
 * Handles cancellation-safe detail + stats loading, lazy catalog hydration,
 * and QR metadata updates.
 */
export function useQrDetail({
  id,
  service,
  loadCatalogs,
  initialCatalogs,
  toast,
  loadErrorLog = 'Error cargando detalle del QR:',
}) {
  const [qr, setQr] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogs, setCatalogs] = useState(initialCatalogs);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    async function fetchDetail() {
      try {
        const [qrData, statsData] = await Promise.all([
          service.getById(id),
          service.getStats(id).catch(() => null),
        ]);
        if (cancelled) return;
        setQr(qrData);
        setStats(statsData);
      } catch (err) {
        if (cancelled) return;
        console.error(loadErrorLog, err);
        toast.error('Error al cargar la información del código QR.');
        setQr(null);
        setStats(null);
      } finally {
        if (!cancelled) {
          setLoadedId(id);
        }
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [id, service, toast, loadErrorLog]);

  const openEdit = useCallback(async () => {
    if (!catalogsLoaded && loadCatalogs) {
      try {
        const loaded = await loadCatalogs();
        setCatalogs(loaded);
        setCatalogsLoaded(true);
      } catch (err) {
        console.error('Error cargando catálogos para editar QR:', err);
        toast.error('No se pudieron cargar los catálogos para editar el código QR.');
        return;
      }
    }
    setEditModalOpen(true);
  }, [catalogsLoaded, loadCatalogs, toast]);

  const handleEdit = useCallback(
    async (formData) => {
      const targetId = qr?.id || id;
      if (!targetId) return;

      setSaving(true);
      try {
        const updated = await service.update(targetId, formData);
        setQr(updated);
        setEditModalOpen(false);
        toast.success('Código QR actualizado exitosamente.');
      } catch (err) {
        console.error('Error actualizando QR:', err);
        toast.error(err.response?.data?.message || 'Error al actualizar el código QR.');
      } finally {
        setSaving(false);
      }
    },
    [id, qr?.id, service, toast],
  );

  return {
    qr,
    setQr,
    stats,
    loading: Boolean(id) && loadedId !== id,
    saving,
    setSaving,
    printModalOpen,
    setPrintModalOpen,
    editModalOpen,
    setEditModalOpen,
    catalogs,
    openEdit,
    handleEdit,
  };
}
