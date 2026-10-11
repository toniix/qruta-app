import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Route,
  MapPin,
  Bus,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Save,
  Building2,
  ShieldCheck,
  Loader2,
  AlertCircle,
  AlertTriangle,
  X,
  ChevronDown,
  Search,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { adminLineService } from '../../services/adminLineService';
import { adminStopService } from '../../services/adminStopService';
import { adminRouteService } from '../../services/adminRouteService';
import { cityService } from '../../services/cityService';
import { communityService, getCategoryMeta } from '../../services/communityService';
import { formatRelativeTime } from '../../utils/dateUtils';
import { BRAND_PRIMARY } from '../../constants/brand';

const PERU_DEPARTMENTS = [
  'Amazonas', 'Ancash', 'Apurimac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huanuco',
  'Ica', 'Junin', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martin', 'Tacna', 'Tumbes', 'Ucayali',
];

const TABS = [
  { id: 'routes', label: 'Rutas', icon: Route },
  { id: 'lines', label: 'Líneas', icon: Bus },
  { id: 'stops', label: 'Paraderos', icon: MapPin },
  { id: 'cities', label: 'Ciudades', icon: Building2 },
  { id: 'community', label: 'Comunidad', icon: MessageSquare },
];

// One fetcher per collection, keyed by the state it feeds. Lets a mutation
// refresh only the lists it actually touched instead of re-downloading the
// whole dashboard after every create, update or delete.
const COLLECTION_FETCHERS = {
  lines: () => adminLineService.getAllLines(),
  routes: () => adminRouteService.getAllRoutes(),
  stops: () => adminStopService.getAllStops(),
  cities: () => cityService.getAdminCities(),
  community: () => communityService.getAdminPosts().catch(() => []),
};

const ALL_COLLECTIONS = Object.keys(COLLECTION_FETCHERS);

const cx = (...classes) => classes.filter(Boolean).join(' ');

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-500 focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white shadow-card transition hover:bg-brand-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const tdClass = 'px-3.5 py-3 align-middle';

/* ── Shared primitives ─────────────────────────────────────────────── */

