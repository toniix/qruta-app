import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  QrCode as QrIcon,
  Printer,
  Download,
  Copy,
  Check,
  Pause,
  Play,
  Ban,
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { QrPrintModal } from '../../../components/admin/qr/QrPrintModal';
import { adminQrCodeService } from '../../../services/qrCodeService';
import { generateQrSvg, generateQrDataUrl } from '../../../utils/qrGenerator';
import { useAdminToast } from '../../../hooks/useAdminToast';

export function AdminQrDetailPage() {
  const { id } = useParams();
  const toast = useAdminToast();
  const [qr, setQr] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qrData, statsData] = await Promise.all([
        adminQrCodeService.getById(id),
        adminQrCodeService.getStats(id).catch(() => null),
      ]);
      setQr(qrData);
      setStats(statsData);
    } catch (err) {
      console.error('Error cargando detalle del QR:', err);
      toast.error('Error al cargar la información del código QR.');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyUrl = () => {
    if (!qr) return;
    const url = qr.canonicalUrl || `${window.location.origin}/q/${qr.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleStatus = async (newStatus) => {
    try {
      const updated = await adminQrCodeService.update(qr.id, { status: newStatus });
      setQr(updated);
      toast.success(`Código QR marcado como ${newStatus}.`);
    } catch (err) {
      console.error('Error actualizando estado:', err);
      toast.error('Error al actualizar el estado del código QR.');
    } finally {
      setStatusConfirm(null);
    }
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

  const qrUrl = qr.canonicalUrl || `${window.location.origin}/q/${qr.code}`;
  const svgMarkup = generateQrSvg(qrUrl, { margin: 1 });
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
                inactiveLabel={qr.status === 'PAUSED' ? 'Pausado' : 'Revocado'}
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
          {qr.status === 'ACTIVE' ? (
            <button
              type="button"
              onClick={() =>
                setStatusConfirm({
                  newStatus: 'PAUSED',
                  message: '¿Deseas pausar este código QR?',
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

          <div
            className="w-52 h-52 bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />

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

      <ConfirmDialog
        open={Boolean(statusConfirm)}
        title="Cambiar Estado de Código QR"
        message={statusConfirm?.message}
        confirmLabel="Confirmar"
        confirmVariant={statusConfirm?.newStatus === 'REVOKED' ? 'danger' : 'warning'}
        onConfirm={() => handleToggleStatus(statusConfirm.newStatus)}
        onCancel={() => setStatusConfirm(null)}
      />
    </div>
  );
}

export default AdminQrDetailPage;
