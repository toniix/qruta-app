import { useState, useRef } from 'react';
import { X, Printer, Download, Copy, Check, QrCode as QrIcon } from 'lucide-react';
import { generateQrSvg, generateQrDataUrl, resolveAbsoluteQrUrl } from '../../../utils/qrGenerator';

export function QrPrintModal({ open, onClose, qr }) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  if (!open || !qr) return null;

  const qrUrl = resolveAbsoluteQrUrl(qr);
  const svgMarkup = generateQrSvg(qrUrl, { margin: 1 });

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <QrIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Exportar Código QR</h3>
              <p className="text-[11px] text-slate-500">Formato para impresión y distribución física</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 bg-slate-50 flex flex-col items-center">
          <div
            ref={printRef}
            id="printable-qr-sheet"
            className="w-full max-w-xs bg-white rounded-2xl border-2 border-slate-900 p-6 shadow-md text-center flex flex-col items-center"
          >
            {/* Branding Header */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src="/qruta-symbol.svg" alt="QRuta" className="h-7 w-7" />
              <span className="text-base font-black tracking-tight text-slate-900">QRuta</span>
            </div>

            {/* Label and destination */}
            <h4 className="text-sm font-extrabold text-slate-900 line-clamp-2 mb-1">
              {qr.label}
            </h4>
            <p className="text-[11px] font-semibold text-blue-600 mb-4 px-2 py-0.5 rounded-full bg-blue-50 inline-block">
              {qr.targetTitle || qr.targetType}
            </p>

            {/* QR SVG */}
            <div
              className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center mb-4"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />

            {/* Call to Action */}
            <p className="text-[11px] font-medium text-slate-600 max-w-[200px] leading-tight mb-2">
              Escanea con tu celular para consultar rutas y paraderos en tiempo real.
            </p>

            <span className="text-[10px] font-mono text-slate-400 select-all">
              {qrUrl}
            </span>
          </div>

          {/* Quick copy link bar */}
          <div className="mt-4 flex w-full max-w-xs items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="truncate font-mono text-[11px] text-slate-600">{qrUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Descargar SVG</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Descargar PNG</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir Lámina</span>
          </button>
        </div>
      </div>
    </div>
  );
}
