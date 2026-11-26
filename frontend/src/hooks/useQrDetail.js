import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { STALE_TIMES } from '../lib/queryClient';
import { useQueryErrorToast } from './useQueryErrorToast';

/**
 * Shared controller hook for Admin and Operator QR detail pages.
 * Handles cached detail + stats loading, lazy catalog hydration,
 * and QR metadata updates via TanStack Query.
 */
export function useQrDetail({
  id,
  service,
  detailQueryKey,
  statsQueryKey,
  listQueryKey,
  loadCatalogs,
  initialCatalogs,
  toast,
  loadErrorLog = 'Error cargando detalle del QR:',
  errorLogLabel,
}) {
  const queryClient = useQueryClient();
  const resolvedErrorLog = errorLogLabel ?? loadErrorLog;

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [catalogs, setCatalogs] = useState(initialCatalogs);

  const detailQuery = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => service.getById(id),
    enabled: Boolean(id),
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const statsQuery = useQuery({
    queryKey: statsQueryKey,
    queryFn: () => service.getStats(id).catch(() => null),
    enabled: Boolean(id),
    staleTime: STALE_TIMES.METRICS,
  });

  useQueryErrorToast({
    isError: detailQuery.isError,
    isFetching: detailQuery.isFetching,
    errorUpdatedAt: detailQuery.errorUpdatedAt,
    error: detailQuery.error,
    message: 'Error al cargar la información del código QR.',
    toast,
    logLabel: resolvedErrorLog,
  });

  const qr = detailQuery.data ?? null;
  const stats = statsQuery.data ?? null;

  const setQr = useCallback(
    (nextQr) => {
      queryClient.setQueryData(detailQueryKey, nextQr);
    },
    [queryClient, detailQueryKey],
  );

  const openEdit = useCallback(async () => {
    if (loadCatalogs) {
      try {
        const loaded = await loadCatalogs(queryClient);
        setCatalogs(loaded);
      } catch (err) {
        console.error('Error cargando catálogos para editar QR:', err);
        toast.error('No se pudieron cargar los catálogos para editar el código QR.');
        return;
      }
    }
    setEditModalOpen(true);
  }, [loadCatalogs, queryClient, toast]);

  const editMutation = useMutation({
    mutationFn: ({ targetId, formData }) => service.update(targetId, formData),
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailQueryKey, updated);
      setEditModalOpen(false);
      toast.success('Código QR actualizado exitosamente.');
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
      ];
      if (listQueryKey) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: listQueryKey }));
      }
      await Promise.all(invalidations);
    },
    onError: (err) => {
      console.error('Error actualizando QR:', err);
      toast.error(err.response?.data?.message || 'Error al actualizar el código QR.');
    },
  });

  const { mutate: mutateEdit } = editMutation;

  const handleEdit = useCallback(
    (formData) => {
      const targetId = qr?.id || id;
      if (!targetId) return;
      mutateEdit({ targetId, formData });
    },
    [id, mutateEdit, qr?.id],
  );

  return {
    qr,
    setQr,
    stats,
    loading: Boolean(id) && detailQuery.isPending,
    saving: editMutation.isPending,
    printModalOpen,
    setPrintModalOpen,
    editModalOpen,
    setEditModalOpen,
    catalogs,
    openEdit,
    handleEdit,
  };
}
