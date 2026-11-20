import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Handles `/q/:code` requests directly on the frontend domain.
 * Performs a clean top-level browser navigation to the backend tracking resolver,
 * which logs the scan and 302-redirects to https://front.anthonywar.dev.
 * Using top-level navigation avoids any in-page CORS fetch restrictions.
 */
export function QrRedirectHandler() {
  const { code } = useParams();

  useEffect(() => {
    if (!code) {
      window.location.replace('https://front.anthonywar.dev/');
      return;
    }

    const backendUrl = 'https://back.anthonywar.dev';
    window.location.replace(`${backendUrl}/q/${encodeURIComponent(code)}`);
  }, [code]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      <p className="text-sm font-semibold text-slate-700">Redirigiendo a tu destino...</p>
    </div>
  );
}

export default QrRedirectHandler;
