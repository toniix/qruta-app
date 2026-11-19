import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Menu, ShieldCheck } from 'lucide-react';
import { operatorAuthService } from '../../../services/operatorAuthService';

const labels = {
  '/operador/overview': 'Resumen',
  '/operador/lineas': 'Líneas',
  '/operador/rutas': 'Rutas',
  '/operador/paraderos': 'Paraderos',
  '/operador/desvios': 'Desvíos',
  '/operador/analitica': 'Analítica',
  '/operador/suscripcion': 'Suscripción',
};

export function OperatorTopBar({ onOpenMobile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = operatorAuthService.getCurrentUser();

  const handleLogout = () => {
    operatorAuthService.logout();
    navigate('/operador/login', { replace: true });
  };

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Abrir menú"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Portal del operador
          </p>
          <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
            {labels[location.pathname] || 'Resumen'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          OPERADOR
        </span>
        <Link
          to="/"
          className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Modo Ciudadano
        </Link>
        <span className="hidden max-w-40 truncate text-xs font-medium text-slate-600 md:inline">
          {user?.email || 'Operador'}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export default OperatorTopBar;
