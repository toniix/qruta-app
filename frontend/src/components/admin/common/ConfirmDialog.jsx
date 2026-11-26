import { useEffect, useId, useRef } from 'react';
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
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previousActive = document.activeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
    cancelRef.current?.focus();

    return () => {
      if (dialog.open) {
        dialog.close();
      }
      if (previousActive instanceof HTMLElement && previousActive.isConnected) {
        previousActive.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const isDanger = tone === 'danger';

  const handleDialogCancel = (event) => {
    event.preventDefault();
    if (!loading) {
      onCancel();
    }
  };

  const handleBackdropClick = (event) => {
    if (typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype) {
      return;
    }
    if (event.target === dialogRef.current && !loading) {
      onCancel();
    }
  };

  const dialogNode = (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      closedby={loading ? 'none' : 'any'}
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
      className="m-auto w-[calc(100%-2rem)] max-w-md overflow-visible bg-transparent p-0 backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs"
    >
      <div className="animate-slide-in-bottom rounded-2xl border border-slate-200 bg-white p-6 shadow-overlay">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? 'border border-rose-100 bg-rose-50 text-rose-600'
                : 'border border-amber-100 bg-amber-50 text-amber-600'
            }`}
          >
            {isDanger ? (
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            autoFocus
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
                ? 'bg-rose-600 shadow-rose-600/20 hover:bg-rose-700'
                : 'bg-amber-600 shadow-amber-600/20 hover:bg-amber-700'
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );

  return typeof document !== 'undefined' ? createPortal(dialogNode, document.body) : null;
}
