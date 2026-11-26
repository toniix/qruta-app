import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  Copy,
  Check,
  Pause,
  Play,
  Edit2,
  Trash2,
} from 'lucide-react';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { QrCodeSvg } from '../../../components/common/QrCodeSvg';
import { QrPrintModal } from '../../../components/admin/qr/QrPrintModal';
import { QrFormModal } from '../../../components/admin/qr/QrFormModal';
import { adminQrCodeService } from '../../../services/qrCodeService';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';
import { adminOperatorService } from '../../../services/adminOperatorService';
import { adminLineService } from '../../../services/adminLineService';
import { cityService } from '../../../services/cityService';
import { resolveAbsoluteQrUrl } from '../../../utils/qrGenerator';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { useQrDetail } from '../../../hooks/useQrDetail';
import { STALE_TIMES } from '../../../lib/queryClient';
import { adminKeys } from '../../../lib/queryKeys';

const INITIAL_CATALOGS = {
  routes: [],
  stops: [],
  operators: [],
  cities: [],
  lines: [],
};

async function loadAdminQrCatalogs(queryClient) {
  const [routesData, stopsData, operatorsData, citiesData, linesData] =
    await Promise.all([
      queryClient.fetchQuery({
        queryKey: adminKeys.routes(),
        queryFn: () => adminRouteService.getAllRoutes(),
        staleTime: STALE_TIMES.OPERATIONAL,
      }),
      queryClient.fetchQuery({
        queryKey: adminKeys.stops(),
        queryFn: () => adminStopService.getAllStops(),
        staleTime: STALE_TIMES.OPERATIONAL,
      }),
      queryClient.fetchQuery({
        queryKey: adminKeys.operators(),
        queryFn: () => adminOperatorService.getAllOperators(),
        staleTime: STALE_TIMES.CATALOG,
      }),
      queryClient.fetchQuery({
        queryKey: adminKeys.cities(),
        queryFn: () => cityService.getAdminCities(),
        staleTime: STALE_TIMES.CATALOG,
      }),
      queryClient.fetchQuery({
        queryKey: adminKeys.lines(),
        queryFn: () => adminLineService.getAllLines(),
        staleTime: STALE_TIMES.CATALOG,
      }),
    ]);

  return {
    routes: Array.isArray(routesData) ? routesData : [],
    stops: Array.isArray(stopsData) ? stopsData : [],
    operators: Array.isArray(operatorsData) ? operatorsData : [],
    cities: Array.isArray(citiesData) ? citiesData : [],
    lines: Array.isArray(linesData) ? linesData : [],
  };
}

