import { useContext, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { FieldError } from './FieldError';
import { ToastContext } from '../admin/common/ToastContextInstance';
import { useNoIndex } from '../../hooks/useNoIndex';
import { loginSchema, validateWith } from '../../schemas';

function resolveLoginErrorMessage(err) {
  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') {
      return 'La solicitud tardó demasiado. Verificá tu conexión e intentá nuevamente.';
    }
    if (err?.message && !/network error/i.test(err.message)) {
      return err.message;
    }
    return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
  }

  const status = err.response.status;
  const rawMessage = typeof err.response.data?.message === 'string'
    ? err.response.data.message.trim()
    : '';

  if (status === 401 || /invalid.*credentials|bad credentials/i.test(rawMessage)) {
    return 'Correo o contraseña incorrectos.';
  }
  if (status === 403 || /inactive|disabled/i.test(rawMessage)) {
    return 'Tu cuenta está inactiva o deshabilitada. Contactá al administrador.';
  }
  if (status === 429) {
    return 'Demasiados intentos fallidos. Esperá un momento antes de volver a intentar.';
  }
  if (status >= 500) {
    return 'Error interno del servidor. Intentá nuevamente más tarde.';
  }

  return rawMessage || 'No se pudo iniciar sesión. Verificá los datos ingresados.';
}

export function PortalLoginPage({
  pageTitle,
  heading,
  subtitle,
  emailPlaceholder,
  onLogin,
  redirectTo,
  redirectReplace = false,
  schema = loginSchema,
  devHint = null,
}) {
  useNoIndex(pageTitle);

  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const emailErrorId = useId();
  const passwordErrorId = useId();
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);

    const result = validateWith(schema, { email, password });
    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      if (result.fieldErrors.email) {
        emailInputRef.current?.focus();
      } else if (result.fieldErrors.password) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      await onLogin(result.data.email, result.data.password);
      navigate(redirectTo, redirectReplace ? { replace: true } : undefined);
    } catch (err) {
      const errorMessage = resolveLoginErrorMessage(err);
      setError(errorMessage);
      toast?.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-800 shadow-overlay sm:p-8">
        <div className="space-y-2 text-center">
          <img
            src="/qruta-symbol.svg"
            alt="QRuta"
            width={48}
            height={48}
            className="mx-auto h-12 w-12 shrink-0 drop-shadow-sm"
          />
          <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        {devHint}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Correo electrónico
            </label>
            <div className="relative flex items-center">
              <User
                className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                ref={emailInputRef}
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
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
                placeholder={emailPlaceholder}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? emailErrorId : undefined}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
            <FieldError id={emailErrorId} message={fieldErrors.email} className="text-xs" />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock
                className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                ref={passwordInputRef}
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                enterKeyHint="done"
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
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm focus:border-blue-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <FieldError id={passwordErrorId} message={fieldErrors.password} className="text-xs" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
          >
            <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="h-4 w-4 text-brand-lime" aria-hidden="true" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Volver al Modo Ciudadano</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default PortalLoginPage;
