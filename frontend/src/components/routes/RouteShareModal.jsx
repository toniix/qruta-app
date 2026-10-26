import { useEffect, useRef, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import {
  buildRouteShareData,
  getShareLinks,
  copyToClipboard,
} from '../../utils/shareUtils';

/**
 * Accessible fallback modal to share a route via WhatsApp, Telegram, or copy the link for Instagram/other apps.
 */
export function RouteShareModal({ isOpen, onClose, route }) {
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef(null);
  const modalRef = useRef(null);

  const shareData = buildRouteShareData(route);
  const { whatsapp, telegram } = getShareLinks(shareData);

  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus close button when modal opens
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(shareData.url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
  };

  const code = route?.code || 'Ruta';
  const color = route?.color || 'var(--color-brand-primary)';
  const name = (route?.name || '').replace(/^Ruta \w+:\s*/i, '');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
      data-testid="share-modal-backdrop"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-5 flex flex-col space-y-4 animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-7 text-white font-bold text-xs rounded-lg flex justify-center items-center shrink-0 uppercase tracking-wider"
              style={{ backgroundColor: color }}
            >
              {code}
            </div>
            <div>
              <h3
                id="share-modal-title"
                className="text-sm font-bold text-slate-900 leading-tight"
              >
                Compartir ruta
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[180px]">
                {name || 'Detalles de la ruta'}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-label="Cerrar modal de compartir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Channels */}
        <div className="flex flex-col space-y-2.5">
          {/* WhatsApp */}
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100/90 transition-all font-medium text-sm border border-emerald-200/60 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Compartir en WhatsApp"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                aria-hidden="true"
              >
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.41a8.16 8.16 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.76-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29" />
              </svg>
            </span>
            <span>Compartir por WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100/90 transition-all font-medium text-sm border border-sky-200/60 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Compartir en Telegram"
          >
            <span className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37" />
              </svg>
            </span>
            <span>Compartir por Telegram</span>
          </a>

          {/* Copy Link (for Instagram & others) */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              copied
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 text-slate-800 hover:bg-slate-100/90 border-slate-200/80'
            }`}
            aria-label={copied ? 'Enlace copiado al portapapeles' : 'Copiar enlace de la ruta'}
          >
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white'
              }`}
            >
              {copied ? (
                <Check className="w-5 h-5 animate-scale-up" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-none stroke-current stroke-2"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              )}
            </span>
            <div className="text-left flex-1">
              <span className="block font-semibold">
                {copied ? '¡Enlace copiado!' : 'Copiar para Instagram / Redes'}
              </span>
              <span className="block text-xs text-slate-500 font-normal">
                {copied ? 'Listo para pegar en tu historia o chat' : 'Copia el link directo a la ruta'}
              </span>
            </div>
            {!copied && <Copy className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>
        </div>

        {/* Informative accessibility helper */}
        <div aria-live="polite" className="sr-only">
          {copied ? 'Enlace copiado al portapapeles exitosamente' : ''}
        </div>
      </div>
    </div>
  );
}
