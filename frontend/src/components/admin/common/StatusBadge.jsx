import { Check, X } from 'lucide-react';

export function StatusBadge({ status, activeLabel = 'Activo', inactiveLabel = 'Inactivo' }) {
  const isActive = status === 'ACTIVE' || status === true;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
          : 'bg-slate-100 text-slate-600 border border-slate-200/60'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
        }`}
      />
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}

export function AccessibleBadge({ accessible }) {
  const isAcc = Boolean(accessible);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isAcc
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
          : 'bg-slate-100 text-slate-500 border border-slate-200/60'
      }`}
    >
      {isAcc ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-slate-400" />}
      {isAcc ? 'Accesible' : 'Estándar'}
    </span>
  );
}
