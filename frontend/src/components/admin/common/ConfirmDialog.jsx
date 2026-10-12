import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger', // 'danger' | 'warning'
  loading = false,
  onCancel,
  onConfirm,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const isDanger = tone === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => !loading && onCancel()}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-desc' : undefined}
        className="relative w-full max-w-md animate-slide-in-bottom rounded-2xl border border-slate-200 bg-white p-6 shadow-overlay"
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}
          >
            {isDanger ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </span>

          <div className="flex-1 min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id="confirm-dialog-desc" className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-card transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
