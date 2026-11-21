import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode as QrIcon,
  Plus,
  Printer,
  Copy,
  Check,
  Pause,
  Play,
  BarChart3,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { StatusBadge } from '../../components/admin/common/StatusBadge';
import { ConfirmDialog } from '../../components/admin/common/ConfirmDialog';
import { QrPrintModal } from '../../components/admin/qr/QrPrintModal';
import { QrFormModal } from '../../components/admin/qr/QrFormModal';
import { operatorQrCodeService } from '../../services/qrCodeService';
import { operatorPortalService } from '../../services/operatorPortalService';
import { useAdminToast } from '../../hooks/useAdminToast';

export function OperatorQrListPage() {
  const toast = useAdminToast();
  const [qrCodes, setQrCodes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingQr, setEditingQr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [printModalQr, setPrintModalQr] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null); // { qr, newStatus, description }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [codes, routesData, stopsData] = await Promise.all([
        operatorQrCodeService.getAll().catch(() => []),
        operatorPortalService.getRoutes().catch(() => []),
        operatorPortalService.getStops().catch(() => []),
      ]);
      setQrCodes(Array.isArray(codes) ? codes : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setStops(Array.isArray(stopsData) ? stopsData : []);
    } catch (err) {
      console.error('Error cargando QR del operador:', err);
      toast.error('Error al cargar códigos QR.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch hydrates QR list state
    loadData();
  }, [loadData]);

  const filteredCodes = useMemo(() => {
    return qrCodes.filter((qr) => {
      const matchesSearch =
        !searchQuery ||
        qr.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.code?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !filterStatus || qr.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [qrCodes, searchQuery, filterStatus]);

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      const created = await operatorQrCodeService.create(formData);
      setQrCodes((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      // Surface the freshly created QR right away so the operator can download
      // or print it without having to hunt for it in the list.
      setPrintModalQr(created);
      toast.success('Código QR creado exitosamente.');
    } catch (err) {
      console.error('Error creando QR:', err);
      toast.error(err.response?.data?.message || 'Error al crear el código QR.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (formData) => {
    const qrId = editingQr?.id;
    if (!qrId) return;

    setSaving(true);
    try {
      const updated = await operatorQrCodeService.update(qrId, formData);
      setQrCodes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingQr(null);
      toast.success('Código QR actualizado exitosamente.');
    } catch (err) {
      console.error('Error actualizando QR:', err);
      toast.error(err.response?.data?.message || 'Error al actualizar el código QR.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (qr, newStatus) => {
    try {
      const updated = await operatorQrCodeService.update(qr.id, { status: newStatus });
      setQrCodes(qrCodes.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(`Código QR marcado como ${newStatus}.`);
    } catch (err) {
      console.error('Error actualizando estado:', err);
      toast.error('Error al actualizar el estado del código QR.');
    } finally {
      setStatusConfirm(null);
    }
  };

  const [copiedId, setCopiedId] = useState(null);
  const handleCopyUrl = (qr) => {
    const url = qr.canonicalUrl || `${window.location.origin}/q/${qr.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(qr.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <OperatorPageHeader
        title="Códigos QR de la Empresa"
        description="Genera e imprime códigos QR para tus unidades, paraderos y volantes físicos. Rastrea los escaneos en tiempo real."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-lime px-4 py-2 text-xs font-bold text-slate-900 hover:bg-brand-lime/90 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Código QR</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-card">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por código o etiqueta..."
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="PAUSED">Pausados</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Código / Etiqueta</th>
                <th className="px-4 py-3.5">Destino</th>
                <th className="px-4 py-3.5">Campaña</th>
                <th className="px-4 py-3.5 text-right">Escaneos</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Cargando códigos QR...
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No hay códigos QR registrados para esta empresa.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((qr) => (
                  <tr key={qr.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setPrintModalQr(qr)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          title="Imprimir lámina"
                        >
                          <QrIcon className="h-4 w-4" />
                        </button>
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                            <span>{qr.code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyUrl(qr)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              {copiedId === qr.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {qr.label}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {qr.targetType}
                      </span>
                      <p className="text-xs text-slate-700 line-clamp-1 mt-0.5">
                        {qr.targetTitle || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] text-slate-500">
                        {qr.campaignSource || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {new Intl.NumberFormat('es-PE').format(qr.totalScans || 0)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={qr.status}
                        activeLabel="Activo"
                        inactiveLabel="Pausado"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/operador/qr-codes/${qr.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          title="Ver estadísticas"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPrintModalQr(qr)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Imprimir lámina"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingQr(qr)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          title="Editar código QR"
                          aria-label={`Editar código QR ${qr.label}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {qr.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setStatusConfirm({
                                qr,
                                newStatus: 'PAUSED',
                                description: `¿Pausar el código "${qr.label}"? Los escaneos futuros mostrarán un aviso y no abrirán el destino.`,
                              })
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            title="Pausar"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        ) : qr.status === 'PAUSED' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(qr, 'ACTIVE')}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            title="Reactivar"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QrFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
        saving={saving}
        routes={routes}
        stops={stops}
        isOperator={true}
      />

      <QrFormModal
        open={Boolean(editingQr)}
        initialData={editingQr}
        onClose={() => setEditingQr(null)}
        onSave={handleEdit}
        saving={saving}
        routes={routes}
        stops={stops}
        isOperator={true}
      />

      <QrPrintModal
        open={Boolean(printModalQr)}
        onClose={() => setPrintModalQr(null)}
        qr={printModalQr}
      />

      <ConfirmDialog
        open={Boolean(statusConfirm)}
        title="Cambiar Estado del Código QR"
        description={statusConfirm?.description}
        confirmLabel="Confirmar"
        tone="warning"
        onConfirm={() => handleToggleStatus(statusConfirm.qr, statusConfirm.newStatus)}
        onCancel={() => setStatusConfirm(null)}
      />
    </div>
  );
}

export default OperatorQrListPage;
