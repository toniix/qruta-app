import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext } from './ToastContextInstance';

let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success', durationMs = 4000) => {
      if (!message) return;
      const id = ++toastSeq;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (durationMs > 0) {
        setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (msg, duration) => showToast(msg, 'success', duration),
      error: (msg, duration) => showToast(msg, 'error', duration),
      warning: (msg, duration) => showToast(msg, 'warning', duration),
      info: (msg, duration) => showToast(msg, 'info', duration),
      dismiss,
    }),
    [showToast, dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex max-w-sm w-full flex-col gap-2.5 px-4 sm:px-0"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-overlay backdrop-blur-md transition-all duration-200 animate-slide-in-bottom"
              >
                <span className="mt-0.5 shrink-0">
                  {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
                  {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                  {t.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
                </span>
                <div className="flex-1 text-xs font-medium text-slate-800 leading-snug">
                  {t.message}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Cerrar notificación"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
