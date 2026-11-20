import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Edit2,
  KeyRound,
  UserPlus,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { FieldError } from '../../../components/common/FieldError';
import {
  operatorUserCreateSchema,
  operatorUserUpdateSchema,
  operatorResetPasswordSchema,
  validateWith,
} from '../../../schemas';
import { adminOperatorService } from '../../../services/adminOperatorService';

const EMPTY_USER_FORM = {
  email: '',
  fullName: '',
  role: 'EDITOR',
  active: true,
  password: '',
};

function RoleBadge({ role }) {
  const isOwner = role === 'OWNER';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
        isOwner
          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
          : 'bg-slate-100 text-slate-600 border border-slate-200/60'
      }`}
    >
      {role}
    </span>
  );
}

function OperatorUsersDrawerContent({ operator, onClose, onChanged }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(Boolean(operator?.id));
  const [panel, setPanel] = useState(null); // { mode: 'create'|'edit'|'reset', user? }
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const operatorId = operator?.id;

  const loadUsers = useCallback(async () => {
    if (!operatorId) return;
    setLoading(true);
    try {
      const data = await adminOperatorService.getOperatorUsers(operatorId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando usuarios del operador:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    if (!operatorId) return undefined;
    let cancelled = false;
    adminOperatorService
      .getOperatorUsers(operatorId)
      .then((data) => {
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Error cargando usuarios del operador:', err);
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [operatorId]);

  const openPanel = (mode, user = null) => {
    setActionError('');
    setErrors({});
    if (mode === 'create') {
      setForm({ ...EMPTY_USER_FORM });
    } else if (mode === 'edit') {
      setForm({
        email: user.email || '',
        fullName: user.fullName || '',
        role: user.role || 'EDITOR',
        active: Boolean(user.active),
        password: '',
      });
    } else {
      setForm({ ...EMPTY_USER_FORM, password: '' });
    }
    setPanel({ mode, user });
  };

  const update = (patch, field) => {
    setForm((f) => ({ ...f, ...patch }));
    if (field) {
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!panel) return;

    let result;
    if (panel.mode === 'create') {
      result = validateWith(operatorUserCreateSchema, form);
    } else if (panel.mode === 'edit') {
      result = validateWith(operatorUserUpdateSchema, {
        ...form,
        email: form.email || undefined,
      });
    } else {
      result = validateWith(operatorResetPasswordSchema, form);
    }

    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }

    setSaving(true);
    setActionError('');
    try {
      const operatorId = operator.id;
      if (panel.mode === 'create') {
        await adminOperatorService.createOperatorUser(operatorId, result.data);
      } else if (panel.mode === 'edit') {
        const payload = { ...result.data };
        if (!payload.email) delete payload.email;
        await adminOperatorService.updateOperatorUser(operatorId, panel.user.id, payload);
      } else {
        await adminOperatorService.resetOperatorUserPassword(
          operatorId,
          panel.user.id,
          result.data.password,
        );
      }
      setPanel(null);
      await loadUsers();
      if (onChanged) onChanged();
    } catch (err) {
      console.error('Error guardando usuario del operador:', err);
      setActionError(err.response?.data?.message || 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    setActionError('');
    try {
      await adminOperatorService.setOperatorUserActive(operator.id, user.id, !user.active);
      await loadUsers();
      if (onChanged) onChanged();
    } catch (err) {
      console.error('Error cambiando estado del usuario:', err);
      setActionError(err.response?.data?.message || 'No se pudo cambiar el estado del usuario.');
    }
  };

  const panelTitle =
    panel?.mode === 'create'
      ? 'Nuevo Usuario'
      : panel?.mode === 'edit'
        ? `Editar ${panel.user?.fullName || 'Usuario'}`
        : 'Restablecer Contraseña';

  const footer = panel && (
    <>
      <button
        type="button"
        onClick={() => setPanel(null)}
        disabled={saving}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="operator-user-form"
        disabled={saving}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {panel.mode === 'create'
          ? 'Crear Usuario'
          : panel.mode === 'edit'
            ? 'Actualizar Usuario'
            : 'Restablecer Contraseña'}
      </button>
    </>
  );

  return (
    <AdminDrawer
      open={true}
      onClose={onClose}
      title={`Usuarios · ${operator?.name || 'Operador'}`}
      subtitle="Cuentas con acceso al portal del operador"
      icon={Users}
      maxWidth="max-w-3xl"
      footer={footer}
    >
      {actionError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
          {actionError}
        </p>
      )}

      {panel ? (
        <form id="operator-user-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs font-bold text-slate-900">{panelTitle}</div>

          {panel.mode !== 'reset' && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Correo electrónico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value }, 'email')}
                  placeholder="usuario@empresa.pe"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <FieldError message={errors.email} />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => update({ fullName: e.target.value }, 'fullName')}
                  placeholder="Ej: Ana Owner"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <FieldError message={errors.fullName} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Rol
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => update({ role: e.target.value }, 'role')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="EDITOR">EDITOR</option>
                  </select>
                  <FieldError message={errors.role} />
                </div>

                {panel.mode === 'edit' && (
                  <label className="flex items-center gap-2.5 self-end rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.active)}
                      onChange={(e) => update({ active: e.target.checked }, 'active')}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Usuario activo</span>
                  </label>
                )}
              </div>
            </>
          )}

          {panel.mode === 'create' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Contraseña provisional <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value }, 'password')}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <FieldError message={errors.password} />
            </div>
          )}

          {panel.mode === 'reset' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Nueva contraseña <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value }, 'password')}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <FieldError message={errors.password} />
            </div>
          )}
        </form>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              {loading ? 'Cargando usuarios...' : `${users.length} usuario(s) registrados`}
            </p>
            <button
              type="button"
              onClick={() => openPanel('create')}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" /> Nuevo Usuario
            </button>
          </div>

          {!loading && users.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">
              Este operador aún no tiene usuarios de portal.
            </p>
          )}

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-slate-800">{user.fullName}</span>
                    <RoleBadge role={user.role} />
                    <StatusBadge status={user.active} activeLabel="Activo" inactiveLabel="Inactivo" />
                  </div>
                  <span className="block truncate text-[11px] text-slate-500">{user.email}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openPanel('edit', user)}
                    title="Editar usuario"
                    aria-label={`Editar ${user.email}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openPanel('reset', user)}
                    title="Restablecer contraseña"
                    aria-label={`Restablecer contraseña de ${user.email}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(user)}
                    title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
                    aria-label={`${user.active ? 'Desactivar' : 'Activar'} ${user.email}`}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                      user.active
                        ? 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {user.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminDrawer>
  );
}

export function OperatorUsersDrawer({ open, ...props }) {
  if (!open) return null;
  return <OperatorUsersDrawerContent {...props} />;
}

export default OperatorUsersDrawer;