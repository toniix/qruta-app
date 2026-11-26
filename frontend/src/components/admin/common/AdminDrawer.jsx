import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save } from 'lucide-react';

export function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  onSubmit,
  submitLabel = 'Guardar',
  loading = false,
  maxWidth = 'max-w-xl',
  footer,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previousActive = document.activeElement;
    if (!dialog.open) {
      dialog.showModal();
    }

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

  const handleDialogCancel = (event) => {
    event.preventDefault();
    if (!loading) {
      onClose();
    }
  };

  const handleBackdropClick = (event) => {
    if (typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype) {
      return;
    }
    if (event.target === dialogRef.current && !loading) {
      onClose();
    }
  };

  const content = (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      closedby={loading ? 'none' : 'any'}
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
      className={`m-0 ml-auto h-dvh max-h-dvh w-full ${maxWidth} bg-transparent p-0 backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs open:flex`}
    >
      {/* Drawer Container */}
      <div className="flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/50 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-sm font-bold text-slate-900">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar panel lateral"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body & Form wrapper */}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">{children}</div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200/80 bg-slate-50/60 px-6 py-4">
              {footer ? (
                footer
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-card transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" aria-hidden="true" /> {submitLabel}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-200/80 bg-slate-50/60 px-6 py-4">
                {footer}
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