export function AdminQrDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const { copied, copy } = useCopyToClipboard();

  const detailQueryKey = useMemo(() => adminKeys.qrDetail(id), [id]);
  const statsQueryKey = useMemo(() => adminKeys.qrStats(id), [id]);
  const listQueryKey = useMemo(() => adminKeys.qrCodes(), []);

  const {
    qr,
    stats,
    loading,
    saving,
    printModalOpen,
    setPrintModalOpen,
    editModalOpen,
    setEditModalOpen,
    catalogs,
    openEdit,
    handleEdit,
  } = useQrDetail({
    id,
    service: adminQrCodeService,
    detailQueryKey,
    statsQueryKey,
    listQueryKey,
    loadCatalogs: loadAdminQrCatalogs,
    initialCatalogs: INITIAL_CATALOGS,
    toast,
    loadErrorLog: 'Error cargando detalle del QR:',
  });
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleCopyUrl = () => {
    if (!qr) return;
    const url = qr.canonicalUrl || `${window.location.origin}/q/${qr.code}`;
    void copy(url);
  };

  const deleteMutation = useMutation({
    mutationFn: () => adminQrCodeService.delete(id),
    onSuccess: async () => {
      setDeleteConfirm(false);
      toast.success('Código QR eliminado exitosamente.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.qrCodes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.qrDetail(id) }),
      ]);
      navigate('/admin/qr-codes');
    },
    onError: (err) => {
      console.error('Error eliminando QR:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar el código QR.');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (newStatus) => adminQrCodeService.update(qr.id, { status: newStatus }),
    onSuccess: async (updated, newStatus) => {
      queryClient.setQueryData(adminKeys.qrDetail(id), updated);
      toast.success(`Código QR marcado como ${newStatus}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.qrCodes() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.qrDetail(id) }),
      ]);
    },
    onError: (err) => {
      console.error('Error actualizando estado:', err);
      toast.error('Error al actualizar el estado del código QR.');
    },
    onSettled: () => {
      setStatusConfirm(null);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleToggleStatus = (newStatus) => {
    toggleStatusMutation.mutate(newStatus);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Código QR no encontrado</p>
        <Link to="/admin/qr-codes" className="mt-3 inline-block text-xs font-bold text-blue-600">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const qrUrl = resolveAbsoluteQrUrl(qr);
  const totalScans = stats?.totalScans || qr.totalScans || 0;
  const effectiveViews = stats?.effectiveViews || 0;
  const ctrPercent = totalScans > 0 ? Math.min(100, Math.round((effectiveViews / totalScans) * 100)) : 0;

  // Daily scans line calculation
  const dailyScans = stats?.dailyScans || [];
  const maxDayScans = Math.max(1, ...dailyScans.map((d) => d.scans));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/qr-codes"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {qr.code}
              </span>
              <StatusBadge
                status={qr.status}
                activeLabel="Activo"
                inactiveLabel="Pausado"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {qr.label}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir Lámina</span>
          </button>
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar QR</span>
          </button>
          {qr.status === 'ACTIVE' ? (
            <button
              type="button"
              onClick={() =>
                setStatusConfirm({
                  newStatus: 'PAUSED',
                  description: '¿Deseas pausar este código QR? Los escaneos futuros mostrarán un aviso y no abrirán el destino.',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pausar</span>
            </button>
          ) : qr.status === 'PAUSED' ? (
            <button
              type="button"
              onClick={() => handleToggleStatus('ACTIVE')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Reactivar</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Escaneos Registrados
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 font-mono">
            {new Intl.NumberFormat('es-PE').format(totalScans)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Solicitudes válidas al endpoint /q/{qr.code}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Vistas Efectivas del Destino
          </p>
          <p className="mt-1 text-2xl font-black text-blue-600 font-mono">
            {new Intl.NumberFormat('es-PE').format(effectiveViews)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Carga y renderizado completado del destino
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Conversión Contextual Aprox.
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-600 font-mono">
            {ctrPercent}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Vistas efectivas sobre total de escaneos
          </p>
        </div>
      </div>

      {/* Main Grid: Details & Visual preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: metadata & evolution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Resource Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Configuración de Destino
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 uppercase text-[10px] font-bold">Tipo de Destino</p>
                <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                  {qr.targetType}
                </span>
              </div>
              <div>
                <p className="text-slate-400 uppercase text-[10px] font-bold">Recurso Asociado</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {qr.targetTitle || 'Inicio QRuta'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 uppercase text-[10px] font-bold">Operador Responsable</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {qr.operatorName || 'Administración Global QRuta'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 uppercase text-[10px] font-bold">Parámetros de Campaña</p>
                <p className="mt-1 text-slate-700">
                  {qr.campaignSource ? (
                    <>
                      <span className="font-semibold">{qr.campaignSource}</span> /{' '}
                      {qr.campaignMedium || 'general'} ({qr.campaignName || 'sin nombre'})
                    </>
                  ) : (
                    'Sin campaña configurada'
                  )}
                </p>
              </div>
            </div>

            {/* Public URL copy bar */}
            <div className="pt-2">
              <p className="text-slate-400 uppercase text-[10px] font-bold mb-1">
                URL Pública Canónica
              </p>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="truncate font-mono text-slate-700">{qrUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Daily Evolution Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Evolución de Escaneos por Día
              </h3>
              <span className="text-[10px] text-slate-400">Zona horaria: America/Lima</span>
            </div>

            {dailyScans.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Aún no hay escaneos registrados para este código QR.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="h-40 flex items-end gap-2 pt-6">
                  {dailyScans.map((d, i) => {
                    const heightPercent = Math.max(8, Math.round((d.scans / maxDayScans) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-blue-600 rounded-t-lg transition-all group-hover:bg-blue-700"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] text-slate-400 rotate-45 origin-left truncate">
                          {d.date}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                          {d.scans} escaneos
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right col: QR card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card flex flex-col items-center text-center space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Lámina Rápida</h3>

          <div className="w-52 h-52 bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm flex items-center justify-center">
            <QrCodeSvg
              value={qrUrl}
              margin={1}
              label={qr.label ? `Código QR para ${qr.label}` : 'Código QR'}
            />
          </div>

          <p className="text-xs font-bold text-slate-900 line-clamp-1">{qr.label}</p>
          <p className="text-[11px] text-slate-500 font-mono">/q/{qr.code}</p>

          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir Lámina Completa</span>
          </button>
        </div>
      </div>

      <QrPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        qr={qr}
      />

      <QrFormModal
        open={editModalOpen}
        initialData={qr}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEdit}
        saving={saving}
        routes={catalogs.routes}
        stops={catalogs.stops}
        operators={catalogs.operators}
        cities={catalogs.cities}
        lines={catalogs.lines}
        isOperator={false}
      />

      <ConfirmDialog
        open={Boolean(statusConfirm)}
        title="Cambiar Estado de Código QR"
        description={statusConfirm?.description}
        confirmLabel="Confirmar"
        tone="warning"
        loading={toggleStatusMutation.isPending}
        onConfirm={() => handleToggleStatus(statusConfirm.newStatus)}
        onCancel={() => setStatusConfirm(null)}
      />

      <ConfirmDialog
        open={deleteConfirm}
        title="Eliminar Código QR"
        description={`¿Eliminar definitivamente el código QR "${qr.label}"? Sus eventos de escaneo se conservarán.`}
        confirmLabel="Eliminar Código"
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

export default AdminQrDetailPage;
