import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Lock, User } from 'lucide-react';
import { operatorAuthService } from '../../services/operatorAuthService';
import { FieldError } from '../../components/common/FieldError';
import { loginSchema, validateWith } from '../../schemas';

function useNoIndex() {
  useEffect(() => {
    document.title = 'Portal del Operador · QRuta';
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const previous = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (created) {
        meta.remove();
      } else if (previous) {
        meta.setAttribute('content', previous);
      }
    };
  }, []);
}

export function OperatorLoginPage() {
  useNoIndex();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    const result = validateWith(loginSchema, { email, password });
    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await operatorAuthService.login(result.data.email, result.data.password);
      navigate('/operador/overview', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-800 shadow-overlay sm:p-8">
        <div className="space-y-2 text-center">
          <img
            src="/qruta-symbol.svg"
            alt="QRuta"
            className="mx-auto h-12 w-12 shrink-0 drop-shadow-sm"
          />
          <h1 className="text-2xl font-bold text-slate-900">Portal del Operador</h1>
          <p className="text-xs text-slate-500">
            Administra tus líneas, rutas, paraderos y desvíos
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Correo electrónico
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.email) return prev;
                    const next = { ...prev };
                    delete next.email;
                    return next;
                  });
                }}
                placeholder="operador@ejemplo.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <FieldError message={fieldErrors.email} className="text-xs" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.password) return prev;
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <FieldError message={fieldErrors.password} className="text-xs" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-60"
          >
            <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="h-4 w-4 text-brand-lime" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Modo Ciudadano
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OperatorLoginPage;
