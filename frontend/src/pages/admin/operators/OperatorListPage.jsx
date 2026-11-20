import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Edit2,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';
import { AdminDataTable } from '../../../components/admin/common/AdminDataTable';
import { AdminFilterBar } from '../../../components/admin/common/AdminFilterBar';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { OperatorFormDrawer } from './OperatorFormDrawer';
import { OperatorUsersDrawer } from './OperatorUsersDrawer';
import { adminOperatorService } from '../../../services/adminOperatorService';
import { useAdminToast } from '../../../hooks/useAdminToast';

function PlanBadge({ plan }) {
  const styles = {
    BASIC: 'bg-slate-100 text-slate-600 border-slate-200/60',
    PRO: 'bg-blue-50 text-blue-700 border-blue-200/60',
    ENTERPRISE: 'bg-violet-50 text-violet-700 border-violet-200/60',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide border ${
        styles[plan] || styles.BASIC
      }`}
    >
      {plan || 'PRO'}
    </span>
  );
}

export function OperatorListPage() {
  const toast = useAdminToast();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [saving, setSaving] = useState(false);

  const [usersOperator, setUsersOperator] = useState(null);

  const [activeConfirm, setActiveConfirm] = useState(null);
  const [toggling, setToggling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminOperatorService.getAllOperators();
      setOperators(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando operadores:', err);
      toast.error('Error al cargar la lista de operadores.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await adminOperatorService.getAllOperators();
        if (isMounted) {
          setOperators(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error cargando operadores:', err);
          toast.error('Error al cargar la lista de operadores.');
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const filteredOperators = useMemo(() => {
    if (!searchQuery) return operators;
    const q = searchQuery.toLowerCase();
    return operators.filter(
      (op) =>
        op.name?.toLowerCase().includes(q) ||
        op.ruc?.includes(q) ||
        op.cityName?.toLowerCase().includes(q),
    );
  }, [operators, searchQuery]);

  const handleFormSubmit = async (formData) => {
    setSaving(true);
    try {
      if (editingOperator) {
        await adminOperatorService.updateOperator(editingOperator.id, formData);
        toast.success(`Operador "${formData.name}" actualizado con éxito.`);
      } else {
        await adminOperatorService.createOperator(formData);
        toast.success(`Operador "${formData.name}" registrado con éxito.`);
      }
      setDrawerOpen(false);
      setEditingOperator(null);
      await loadData();
    } catch (err) {
      console.error('Error guardando operador:', err);
      toast.error(err.response?.data?.message || 'Error al guardar el operador.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggleActive = async () => {
    if (!activeConfirm) return;
    setToggling(true);
    try {
      await adminOperatorService.setOperatorActive(activeConfirm.id, !activeConfirm.active);
      toast.success(
        activeConfirm.active
          ? `Operador "${activeConfirm.name}" desactivado.`
          : `Operador "${activeConfirm.name}" reactivado.`,
      );
      setActiveConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error cambiando estado del operador:', err);
      toast.error(err.response?.data?.message || 'No se pudo cambiar el estado del operador.');
    } finally {
      setToggling(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Operador',
      render: (op) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <span className="block font-bold text-slate-900 text-sm">{op.name}</span>
            <span className="block text-[11px] font-mono text-slate-500">RUC {op.ruc}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'cityName',
      label: 'Ciudad',
      width: '130px',
      render: (op) => <span className="text-slate-600">{op.cityName || '—'}</span>,
    },
    {
      key: 'plan',
      label: 'Plan',
      width: '110px',
      render: (op) => <PlanBadge plan={op.plan} />,
    },
    {
      key: 'active',
      label: 'Estado',
      width: '110px',
      render: (op) => <StatusBadge status={op.active} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      sortable: false,
      align: 'right',
      width: '170px',
      render: (op) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setUsersOperator(op)}
            title="Gestionar usuarios"
            aria-label={`Usuarios de ${op.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingOperator(op);
              setDrawerOpen(true);
            }}
            title="Editar operador"
            aria-label={`Editar ${op.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveConfirm(op)}
            title={op.active ? 'Desactivar operador' : 'Reactivar operador'}
            aria-label={`${op.active ? 'Desactivar' : 'Reactivar'} ${op.name}`}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              op.active
                ? 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            {op.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Building2 className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Operadores</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Empresas transportistas dadas de alta en la plataforma y sus cuentas de portal.
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

      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por nombre, RUC o ciudad..."
        actionLabel="Nuevo Operador"
        onAction={() => {
          setEditingOperator(null);
          setDrawerOpen(true);
        }}
      />

      <AdminDataTable
        columns={columns}
        data={filteredOperators}
        loading={loading}
        caption="Listado de operadores registrados"
        emptyTitle="No se encontraron operadores"
        emptyDescription="Registra un nuevo operador o ajusta los términos de búsqueda."
        emptyActionLabel="Registrar Primer Operador"
        onEmptyAction={() => {
          setEditingOperator(null);
          setDrawerOpen(true);
        }}
      />

      <OperatorFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingOperator(null);
        }}
        initialData={editingOperator}
        onSubmit={handleFormSubmit}
        loading={saving}
      />

      <OperatorUsersDrawer
        open={Boolean(usersOperator)}
        operator={usersOperator}
        onClose={() => setUsersOperator(null)}
        onChanged={loadData}
      />

      <ConfirmDialog
        open={Boolean(activeConfirm)}
        title={activeConfirm?.active ? 'Desactivar Operador' : 'Reactivar Operador'}
        description={
          activeConfirm?.active
            ? `¿Desactivar "${activeConfirm?.name}"? Sus usuarios ya no podrán ingresar al portal del operador.`
            : `¿Reactivar "${activeConfirm?.name}"? Sus usuarios activos podrán volver a ingresar.`
        }
        confirmLabel={activeConfirm?.active ? 'Desactivar' : 'Reactivar'}
        tone={activeConfirm?.active ? 'danger' : 'warning'}
        loading={toggling}
        onCancel={() => setActiveConfirm(null)}
        onConfirm={handleConfirmToggleActive}
      />
    </div>
  );
}

export default OperatorListPage;