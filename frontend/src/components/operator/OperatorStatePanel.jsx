import { AlertCircle, Loader2 } from 'lucide-react';

export function OperatorStatePanel({ loading, error, title, description, onRetry }) {
  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Cargando información...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertCircle className="h-6 w-6 text-rose-600" />
        <div>
          <p className="text-sm font-bold text-rose-800">{title || 'No se pudo cargar'}</p>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-sm font-bold text-slate-700">{title || 'Sin información'}</p>
      {description && <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>}
    </div>
  );
}

export default OperatorStatePanel;
