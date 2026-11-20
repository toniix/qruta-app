import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Handles `/q/:code` requests directly on the frontend domain.
 * Automatically forwards the citizen to the backend tracking resolver to log the scan
 * and follow the 302 redirect to the ultimate internal destination.
 */
export function QrRedirectHandler() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    const backendRoot = apiBase.replace(/\/api\/?$/, '');
    window.location.replace(`${backendRoot}/q/${encodeURIComponent(code)}`);
  }, [code, navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      <p className="text-sm font-semibold text-slate-700">Redirigiendo a tu destino...</p>
    </div>
  );
}

export default QrRedirectHandler;