function Field({ label, htmlFor, required, hint, className, children }) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-state-error" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function FormPanel({
  tone = 'create',
  icon: Icon,
  title,
  submitLabel = 'Guardar',
  saving,
  onCancel,
  onSubmit,
  children,
}) {
  const isEdit = tone === 'edit';
  return (
    <form
      onSubmit={onSubmit}
      className="animate-fade-in space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5"
    >
      <div
        className={cx(
          'flex items-center gap-2.5 rounded-xl px-3 py-2',
          isEdit ? 'bg-amber-50' : 'bg-brand-primary/5',
        )}
      >
        <span
          className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            isEdit ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className={ghostBtn}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className={cx(
            'inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-card transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
            isEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-primary hover:bg-brand-primary-dark',
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" /> {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function DepartmentCombobox({ id, value, onChange, departments }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

  const query = value || '';
  const filtered = departments.filter((d) => d.toLowerCase().includes(query.toLowerCase()));
  const activeIndex = Math.min(highlight, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const choose = (dept) => {
    onChange(dept);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        event.preventDefault();
        choose(filtered[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? `${id}-opt-${activeIndex}` : undefined}
        autoComplete="off"
        placeholder="Buscar departamento…"
        value={query}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cx(inputClass, 'pl-9 pr-9')}
        required
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-overlay"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">Sin resultados para “{query}”</p>
          ) : (
            filtered.map((dept, index) => (
              <button
                key={dept}
                id={`${id}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={dept === value}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(dept)}
                className={cx(
                  'block w-full px-3 py-2 text-left text-xs transition-colors',
                  index === activeIndex ? 'bg-brand-primary/10 text-brand-primary' : 'text-slate-700',
                  dept === value && 'font-bold',
                )}
              >
                {dept}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-400')} />
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function AccessibleBadge({ accessible }) {
  return accessible ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
      <Check className="h-3 w-3" /> Sí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
      <X className="h-3 w-3" /> No
    </span>
  );
}

function RowActions({ onEdit, onDelete, editLabel, deleteLabel }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        title={editLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/5 hover:text-brand-primary"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={deleteLabel}
        title={deleteLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DataTable({ caption, columns, minWidth = 680, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={cx('whitespace-nowrap px-3.5 py-2.5 font-semibold', column.align === 'right' && 'text-right')}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      {actionLabel && (
        <button onClick={onAction} className={cx(primaryBtn, 'mt-4')}>
          <Plus className="h-4 w-4" /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 animate-pulse rounded bg-slate-200" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

function TabBar({ active, counts, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Secciones del panel"
      className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card hide-scrollbar"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`panel-${id}`}
            onClick={() => onChange(id)}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors duration-150',
              isActive
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            <span
              className={cx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
              )}
            >
              {counts[id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ConfirmDialog({ open, title, description, confirmLabel, tone, loading, onCancel, onConfirm }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape' && !loading) onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;
  const danger = tone !== 'warning';

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={() => !loading && onCancel()}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-desc' : undefined}
        className="relative w-full max-w-sm animate-slide-in-bottom rounded-2xl border border-slate-200 bg-white p-5 shadow-overlay"
      >
        <div className="flex items-start gap-3">
          <span
            className={cx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-sm font-bold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id="confirm-desc" className="mt-1 text-xs text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={loading} className={ghostBtn}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cx(
              'inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-card transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-primary-dark',
            )}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

let toastSeq = 0;

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (message, type = 'success') => {
      const id = (toastSeq += 1);
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  return { toasts, push, dismiss };
}

function ToastViewport({ toasts, onDismiss }) {
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 sm:items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm animate-slide-in-bottom items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-overlay"
        >
          <span
            className={cx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              toast.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
            )}
          >
            {toast.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </span>
          <p className="flex-1 pt-0.5 text-xs font-medium text-slate-700">{toast.message}</p>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar notificación"
            className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('routes');
  const [lines, setLines] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [cities, setCities] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Form visibility
  const [showAddCity, setShowAddCity] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [editCity, setEditCity] = useState(null);
  const [editLine, setEditLine] = useState(null);
  const [editStop, setEditStop] = useState(null);
  const [editRoute, setEditRoute] = useState(null);

  // Form fields
  const [cityForm, setCityForm] = useState({ name: '', department: '', country: 'Peru', latitude: '', longitude: '', radiusKm: 30 });
  const [lineForm, setLineForm] = useState({
    cityId: '',
    name: '',
    code: '',
    color: BRAND_PRIMARY,
    company: '',
    contact: '',
    description: '',
  });
  const [stopForm, setStopForm] = useState({
    cityId: '',
    name: '',
    latitude: '',
    longitude: '',
    reference: '',
    address: '',
    isAccessible: true,
  });
  const [routeForm, setRouteForm] = useState({
    transportLineId: '',
    code: '',
    name: '',
    color: BRAND_PRIMARY,
    fare: '',
    schedule: '',
    frequency: '',
    description: '',
  });

  const navigate = useNavigate();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const applyCollections = (data) => {
    if ('lines' in data) setLines(data.lines);
    if ('routes' in data) setRoutes(data.routes);
    if ('stops' in data) setStops(data.stops);
    if ('cities' in data) setCities(data.cities);
    if ('community' in data) setCommunityPosts(data.community);
  };

  const fetchCollections = async (keys) => {
    const unique = [...new Set(keys)];
    const results = await Promise.all(unique.map((key) => COLLECTION_FETCHERS[key]()));
    return Object.fromEntries(unique.map((key, i) => [key, results[i]]));
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      applyCollections(await fetchCollections(ALL_COLLECTIONS));
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Refreshes only what a mutation touched, keeping the rest of the dashboard
  // on screen instead of flashing the full-page skeleton after every save.
  const refreshCollections = async (keys) => {
    try {
      applyCollections(await fetchCollections(keys));
    } catch (err) {
      console.error('Error actualizando datos:', err);
      pushToast('No se pudo actualizar la lista.', 'error');
    }
  };

  // Initial load. `loading` already starts as true, so this only writes state after
  // the request settles — no synchronous reset that would cost an extra render.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchCollections(ALL_COLLECTIONS);
        if (isMounted) applyCollections(data);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error cargando datos:', err);
        setError('No se pudieron cargar los datos. Verifica tu conexión.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/admin/login');
  };

  /* ── Form resets ─────────────────────────────────────────────────── */

  const resetLineForm = () => {
    setLineForm({
      cityId: cities[0]?.id || '',
      name: '',
      code: '',
      color: BRAND_PRIMARY,
      company: '',
      contact: '',
      description: '',
    });
    setShowAddLine(false);
    setEditLine(null);
  };

  const resetCityForm = () => {
    setCityForm({ name: '', department: '', country: 'Peru', latitude: '', longitude: '', radiusKm: 30 });
    setShowAddCity(false);
    setEditCity(null);
  };

  const resetStopForm = () => {
    setStopForm({
      cityId: cities[0]?.id || '',
      name: '',
      latitude: '',
      longitude: '',
      reference: '',
      address: '',
      isAccessible: true,
    });
    setShowAddStop(false);
    setEditStop(null);
  };

  const resetRouteForm = () => {
    setRouteForm({
      transportLineId: lines[0]?.id || '',
      code: '',
      name: '',
      color: BRAND_PRIMARY,
      fare: '',
      schedule: '',
      frequency: '',
      description: '',
    });
    setShowAddRoute(false);
    setEditRoute(null);
  };

  /* ── Edit starters ───────────────────────────────────────────────── */

  const startEditLine = (line) => {
    setShowAddLine(false);
    setLineForm({
      cityId: line.cityId || '',
      name: line.name || '',
      code: line.code || '',
      color: line.color || BRAND_PRIMARY,
      company: line.company || '',
      contact: line.contact || '',
      description: line.description || '',
    });
    setEditLine(line);
  };

  const startEditStop = (stop) => {
    setShowAddStop(false);
    setStopForm({
      cityId: stop.cityId || '',
      name: stop.name || '',
      latitude: stop.latitude ?? '',
      longitude: stop.longitude ?? '',
      reference: stop.reference || '',
      address: stop.address || '',
      isAccessible: Boolean(stop.accessible ?? stop.isAccessible),
    });
    setEditStop(stop);
  };

  const startEditRoute = (route) => {
    setShowAddRoute(false);
    setRouteForm({
      transportLineId: route.transportLineId || '',
      code: route.code || '',
      name: route.name || '',
      color: route.color || BRAND_PRIMARY,
      fare: route.fare || '',
      schedule: route.schedule || '',
      frequency: route.frequency || '',
      description: route.description || '',
    });
    setEditRoute(route);
  };

  const startEditCity = (city) => {
    setShowAddCity(false);
    setCityForm({ name: city.name || '', department: city.department || '', country: city.country || 'Peru' });
    setEditCity(city);
  };

  /* ── Mutations ───────────────────────────────────────────────────── */

  const runMutation = async ({ request, errorMessage, successMessage, onSuccess, refreshKeys }) => {
    setSaving(true);
    try {
      await request();
      pushToast(successMessage);
      onSuccess?.();
      await refreshCollections(refreshKeys);
    } catch (err) {
      pushToast(err.response?.data?.message || errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLine = (e) => {
    e.preventDefault();
    runMutation({
      request: () => adminLineService.createLine(lineForm),
      errorMessage: 'Error al crear la línea',
      successMessage: 'Línea creada correctamente',
      onSuccess: resetLineForm,
      refreshKeys: ['lines', 'routes'],
    });
  };

  const handleUpdateLine = (e) => {
    e.preventDefault();
    runMutation({
      request: () => adminLineService.updateLine(editLine.id, lineForm),
      errorMessage: 'Error al actualizar la línea',
      successMessage: 'Línea actualizada correctamente',
      onSuccess: resetLineForm,
      refreshKeys: ['lines', 'routes'],
    });
  };

  const handleCreateCity = (e) => {
    e.preventDefault();
    runMutation({
      request: () => cityService.createCity(cityForm),
      errorMessage: 'Error al crear la ciudad',
      successMessage: 'Ciudad creada correctamente',
      onSuccess: resetCityForm,
      refreshKeys: ['cities'],
    });
  };

  const handleUpdateCity = (e) => {
    e.preventDefault();
    runMutation({
      request: () => cityService.updateCity(editCity.id, cityForm),
      errorMessage: 'Error al actualizar la ciudad',
      successMessage: 'Ciudad actualizada correctamente',
      onSuccess: resetCityForm,
      refreshKeys: ['cities'],
    });
  };

  const handleCreateStop = (e) => {
    e.preventDefault();
    runMutation({
      request: () => adminStopService.createStop(stopForm),
      errorMessage: 'Error al crear el paradero',
      successMessage: 'Paradero creado correctamente',
      onSuccess: resetStopForm,
      refreshKeys: ['stops'],
    });
  };

  const handleUpdateStop = (e) => {
    e.preventDefault();
    runMutation({
      request: () => adminStopService.updateStop(editStop.id, stopForm),
      errorMessage: 'Error al actualizar el paradero',
      successMessage: 'Paradero actualizado correctamente',
      onSuccess: resetStopForm,
      refreshKeys: ['stops'],
    });
  };

  const handleCreateRoute = (e) => {
    e.preventDefault();
    runMutation({
      request: () => adminRouteService.createRoute(routeForm),
      errorMessage: 'Error al crear la ruta',
      successMessage: 'Ruta creada correctamente',
      onSuccess: resetRouteForm,
      refreshKeys: ['routes'],
    });
  };

  const handleUpdateRoute = (e) => {
    e.preventDefault();
    runMutation({
      request: () => adminRouteService.updateRoute(editRoute.id, routeForm),
      errorMessage: 'Error al actualizar la ruta',
      successMessage: 'Ruta actualizada correctamente',
      onSuccess: resetRouteForm,
      refreshKeys: ['routes'],
    });
  };

  /* ── Destructive actions (custom confirm) ────────────────────────── */

  const requestDeleteLine = (line) =>
    setConfirm({
      title: 'Eliminar línea',
      description: `Se eliminará la línea “${line.name}”. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar línea',
      errorMessage: 'Error al eliminar la línea',
      successMessage: 'Línea eliminada correctamente',
      action: () => adminLineService.deleteLine(line.id),
      refreshKeys: ['lines', 'routes'],
    });

  const requestDeleteRoute = (route) =>
    setConfirm({
      title: 'Eliminar ruta',
      description: `Se eliminará la ruta “${route.name}” (${route.code}). Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar ruta',
      errorMessage: 'Error al eliminar la ruta',
      successMessage: 'Ruta eliminada correctamente',
      action: () => adminRouteService.deleteRoute(route.id),
      refreshKeys: ['routes'],
    });

  const requestDeleteStop = (stop) =>
    setConfirm({
      title: 'Eliminar paradero',
      description: `Se eliminará el paradero “${stop.name}”. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar paradero',
      errorMessage: 'Error al eliminar el paradero',
      successMessage: 'Paradero eliminado correctamente',
      action: () => adminStopService.deleteStop(stop.id),
      refreshKeys: ['stops', 'routes'],
    });

  const requestDeleteCity = (city) =>
    setConfirm({
      title: 'Eliminar ciudad',
      description: `Se eliminará “${city.name}” junto con sus líneas y paraderos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar ciudad',
      errorMessage: 'Error al eliminar la ciudad',
      successMessage: 'Ciudad eliminada correctamente',
      action: () => cityService.deleteCity(city.id),
      // Deleting a city cascades into lines, their routes and the stops, so
      // every list can change.
      refreshKeys: ALL_COLLECTIONS,
    });

  const requestDeleteCommunityPost = (post) =>
    setConfirm({
      title: 'Eliminar publicación de Comunidad',
      description: `Se eliminará la publicación de “${post.authorAlias}” y todos sus comentarios. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar publicación',
      errorMessage: 'Error al eliminar la publicación',
      successMessage: 'Publicación eliminada correctamente',
      action: () => communityService.adminDeletePost(post.id),
      refreshKeys: ['community'],
    });

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.action();
      pushToast(confirm.successMessage);
      setConfirm(null);
      await refreshCollections(confirm.refreshKeys);
    } catch (err) {
      pushToast(err.response?.data?.message || confirm.errorMessage, 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const closeConfirm = useCallback(() => setConfirm(null), []);

  const counts = {
    routes: routes.length,
    lines: lines.length,
    stops: stops.length,
    cities: cities.length,
    community: communityPosts.length,
  };

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-card">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Panel administrativo
              </h1>
              <p className="text-xs text-slate-500">
                Gestión central de líneas, rutas, paraderos y ciudades
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 sm:self-auto"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={loadAllData}
              className="font-bold underline underline-offset-2 transition-colors hover:text-red-800"
            >
              Reintentar
            </button>
            <button
              onClick={() => setError(null)}
              aria-label="Cerrar aviso"
              className="rounded-lg p-1 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-5">
            <div className="flex gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card">
              {TABS.map(({ id }) => (
                <div key={id} className="h-9 w-28 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
            <TableSkeleton />
          </div>
        ) : (
          <>
            <TabBar active={activeTab} counts={counts} onChange={setActiveTab} />

            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              className="animate-fade-in space-y-4"
            >
              {/* ── ROUTES ─────────────────────────────────────────── */}
              {activeTab === 'routes' && (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Rutas registradas</h2>
                      <p className="text-xs text-slate-500">
                        {routes.length} {routes.length === 1 ? 'ruta' : 'rutas'} en el sistema
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetRouteForm();
                        setShowAddRoute(true);
                      }}
                      className={primaryBtn}
                    >
                      <Plus className="h-4 w-4" /> Nueva ruta
                    </button>
                  </div>

                  {showAddRoute && (
                    <FormPanel
                      icon={Route}
                      title="Nueva ruta"
                      saving={saving}
                      onCancel={resetRouteForm}
                      onSubmit={handleCreateRoute}
                    >
                      <Field label="Línea de transporte" htmlFor="route-line">
                        <select
                          id="route-line"
                          value={routeForm.transportLineId}
                          onChange={(e) => setRouteForm({ ...routeForm, transportLineId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Seleccionar línea…</option>
                          {lines.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Código" htmlFor="route-code" required>
                        <input
                          id="route-code"
                          type="text"
                          placeholder="Ej. R101"
                          value={routeForm.code}
                          onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Nombre" htmlFor="route-name" required>
                        <input
                          id="route-name"
                          type="text"
                          placeholder="Ej. Centro - La Angostura"
                          value={routeForm.name}
                          onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Tarifa" htmlFor="route-fare">
                        <input
                          id="route-fare"
                          type="text"
                          placeholder="Ej. S/ 2.50"
                          value={routeForm.fare}
                          onChange={(e) => setRouteForm({ ...routeForm, fare: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Horario" htmlFor="route-schedule">
                        <input
                          id="route-schedule"
                          type="text"
                          placeholder="Ej. 06:00 - 22:00"
                          value={routeForm.schedule}
                          onChange={(e) => setRouteForm({ ...routeForm, schedule: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Frecuencia" htmlFor="route-frequency">
                        <input
                          id="route-frequency"
                          type="text"
                          placeholder="Ej. Cada 10 min"
                          value={routeForm.frequency}
                          onChange={(e) => setRouteForm({ ...routeForm, frequency: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Color" htmlFor="route-color">
                        <div className="flex items-center gap-3">
                          <input
                            id="route-color"
                            type="color"
                            value={routeForm.color}
                            onChange={(e) => setRouteForm({ ...routeForm, color: e.target.value })}
                            className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                          />
                          <span className="font-mono text-xs uppercase text-slate-500">{routeForm.color}</span>
                        </div>
                      </Field>
                      <Field
                        label="Descripción"
                        htmlFor="route-description"
                        className="sm:col-span-2 lg:col-span-3"
                      >
                        <input
                          id="route-description"
                          type="text"
                          placeholder="Detalles del recorrido (opcional)"
                          value={routeForm.description}
                          onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </FormPanel>
                  )}

                  {editRoute && (
                    <FormPanel
                      tone="edit"
                      icon={Route}
                      title={`Editar ruta · ${editRoute.code}`}
                      submitLabel="Actualizar"
                      saving={saving}
                      onCancel={() => setEditRoute(null)}
                      onSubmit={handleUpdateRoute}
                    >
                      <Field label="Código" htmlFor="edit-route-code" required>
                        <input
                          id="edit-route-code"
                          type="text"
                          value={routeForm.code}
                          onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Nombre" htmlFor="edit-route-name" required>
                        <input
                          id="edit-route-name"
                          type="text"
                          value={routeForm.name}
                          onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Tarifa" htmlFor="edit-route-fare">
                        <input
                          id="edit-route-fare"
                          type="text"
                          value={routeForm.fare}
                          onChange={(e) => setRouteForm({ ...routeForm, fare: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Horario" htmlFor="edit-route-schedule">
                        <input
                          id="edit-route-schedule"
                          type="text"
                          value={routeForm.schedule}
                          onChange={(e) => setRouteForm({ ...routeForm, schedule: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Frecuencia" htmlFor="edit-route-frequency">
                        <input
                          id="edit-route-frequency"
                          type="text"
                          value={routeForm.frequency}
                          onChange={(e) => setRouteForm({ ...routeForm, frequency: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Color" htmlFor="edit-route-color">
                        <div className="flex items-center gap-3">
                          <input
                            id="edit-route-color"
                            type="color"
                            value={routeForm.color}
                            onChange={(e) => setRouteForm({ ...routeForm, color: e.target.value })}
                            className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                          />
                          <span className="font-mono text-xs uppercase text-slate-500">{routeForm.color}</span>
                        </div>
                      </Field>
                      <Field
                        label="Descripción"
                        htmlFor="edit-route-description"
                        className="sm:col-span-2 lg:col-span-3"
                      >
                        <input
                          id="edit-route-description"
                          type="text"
                          value={routeForm.description}
                          onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </FormPanel>
                  )}

                  {routes.length === 0 ? (
                    <EmptyState
                      icon={Route}
                      title="Aún no hay rutas"
                      description="Crea la primera ruta para asociarla a una línea de transporte."
                      actionLabel="Nueva ruta"
                      onAction={() => {
                        resetRouteForm();
                        setShowAddRoute(true);
                      }}
                    />
                  ) : (
                    <DataTable
                      caption="Rutas registradas"
                      columns={[
                        { label: 'Código' },
                        { label: 'Nombre' },
                        { label: 'Línea' },
                        { label: 'Tarifa' },
                        { label: 'Estado' },
                        { label: 'Acciones', align: 'right' },
                      ]}
                    >
                      {routes.map((r) => (
                        <tr key={r.id} className="transition-colors hover:bg-slate-50">
                          <td className={cx(tdClass, 'font-mono font-bold text-brand-primary')}>{r.code}</td>
                          <td className={cx(tdClass, 'font-semibold text-slate-900')}>{r.name}</td>
                          <td className={cx(tdClass, 'text-slate-600')}>{r.transportLineName || '—'}</td>
                          <td className={cx(tdClass, 'font-bold text-emerald-600')}>{r.fare || '—'}</td>
                          <td className={tdClass}>
                            <StatusBadge status={r.status} />
                          </td>
                          <td className={tdClass}>
                            <RowActions
                              editLabel={`Editar ruta ${r.code}`}
                              deleteLabel={`Eliminar ruta ${r.code}`}
                              onEdit={() => startEditRoute(r)}
                              onDelete={() => requestDeleteRoute(r)}
                            />
                          </td>
                        </tr>
                      ))}
                    </DataTable>
                  )}
                </>
              )}

              {/* ── LINES ──────────────────────────────────────────── */}
              {activeTab === 'lines' && (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Líneas de transporte</h2>
                      <p className="text-xs text-slate-500">
                        {lines.length} {lines.length === 1 ? 'línea' : 'líneas'} en el sistema
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetLineForm();
                        setShowAddLine(true);
                      }}
                      className={primaryBtn}
                    >
                      <Plus className="h-4 w-4" /> Nueva línea
                    </button>
                  </div>

                  {showAddLine && (
                    <FormPanel
                      icon={Bus}
                      title="Nueva línea"
                      saving={saving}
                      onCancel={resetLineForm}
                      onSubmit={handleCreateLine}
                    >
                      <Field label="Ciudad" htmlFor="line-city">
                        <select
                          id="line-city"
                          value={lineForm.cityId}
                          onChange={(e) => setLineForm({ ...lineForm, cityId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Seleccionar ciudad…</option>
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Nombre" htmlFor="line-name" required>
                        <input
                          id="line-name"
                          type="text"
                          placeholder="Ej. Transportes Ica"
                          value={lineForm.name}
                          onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Código" htmlFor="line-code">
                        <input
                          id="line-code"
                          type="text"
                          placeholder="Ej. L1"
                          value={lineForm.code}
                          onChange={(e) => setLineForm({ ...lineForm, code: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Color" htmlFor="line-color">
                        <div className="flex items-center gap-3">
                          <input
                            id="line-color"
                            type="color"
                            value={lineForm.color}
                            onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })}
                            className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                          />
                          <span className="font-mono text-xs uppercase text-slate-500">{lineForm.color}</span>
                        </div>
                      </Field>
                      <Field label="Empresa" htmlFor="line-company">
                        <input
                          id="line-company"
                          type="text"
                          value={lineForm.company}
                          onChange={(e) => setLineForm({ ...lineForm, company: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Contacto" htmlFor="line-contact">
                        <input
                          id="line-contact"
                          type="text"
                          value={lineForm.contact}
                          onChange={(e) => setLineForm({ ...lineForm, contact: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field
                        label="Descripción"
                        htmlFor="line-description"
                        className="sm:col-span-2 lg:col-span-3"
                      >
                        <input
                          id="line-description"
                          type="text"
                          placeholder="Descripción breve (opcional)"
                          value={lineForm.description}
                          onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </FormPanel>
                  )}

                  {editLine && (
                    <FormPanel
                      tone="edit"
                      icon={Bus}
                      title={`Editar línea · ${editLine.name}`}
                      submitLabel="Actualizar"
                      saving={saving}
                      onCancel={() => setEditLine(null)}
                      onSubmit={handleUpdateLine}
                    >
                      <Field label="Nombre" htmlFor="edit-line-name" required>
                        <input
                          id="edit-line-name"
                          type="text"
                          value={lineForm.name}
                          onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Código" htmlFor="edit-line-code">
                        <input
                          id="edit-line-code"
                          type="text"
                          value={lineForm.code}
                          onChange={(e) => setLineForm({ ...lineForm, code: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Color" htmlFor="edit-line-color">
                        <div className="flex items-center gap-3">
                          <input
                            id="edit-line-color"
                            type="color"
                            value={lineForm.color}
                            onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })}
                            className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                          />
                          <span className="font-mono text-xs uppercase text-slate-500">{lineForm.color}</span>
                        </div>
                      </Field>
                      <Field label="Empresa" htmlFor="edit-line-company">
                        <input
                          id="edit-line-company"
                          type="text"
                          value={lineForm.company}
                          onChange={(e) => setLineForm({ ...lineForm, company: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Contacto" htmlFor="edit-line-contact">
                        <input
                          id="edit-line-contact"
                          type="text"
                          value={lineForm.contact}
                          onChange={(e) => setLineForm({ ...lineForm, contact: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field
                        label="Descripción"
                        htmlFor="edit-line-description"
                        className="sm:col-span-2 lg:col-span-3"
                      >
                        <input
                          id="edit-line-description"
                          type="text"
                          value={lineForm.description}
                          onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </FormPanel>
                  )}

                  {lines.length === 0 ? (
                    <EmptyState
                      icon={Bus}
                      title="Aún no hay líneas"
                      description="Registra la primera empresa o línea de transporte."
                      actionLabel="Nueva línea"
                      onAction={() => {
                        resetLineForm();
                        setShowAddLine(true);
                      }}
                    />
                  ) : (
                    <DataTable
                      caption="Líneas de transporte registradas"
                      columns={[
                        { label: 'Línea' },
                        { label: 'Empresa' },
                        { label: 'Contacto' },
                        { label: 'Estado' },
                        { label: 'Acciones', align: 'right' },
                      ]}
                    >
                      {lines.map((l) => (
                        <tr key={l.id} className="transition-colors hover:bg-slate-50">
                          <td className={tdClass}>
                            <div className="flex items-center gap-2.5">
                              <span
                                className="h-4 w-4 shrink-0 rounded-full border border-slate-200"
                                style={{ backgroundColor: l.color || '#e2e8f0' }}
                                aria-hidden="true"
                              />
                              <span className="font-semibold text-slate-900">{l.name}</span>
                              {l.code && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                                  {l.code}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={cx(tdClass, 'text-slate-600')}>{l.company || '—'}</td>
                          <td className={cx(tdClass, 'text-slate-600')}>{l.contact || '—'}</td>
                          <td className={tdClass}>
                            <StatusBadge status={l.status} />
                          </td>
                          <td className={tdClass}>
                            <RowActions
                              editLabel={`Editar línea ${l.name}`}
                              deleteLabel={`Eliminar línea ${l.name}`}
                              onEdit={() => startEditLine(l)}
                              onDelete={() => requestDeleteLine(l)}
                            />
                          </td>
                        </tr>
                      ))}
                    </DataTable>
                  )}
                </>
              )}

              {/* ── STOPS ──────────────────────────────────────────── */}
              {activeTab === 'stops' && (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Paraderos registrados</h2>
                      <p className="text-xs text-slate-500">
                        {stops.length} {stops.length === 1 ? 'paradero' : 'paraderos'} en el sistema
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetStopForm();
                        setShowAddStop(true);
                      }}
                      className={primaryBtn}
                    >
                      <Plus className="h-4 w-4" /> Nuevo paradero
                    </button>
                  </div>

                  {showAddStop && (
                    <FormPanel
                      icon={MapPin}
                      title="Nuevo paradero"
                      saving={saving}
                      onCancel={resetStopForm}
                      onSubmit={handleCreateStop}
                    >
                      <Field label="Ciudad" htmlFor="stop-city">
                        <select
                          id="stop-city"
                          value={stopForm.cityId}
                          onChange={(e) => setStopForm({ ...stopForm, cityId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Seleccionar ciudad…</option>
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Nombre" htmlFor="stop-name" required>
                        <input
                          id="stop-name"
                          type="text"
                          placeholder="Ej. Paradero Plaza del Sol"
                          value={stopForm.name}
                          onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Referencia" htmlFor="stop-reference">
                        <input
                          id="stop-reference"
                          type="text"
                          placeholder="Ej. Frente al mercado"
                          value={stopForm.reference}
                          onChange={(e) => setStopForm({ ...stopForm, reference: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Dirección" htmlFor="stop-address">
                        <input
                          id="stop-address"
                          type="text"
                          value={stopForm.address}
                          onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Latitud" htmlFor="stop-latitude" required>
                        <input
                          id="stop-latitude"
                          type="number"
                          step="0.0001"
                          placeholder="-14.0678"
                          value={stopForm.latitude}
                          onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })}
                          className={cx(inputClass, 'font-mono')}
                          required
                        />
                      </Field>
                      <Field label="Longitud" htmlFor="stop-longitude" required>
                        <input
                          id="stop-longitude"
                          type="number"
                          step="0.0001"
                          placeholder="-75.7286"
                          value={stopForm.longitude}
                          onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })}
                          className={cx(inputClass, 'font-mono')}
                          required
                        />
                      </Field>
                      <Field label="Accesibilidad" htmlFor="stop-accessible">
                        <label
                          htmlFor="stop-accessible"
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                        >
                          <input
                            id="stop-accessible"
                            type="checkbox"
                            checked={stopForm.isAccessible}
                            onChange={(e) => setStopForm({ ...stopForm, isAccessible: e.target.checked })}
                            className="h-4 w-4 accent-brand-primary"
                          />
                          <span className="text-sm text-slate-700">Paradero accesible</span>
                        </label>
                      </Field>
                    </FormPanel>
                  )}

                  {editStop && (
                    <FormPanel
                      tone="edit"
                      icon={MapPin}
                      title={`Editar paradero · ${editStop.name}`}
                      submitLabel="Actualizar"
                      saving={saving}
                      onCancel={() => setEditStop(null)}
                      onSubmit={handleUpdateStop}
                    >
                      <Field label="Nombre" htmlFor="edit-stop-name" required>
                        <input
                          id="edit-stop-name"
                          type="text"
                          value={stopForm.name}
                          onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Referencia" htmlFor="edit-stop-reference">
                        <input
                          id="edit-stop-reference"
                          type="text"
                          value={stopForm.reference}
                          onChange={(e) => setStopForm({ ...stopForm, reference: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Dirección" htmlFor="edit-stop-address">
                        <input
                          id="edit-stop-address"
                          type="text"
                          value={stopForm.address}
                          onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Latitud" htmlFor="edit-stop-latitude" required>
                        <input
                          id="edit-stop-latitude"
                          type="number"
                          step="0.0001"
                          value={stopForm.latitude}
                          onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })}
                          className={cx(inputClass, 'font-mono')}
                          required
                        />
                      </Field>
                      <Field label="Longitud" htmlFor="edit-stop-longitude" required>
                        <input
                          id="edit-stop-longitude"
                          type="number"
                          step="0.0001"
                          value={stopForm.longitude}
                          onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })}
                          className={cx(inputClass, 'font-mono')}
                          required
                        />
                      </Field>
                      <Field label="Accesibilidad" htmlFor="edit-stop-accessible">
                        <label
                          htmlFor="edit-stop-accessible"
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                        >
                          <input
                            id="edit-stop-accessible"
                            type="checkbox"
                            checked={stopForm.isAccessible}
                            onChange={(e) => setStopForm({ ...stopForm, isAccessible: e.target.checked })}
                            className="h-4 w-4 accent-brand-primary"
                          />
                          <span className="text-sm text-slate-700">Paradero accesible</span>
                        </label>
                      </Field>
                    </FormPanel>
                  )}

                  {stops.length === 0 ? (
                    <EmptyState
                      icon={MapPin}
                      title="Aún no hay paraderos"
                      description="Registra el primer paradero con sus coordenadas."
                      actionLabel="Nuevo paradero"
                      onAction={() => {
                        resetStopForm();
                        setShowAddStop(true);
                      }}
                    />
                  ) : (
                    <DataTable
                      caption="Paraderos registrados"
                      columns={[
                        { label: 'Nombre' },
                        { label: 'Referencia' },
                        { label: 'Coordenadas' },
                        { label: 'Accesible' },
                        { label: 'Acciones', align: 'right' },
                      ]}
                    >
                      {stops.map((s) => (
                        <tr key={s.id} className="transition-colors hover:bg-slate-50">
                          <td className={cx(tdClass, 'font-semibold text-slate-900')}>{s.name}</td>
                          <td className={cx(tdClass, 'max-w-[240px] truncate text-slate-600')}>
                            {s.address || s.reference || '—'}
                          </td>
                          <td className={cx(tdClass, 'whitespace-nowrap font-mono text-[11px] text-slate-500')}>
                            {s.latitude}, {s.longitude}
                          </td>
                          <td className={tdClass}>
                            <AccessibleBadge accessible={Boolean(s.accessible ?? s.isAccessible)} />
                          </td>
                          <td className={tdClass}>
                            <RowActions
                              editLabel={`Editar paradero ${s.name}`}
                              deleteLabel={`Eliminar paradero ${s.name}`}
                              onEdit={() => startEditStop(s)}
                              onDelete={() => requestDeleteStop(s)}
                            />
                          </td>
                        </tr>
                      ))}
                    </DataTable>
                  )}
                </>
              )}

              {/* ── CITIES ─────────────────────────────────────────── */}
              {activeTab === 'cities' && (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Ciudades registradas</h2>
                      <p className="text-xs text-slate-500">
                        {cities.length} {cities.length === 1 ? 'ciudad' : 'ciudades'} en el sistema
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetCityForm();
                        setShowAddCity(true);
                      }}
                      className={primaryBtn}
                    >
                      <Plus className="h-4 w-4" /> Nueva ciudad
                    </button>
                  </div>

                  {showAddCity && (
                    <FormPanel
                      icon={Building2}
                      title="Nueva ciudad"
                      saving={saving}
                      onCancel={resetCityForm}
                      onSubmit={handleCreateCity}
                    >
                      <Field label="Nombre" htmlFor="city-name" required>
                        <input
                          id="city-name"
                          type="text"
                          placeholder="Ej. Ica"
                          value={cityForm.name}
                          onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Departamento" htmlFor="city-department" required>
                        <DepartmentCombobox
                          id="city-department"
                          value={cityForm.department}
                          onChange={(department) => setCityForm((form) => ({ ...form, department }))}
                          departments={PERU_DEPARTMENTS}
                        />
                      </Field>
                      <Field label="País" htmlFor="city-country">
                        <input
                          id="city-country"
                          type="text"
                          value={cityForm.country}
                          className={cx(inputClass, 'bg-slate-50 text-slate-500')}
                          readOnly
                        />
                      </Field>
                      <Field label="Latitud" htmlFor="city-latitude" hint="Ej. -14.0678">
                        <input
                          id="city-latitude"
                          type="number"
                          step="any"
                          placeholder="-14.0678"
                          value={cityForm.latitude}
                          onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Longitud" htmlFor="city-longitude" hint="Ej. -75.7286">
                        <input
                          id="city-longitude"
                          type="number"
                          step="any"
                          placeholder="-75.7286"
                          value={cityForm.longitude}
                          onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Radio de cobertura (km)" htmlFor="city-radius" hint="Ej. 30">
                        <input
                          id="city-radius"
                          type="number"
                          min="1"
                          max="500"
                          value={cityForm.radiusKm}
                          onChange={(e) => setCityForm({ ...cityForm, radiusKm: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </FormPanel>
                  )}

                  {editCity && (
                    <FormPanel
                      tone="edit"
                      icon={Building2}
                      title={`Editar ciudad · ${editCity.name}`}
                      submitLabel="Actualizar"
                      saving={saving}
                      onCancel={() => setEditCity(null)}
                      onSubmit={handleUpdateCity}
                    >
                      <Field label="Nombre" htmlFor="edit-city-name" required>
                        <input
                          id="edit-city-name"
                          type="text"
                          value={cityForm.name}
                          onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </Field>
                      <Field label="Departamento" htmlFor="edit-city-department" required>
                        <DepartmentCombobox
                          id="edit-city-department"
                          value={cityForm.department}
                          onChange={(department) => setCityForm((form) => ({ ...form, department }))}
                          departments={PERU_DEPARTMENTS}
                        />
                      </Field>
                      <Field label="País" htmlFor="edit-city-country">
                        <input
                          id="edit-city-country"
                          type="text"
                          value={cityForm.country}
                          className={cx(inputClass, 'bg-slate-50 text-slate-500')}
                          readOnly
                        />
                      </Field>
                      <Field label="Latitud" htmlFor="edit-city-latitude" hint="Ej. -14.0678">
                        <input
                          id="edit-city-latitude"
                          type="number"
                          step="any"
                          value={cityForm.latitude}
                          onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Longitud" htmlFor="edit-city-longitude" hint="Ej. -75.7286">
                        <input
                          id="edit-city-longitude"
                          type="number"
                          step="any"
                          value={cityForm.longitude}
                          onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Radio de cobertura (km)" htmlFor="edit-city-radius" hint="Ej. 30">
                        <input
                          id="edit-city-radius"
                          type="number"
                          min="1"
                          max="500"
                          value={cityForm.radiusKm}
                          onChange={(e) => setCityForm({ ...cityForm, radiusKm: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </FormPanel>
                  )}

                  {cities.length === 0 ? (
                    <EmptyState
                      icon={Building2}
                      title="Aún no hay ciudades"
                      description="Registra la primera ciudad para organizar líneas y paraderos."
                      actionLabel="Nueva ciudad"
                      onAction={() => {
                        resetCityForm();
                        setShowAddCity(true);
                      }}
                    />
                  ) : (
                    <DataTable
                      caption="Ciudades registradas"
                      minWidth={720}
                      columns={[
                        { label: 'Ciudad' },
                        { label: 'Departamento' },
                        { label: 'País' },
                        { label: 'Coordenadas / Radio' },
                        { label: 'Acciones', align: 'right' },
                      ]}
                    >
                      {cities.map((c) => (
                        <tr key={c.id} className="transition-colors hover:bg-slate-50">
                          <td className={cx(tdClass, 'font-semibold text-slate-900')}>{c.name}</td>
                          <td className={cx(tdClass, 'text-slate-600')}>{c.department}</td>
                          <td className={cx(tdClass, 'text-slate-600')}>{c.country}</td>
                          <td className={cx(tdClass, 'text-slate-600 text-xs')}>
                            {c.latitude != null && c.longitude != null
                              ? `${Number(c.latitude).toFixed(4)}, ${Number(c.longitude).toFixed(4)} (${c.radiusKm} km)`
                              : '—'}
                          </td>
                          <td className={tdClass}>
                            <RowActions
                              editLabel={`Editar ciudad ${c.name}`}
                              deleteLabel={`Eliminar ciudad ${c.name}`}
                              onEdit={() => startEditCity(c)}
                              onDelete={() => requestDeleteCity(c)}
                            />
                          </td>
                        </tr>
                      ))}
                    </DataTable>
                  )}
                </>
              )}

              {/* ── COMMUNITY MODERATION ───────────────────────────── */}
              {activeTab === 'community' && (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Moderación de Comunidad
                      </h2>
                      <p className="text-xs text-slate-500">
                        {communityPosts.length}{' '}
                        {communityPosts.length === 1
                          ? 'publicación activa'
                          : 'publicaciones activas'}{' '}
                        de ciudadanos
                      </p>
                    </div>
                  </div>

                  {communityPosts.length === 0 ? (
                    <EmptyState
                      icon={MessageSquare}
                      title="No hay publicaciones en la comunidad"
                      description="Cuando los ciudadanos compartan alertas o preguntas aparecerán aquí para su moderación."
                    />
                  ) : (
                    <DataTable
                      caption="Publicaciones de la comunidad"
                      minWidth={760}
                      columns={[
                        { label: 'Autor' },
                        { label: 'Categoría' },
                        { label: 'Ruta' },
                        { label: 'Mensaje' },
                        { label: 'Interacción' },
                        { label: 'Fecha' },
                        { label: 'Acciones', align: 'right' },
                      ]}
                    >
                      {communityPosts.map((post) => {
                        const catMeta = getCategoryMeta(post.category);
                        return (
                          <tr
                            key={post.id}
                            className="transition-colors hover:bg-slate-50"
                          >
                            <td
                              className={cx(
                                tdClass,
                                'font-semibold text-slate-900 whitespace-nowrap',
                              )}
                            >
                              {post.authorAlias}
                            </td>
                            <td className={tdClass}>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${catMeta.badgeClass}`}
                              >
                                {catMeta.shortLabel}
                              </span>
                            </td>
                            <td className={cx(tdClass, 'text-slate-600')}>
                              {post.routeCode ? (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
                                  style={{
                                    backgroundColor:
                                      post.routeColor || BRAND_PRIMARY,
                                  }}
                                >
                                  {post.routeCode}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  General
                                </span>
                              )}
                            </td>
                            <td
                              className={cx(
                                tdClass,
                                'text-slate-700 max-w-md truncate',
                              )}
                              title={post.content}
                            >
                              {post.content}
                            </td>
                            <td
                              className={cx(
                                tdClass,
                                'text-slate-500 whitespace-nowrap',
                              )}
                            >
                              {post.likesCount} útiles · {post.commentsCount}{' '}
                              coment.
                            </td>
                            <td
                              className={cx(
                                tdClass,
                                'text-slate-500 whitespace-nowrap',
                              )}
                            >
                              {formatRelativeTime(post.createdAt)}
                            </td>
                            <td className={cx(tdClass, 'text-right')}>
                              <button
                                type="button"
                                onClick={() => requestDeleteCommunityPost(post)}
                                aria-label={`Eliminar publicación de ${post.authorAlias}`}
                                title="Eliminar publicación"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </DataTable>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        loading={confirmLoading}
        onCancel={closeConfirm}
        onConfirm={runConfirm}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
