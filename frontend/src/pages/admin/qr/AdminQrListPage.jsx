import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode as QrIcon,
  Printer,
  Copy,
  Check,
  Pause,
  Play,
  BarChart3,
  RefreshCw,
  Edit2,
  Trash2,
} from 'lucide-react';
import { AdminDataTable } from '../../../components/admin/common/AdminDataTable';
import { AdminFilterBar } from '../../../components/admin/common/AdminFilterBar';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { QrPrintModal } from '../../../components/admin/qr/QrPrintModal';
import { QrFormModal } from '../../../components/admin/qr/QrFormModal';
import { adminQrCodeService } from '../../../services/qrCodeService';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';
import { adminOperatorService } from '../../../services/adminOperatorService';
import { adminLineService } from '../../../services/adminLineService';
import { cityService } from '../../../services/cityService';
import { useAdminToast } from '../../../hooks/useAdminToast';

export function AdminQrListPage() {
  const toast = useAdminToast();
  const [qrCodes, setQrCodes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [operators, setOperators] = useState([]);
  // Cities scope the target picker; lines are needed because a route inherits
  // its city from its transport line (the admin route DTO carries no cityId).
  const [cities, setCities] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingQr, setEditingQr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [printModalQr, setPrintModalQr] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null); // { qr, newStatus, description }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, label }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [codes, routesData, stopsData, opsData, citiesData, linesData] =
        await Promise.all([
          adminQrCodeService.getAll().catch(() => []),
          adminRouteService.getAllRoutes().catch(() => []),
          adminStopService.getAllStops().catch(() => []),
          adminOperatorService.getAllOperators().catch(() => []),
          cityService.getAdminCities().catch(() => []),
          adminLineService.getAllLines().catch(() => []),
        ]);
      setQrCodes(Array.isArray(codes) ? codes : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setStops(Array.isArray(stopsData) ? stopsData : []);
      setOperators(Array.isArray(opsData) ? opsData : []);
      setCities(Array.isArray(citiesData) ? citiesData : []);
      setLines(Array.isArray(linesData) ? linesData : []);
    } catch (err) {
      console.error('Error cargando códigos QR:', err);
      toast.error('Error al cargar la lista de códigos QR.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch hydrates QR list state
    loadData();
  }, [loadData]);

  // Filtered QR codes
  const filteredCodes = useMemo(() => {
    return qrCodes.filter((qr) => {
      const matchesSearch =
        !searchQuery ||
        qr.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.campaignName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !filterStatus || qr.status === filterStatus;
      const matchesType = !filterType || qr.targetType === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [qrCodes, searchQuery, filterStatus, filterType]);

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      const created = await adminQrCodeService.create(formData);
      setQrCodes((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      // Surface the freshly created QR right away so the admin can download or
      // print it without having to hunt for it in the list.
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
      const updated = await adminQrCodeService.update(qrId, formData);
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

  const handleDelete = async () => {
    const qrId = deleteConfirm?.id;
    if (!qrId) return;

    setSaving(true);
    try {
      await adminQrCodeService.delete(qrId);
      setQrCodes((prev) => prev.filter((c) => c.id !== qrId));
      setDeleteConfirm(null);
      toast.success('Código QR eliminado exitosamente.');
    } catch (err) {
      console.error('Error eliminando QR:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar el código QR.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (qr, newStatus) => {
    try {
      const updated = await adminQrCodeService.update(qr.id, { status: newStatus });
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

  const columns = [
    {
      key: 'code',
      label: 'Código / Etiqueta',
      render: (qr) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPrintModalQr(qr)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition shadow-sm"
            title="Ver / Imprimir lámina"
          >
            <QrIcon className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                {qr.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopyUrl(qr)}
                className="text-slate-400 hover:text-slate-600"
                title="Copiar URL"
              >
                {copiedId === qr.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-800 line-clamp-1 mt-0.5">
              {qr.label}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'targetType',
      label: 'Destino',
      render: (qr) => (
        <div>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
            {qr.targetType}
          </span>
          <p className="text-xs font-medium text-slate-700 mt-1 line-clamp-1">
            {qr.targetTitle || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'operator',
      label: 'Operador / Campaña',
      render: (qr) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800">
            {qr.operatorName || 'Global QRuta'}
          </p>
          {qr.campaignSource && (
            <span className="text-[11px] text-slate-500">
              {qr.campaignSource} {qr.campaignMedium ? `• ${qr.campaignMedium}` : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'totalScans',
      label: 'Escaneos',
      align: 'right',
      render: (qr) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {new Intl.NumberFormat('es-PE').format(qr.totalScans || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (qr) => (
        <StatusBadge
          status={qr.status}
          activeLabel="Activo"
          inactiveLabel="Pausado"
        />
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (qr) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/admin/qr-codes/${qr.id}`}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
            title="Ver analítica y detalles"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setPrintModalQr(qr)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            title="Descargar lámina para imprimir"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditingQr(qr)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
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
                    description: `¿Deseas pausar el código QR "${qr.label}"? Los escaneos futuros mostrarán un aviso y no abrirán el destino.`,
                  })
              }
              className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
              title="Pausar código"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : qr.status === 'PAUSED' ? (
            <button
              type="button"
              onClick={() => handleToggleStatus(qr, 'ACTIVE')}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition"
              title="Reactivar código"
            >
              <Play className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setDeleteConfirm({ id: qr.id, label: qr.label })}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            title="Eliminar código QR"
            aria-label={`Eliminar código QR ${qr.label}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-card">
              <QrIcon className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Códigos QR Inteligentes
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Administra, redirige e imprime códigos QR para paraderos, rutas y campañas físicas.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por código, etiqueta o campaña..."
        actionLabel="Crear Código QR"
        onAction={() => setCreateModalOpen(true)}
      >
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todos los destinos</option>
          <option value="ROUTE">Rutas</option>
          <option value="STOP">Paraderos</option>
          <option value="HOME">Inicio</option>
          <option value="CAMPAIGN">Campañas</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="PAUSED">Pausados</option>
        </select>
      </AdminFilterBar>

      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={filteredCodes}
        loading={loading}
        emptyMessage="No se encontraron códigos QR."
      />

      {/* Create Modal */}
      <QrFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
        saving={saving}
        routes={routes}
        stops={stops}
        operators={operators}
        cities={cities}
        lines={lines}
        isOperator={false}
      />

      {/* Edit Modal */}
      <QrFormModal
        open={Boolean(editingQr)}
        initialData={editingQr}
        onClose={() => setEditingQr(null)}
        onSave={handleEdit}
        saving={saving}
        routes={routes}
        stops={stops}
        operators={operators}
        cities={cities}
        lines={lines}
        isOperator={false}
      />

      {/* Print / Export Modal */}
      <QrPrintModal
        open={Boolean(printModalQr)}
        onClose={() => setPrintModalQr(null)}
        qr={printModalQr}
      />

      {/* Confirm Status Dialog */}
      <ConfirmDialog
        open={Boolean(statusConfirm)}
        title="Pausar Código QR"
        description={statusConfirm?.description}
        confirmLabel="Pausar Código"
        tone="warning"
        onConfirm={() => handleToggleStatus(statusConfirm.qr, statusConfirm.newStatus)}
        onCancel={() => setStatusConfirm(null)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar Código QR"
        description={`¿Eliminar definitivamente el código QR "${deleteConfirm?.label}"? Sus eventos de escaneo se conservarán.`}
        confirmLabel="Eliminar Código"
        tone="danger"
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

export default AdminQrListPage;
