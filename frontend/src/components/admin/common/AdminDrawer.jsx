import { useEffect, useRef } from 'react';
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
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[9980] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`relative flex h-full w-full ${maxWidth} flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out border-l border-slate-200 z-10`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 id="drawer-title" className="text-sm font-bold text-slate-900 truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar panel lateral"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body & Form wrapper */}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>

            {/* Footer */}
            <div className="border-t border-slate-200/80 bg-slate-50/60 px-6 py-4 flex items-center justify-end gap-2.5">
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
                        <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> {submitLabel}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        ) : (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
            {footer && (
              <div className="border-t border-slate-200/80 bg-slate-50/60 px-6 py-4 flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
