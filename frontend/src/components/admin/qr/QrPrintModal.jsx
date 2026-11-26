import { useEffect, useId, useRef } from 'react';
import { X, Printer, Download, Copy, Check, QrCode as QrIcon } from 'lucide-react';
import { QrCodeSvg } from '../../common/QrCodeSvg';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { generateQrSvg, generateQrDataUrl, resolveAbsoluteQrUrl } from '../../../utils/qrGenerator';

export function QrPrintModal({ open, onClose, qr }) {
  const { copied, copy } = useCopyToClipboard();
  const dialogRef = useRef(null);
  const printRef = useRef(null);
  const titleId = useId();
  const isOpen = Boolean(open && qr);

  useEffect(() => {
    if (!isOpen) return undefined;
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
  }, [isOpen]);

  if (!isOpen) return null;

  const qrUrl = resolveAbsoluteQrUrl(qr);

  const handleDialogCancel = (event) => {
    event.preventDefault();
    onClose();
  };

  const handleBackdropClick = (event) => {
    if (typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype) {
      return;
    }
    if (event.target === dialogRef.current) {
      onClose();
    }
  };

  const handleCopy = () => {
    void copy(qrUrl);
  };

  const handleDownloadSvg = () => {
    const fullSvg = generateQrSvg(qrUrl, { margin: 2 });
    const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${qr.code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const dataUrl = generateQrDataUrl(qrUrl, 800);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${qr.code}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      closedby="any"
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
      className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-visible bg-transparent p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <QrIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 id={titleId} className="text-sm font-bold text-slate-900">
                Exportar Código QR
              </h3>
              <p className="text-[11px] text-slate-500">
                Formato para impresión y distribución física
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="flex flex-col items-center bg-slate-50 p-6">
          <div
            ref={printRef}
            id="printable-qr-sheet"
            className="flex w-full max-w-xs flex-col items-center rounded-2xl border-2 border-slate-900 bg-white p-6 text-center shadow-md"
          >
            {/* Branding Header */}
            <div className="mb-3 flex items-center justify-center gap-2">
              <img src="/qruta-symbol.svg" alt="QRuta" width={28} height={28} className="h-7 w-7" />
              <span className="text-base font-black tracking-tight text-slate-900">QRuta</span>
            </div>

            {/* Label and destination */}
            <h4 className="mb-1 line-clamp-2 text-sm font-extrabold text-slate-900">
              {qr.label}
            </h4>
            <p className="mb-4 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
              {qr.targetTitle || qr.targetType}
            </p>

            {/* QR SVG */}
            <div className="mb-4 flex h-48 w-48 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-inner">
              <QrCodeSvg
                value={qrUrl}
                margin={1}
                label={qr.label ? `Código QR para ${qr.label}` : 'Código QR'}
              />
            </div>

            {/* Call to Action */}
            <p className="mb-2 max-w-[200px] text-[11px] font-medium leading-tight text-slate-600">
              Escanea con tu celular para consultar rutas y paraderos en tiempo real.
            </p>

            <span className="select-all font-mono text-[10px] text-slate-400">{qrUrl}</span>
          </div>

          {/* Quick copy link bar */}
          <div className="mt-4 flex w-full max-w-xs items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="truncate font-mono text-[11px] text-slate-600">{qrUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Descargar SVG</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Descargar PNG</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Imprimir Lámina</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
