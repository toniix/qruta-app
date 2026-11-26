import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Copy,
  Check,
  Edit2,
} from 'lucide-react';
import { StatusBadge } from '../../components/admin/common/StatusBadge';
import { QrCodeSvg } from '../../components/common/QrCodeSvg';
import { QrPrintModal } from '../../components/admin/qr/QrPrintModal';
import { QrFormModal } from '../../components/admin/qr/QrFormModal';
import { operatorQrCodeService } from '../../services/qrCodeService';
import { operatorPortalService } from '../../services/operatorPortalService';
import { resolveAbsoluteQrUrl } from '../../utils/qrGenerator';
import { useAdminToast } from '../../hooks/useAdminToast';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useQrDetail } from '../../hooks/useQrDetail';
import { STALE_TIMES } from '../../lib/queryClient';
import { operatorKeys } from '../../lib/queryKeys';

const INITIAL_CATALOGS = {
  routes: [],
  stops: [],
};

async function loadOperatorQrCatalogs(queryClient) {
  const [routesData, stopsData] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: operatorKeys.routes(),
      queryFn: () => operatorPortalService.getRoutes(),
      staleTime: STALE_TIMES.OPERATIONAL,
    }),
    queryClient.fetchQuery({
      queryKey: operatorKeys.stops(),
      queryFn: () => operatorPortalService.getStops(),
      staleTime: STALE_TIMES.OPERATIONAL,
    }),
  ]);

  return {
    routes: Array.isArray(routesData) ? routesData : [],
    stops: Array.isArray(stopsData) ? stopsData : [],
  };
}

export function OperatorQrDetailPage() {
  const { id } = useParams();
  const toast = useAdminToast();
  const { copied, copy } = useCopyToClipboard();

  const detailQueryKey = useMemo(() => operatorKeys.qrDetail(id), [id]);
  const statsQueryKey = useMemo(() => operatorKeys.qrStats(id), [id]);
  const listQueryKey = useMemo(() => operatorKeys.qrCodes(), []);

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
    service: operatorQrCodeService,
    detailQueryKey,
    statsQueryKey,
    listQueryKey,
    loadCatalogs: loadOperatorQrCatalogs,
    initialCatalogs: INITIAL_CATALOGS,
    toast,
    loadErrorLog: 'Error cargando QR de operador:',
  });

  const handleCopyUrl = () => {
    if (!qr) return;
    const url = qr.canonicalUrl || `${window.location.origin}/q/${qr.code}`;
    void copy(url);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-brand-lime animate-spin" />
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Código QR no encontrado</p>
        <Link to="/operador/qr-codes" className="mt-3 inline-block text-xs font-bold text-blue-600">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const qrUrl = resolveAbsoluteQrUrl(qr);
  const totalScans = stats?.totalScans || qr.totalScans || 0;
  const effectiveViews = stats?.effectiveViews || 0;
  const ctrPercent = totalScans > 0 ? Math.min(100, Math.round((effectiveViews / totalScans) * 100)) : 0;
  const dailyScans = stats?.dailyScans || [];
  const maxDayScans = Math.max(1, ...dailyScans.map((d) => d.scans));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/operador/qr-codes"
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
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {qr.label}
          </h1>
        </div>
        <button
          type="button"
          onClick={openEdit}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Edit2 className="h-3.5 w-3.5" />
          <span>Editar QR</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Escaneos Totales
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 font-mono">
            {new Intl.NumberFormat('es-PE').format(totalScans)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Registrados en soporte físico</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Vistas de la Ruta
          </p>
          <p className="mt-1 text-2xl font-black text-brand-lime font-mono">
            {new Intl.NumberFormat('es-PE').format(effectiveViews)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Carga efectiva del detalle</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Conversión de Escaneo
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-600 font-mono">
            {ctrPercent}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Vistas sobre escaneos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Información del Recurso
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 uppercase text-[10px] font-bold">Destino</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {qr.targetTitle || '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 uppercase text-[10px] font-bold">Campaña / Soporte</p>
                <p className="mt-1 text-slate-700">
                  {qr.campaignSource || 'General'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-slate-400 uppercase text-[10px] font-bold mb-1">
                Enlace Directo
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

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Evolución Diaria</h3>
            {dailyScans.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Aún no hay escaneos registrados.
              </p>
            ) : (
              <div className="h-40 flex items-end gap-2 pt-6">
                {dailyScans.map((d, i) => {
                  const heightPercent = Math.max(8, Math.round((d.scans / maxDayScans) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-slate-900 rounded-t-lg transition-all group-hover:bg-slate-700"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[9px] text-slate-400 rotate-45 origin-left truncate">
                        {d.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card flex flex-col items-center text-center space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Vista del Código</h3>
          <div className="w-48 h-48 bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm flex items-center justify-center">
            <QrCodeSvg
              value={qrUrl}
              margin={1}
              label={qr.label ? `Código QR para ${qr.label}` : 'Código QR'}
            />
          </div>
          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir Lámina</span>
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
        isOperator={true}
      />
    </div>
  );
}

export default OperatorQrDetailPage;
