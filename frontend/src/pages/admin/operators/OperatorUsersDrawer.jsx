import { useState, useEffect, useId, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { STALE_TIMES } from '../../../lib/queryClient';
import { adminKeys } from '../../../lib/queryKeys';

const EMPTY_USERS = [];

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

function OperatorUsersDrawerContent({ open, operator, onClose, onChanged }) {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState(null); // { mode: 'create'|'edit'|'reset', user? }
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [errors, setErrors] = useState({});
  const [actionError, setActionError] = useState('');

  const emailErrorId = useId();
  const fullNameErrorId = useId();
  const roleErrorId = useId();
  const passwordErrorId = useId();

  const operatorId = operator?.id;

  const usersQuery = useQuery({
    queryKey: adminKeys.operatorUsers(operatorId),
    queryFn: () => adminOperatorService.getOperatorUsers(operatorId),
    enabled: Boolean(open && operatorId),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const users = usersQuery.data ?? EMPTY_USERS;
  const loading = Boolean(operatorId) && usersQuery.isPending;

  const lastErrorAtRef = useRef(0);

  useEffect(() => {
    if (
      usersQuery.isError &&
      usersQuery.errorUpdatedAt > 0 &&
      usersQuery.errorUpdatedAt !== lastErrorAtRef.current
    ) {
      lastErrorAtRef.current = usersQuery.errorUpdatedAt;
      console.error('Error cargando usuarios del operador:', usersQuery.error);
    }
  }, [usersQuery.isError, usersQuery.error, usersQuery.errorUpdatedAt]);

  const saveUserMutation = useMutation({
    mutationFn: async ({ mode, userId, data }) => {
      if (mode === 'create') {
        return adminOperatorService.createOperatorUser(operatorId, data);
      }
      if (mode === 'edit') {
        const payload = { ...data };
        if (!payload.email) delete payload.email;
        return adminOperatorService.updateOperatorUser(operatorId, userId, payload);
      }
      return adminOperatorService.resetOperatorUserPassword(
        operatorId,
        userId,
        data.password,
      );
    },
    onSuccess: async () => {
      setPanel(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.operatorUsers(operatorId) }),
        queryClient.invalidateQueries({ queryKey: adminKeys.operators() }),
      ]);
      onChanged?.();
    },
    onError: (err) => {
      console.error('Error guardando usuario del operador:', err);
      setActionError(err.response?.data?.message || 'No se pudo guardar el usuario.');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (user) =>
      adminOperatorService.setOperatorUserActive(operatorId, user.id, !user.active),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.operatorUsers(operatorId) }),
        queryClient.invalidateQueries({ queryKey: adminKeys.operators() }),
      ]);
      onChanged?.();
    },
    onError: (err) => {
      console.error('Error cambiando estado del usuario:', err);
      setActionError(
        err.response?.data?.message || 'No se pudo cambiar el estado del usuario.',
      );
    },
  });

  const saving = saveUserMutation.isPending;

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

  const handleSubmit = (e) => {
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

    setActionError('');
    saveUserMutation.mutate({
      mode: panel.mode,
      userId: panel.user?.id,
      data: result.data,
    });
  };

  const toggleActive = (user) => {
    setActionError('');
    toggleActiveMutation.mutate(user);
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
      loading={saving}
      maxWidth="max-w-3xl"
      footer={footer}
    >
      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700"
        >
          {actionError}
        </p>
      )}

      {panel ? (
        <form id="operator-user-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs font-bold text-slate-900">{panelTitle}</div>

          {panel.mode !== 'reset' && (
            <>
              <div>
                <label
                  htmlFor="operator-user-email"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Correo electrónico <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="operator-user-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value }, 'email')}
                  placeholder="usuario@empresa.pe"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? emailErrorId : undefined}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                />
                <FieldError id={emailErrorId} message={errors.email} />
              </div>

              <div>
                <label
                  htmlFor="operator-user-full-name"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Nombre completo <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="operator-user-full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => update({ fullName: e.target.value }, 'fullName')}
                  placeholder="Ej: Ana Owner"
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? fullNameErrorId : undefined}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                />
                <FieldError id={fullNameErrorId} message={errors.fullName} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="operator-user-role"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    Rol
                  </label>
                  <select
                    id="operator-user-role"
                    name="role"
                    value={form.role}
                    onChange={(e) => update({ role: e.target.value }, 'role')}
                    aria-invalid={Boolean(errors.role)}
                    aria-describedby={errors.role ? roleErrorId : undefined}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="EDITOR">EDITOR</option>
                  </select>
                  <FieldError id={roleErrorId} message={errors.role} />
                </div>

                {panel.mode === 'edit' && (
                  <label
                    htmlFor="operator-user-active"
                    className="flex items-center gap-2.5 self-end rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 cursor-pointer"
                  >
                    <input
                      id="operator-user-active"
                      name="active"
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
              <label
                htmlFor="operator-user-create-password"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
              >
                Contraseña provisional <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <input
                id="operator-user-create-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(e) => update({ password: e.target.value }, 'password')}
                placeholder="Mínimo 8 caracteres"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? passwordErrorId : undefined}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20"
              />
              <FieldError id={passwordErrorId} message={errors.password} />
            </div>
          )}

          {panel.mode === 'reset' && (
            <div>
              <label
                htmlFor="operator-user-reset-password"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
              >
                Nueva contraseña <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <input
                id="operator-user-reset-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(e) => update({ password: e.target.value }, 'password')}
                placeholder="Mínimo 8 caracteres"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? passwordErrorId : undefined}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20"
              />
              <FieldError id={passwordErrorId} message={errors.password} />
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
  return <OperatorUsersDrawerContent open={open} {...props} />;
}

export default OperatorUsersDrawer;