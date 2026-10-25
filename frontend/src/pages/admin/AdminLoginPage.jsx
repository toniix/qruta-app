import { useEffect, useState } from 'react';
import { Lock, User, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { FieldError } from '../../components/common/FieldError';
import { loginSchema, validateWith } from '../../schemas';

function useNoIndex() {
  useEffect(() => {
    document.title = 'Administración · QRuta';
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const prev = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (created) {
        meta.remove();
      } else if (prev) {
        meta.setAttribute('content', prev);
      }
    };
  }, []);
}

export function AdminLoginPage() {
  useNoIndex();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    const result = validateWith(loginSchema, { email, password });
    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      await authService.login(result.data.email, result.data.password);
      navigate('/admin/overview');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-overlay border border-slate-200/80 p-6 sm:p-8 space-y-6 text-slate-800">
        <div className="text-center space-y-2">
          <img
            src="/qruta-symbol.svg"
            alt="QRuta"
            className="w-12 h-12 mx-auto shrink-0 drop-shadow-sm"
          />
          <h1 className="text-2xl font-bold text-slate-900">Portal de Administración</h1>
          <p className="text-xs text-slate-500">
            Gestión de rutas, líneas de transporte y paraderos de QRuta
          </p>
        </div>

        {/* Default Credentials Hint — solo en desarrollo, nunca en prod */}
        {import.meta.env.DEV && (
          <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Credenciales por defecto:</p>
            <p className="text-blue-600 font-mono">admin@rutasya.pe / admin123</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-2xl text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo electrónico
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.email) return prev;
                    const next = { ...prev };
                    delete next.email;
                    return next;
                  });
                }}
                placeholder="admin@ejemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <FieldError message={fieldErrors.email} className="text-xs" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.password) return prev;
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <FieldError message={fieldErrors.password} className="text-xs" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-4 h-4 text-brand-lime" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al Modo Ciudadano</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
