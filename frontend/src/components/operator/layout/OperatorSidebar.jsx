import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bus,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPin,
  Route,
  TriangleAlert,
  X,
} from 'lucide-react';
import { operatorAuthService } from '../../../services/operatorAuthService';

const navigation = [
  { to: '/operador/overview', label: 'Resumen', icon: LayoutDashboard },
  { to: '/operador/lineas', label: 'Líneas', icon: Bus },
  { to: '/operador/rutas', label: 'Rutas', icon: Route },
  { to: '/operador/paraderos', label: 'Paraderos', icon: MapPin },
  { to: '/operador/desvios', label: 'Desvíos', icon: TriangleAlert },
  { to: '/operador/analitica', label: 'Analítica', icon: BarChart3 },
  { to: '/operador/suscripcion', label: 'Suscripción', icon: CreditCard },
];

export function OperatorSidebar({ mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();
  const user = operatorAuthService.getCurrentUser();

  const handleLogout = () => {
    operatorAuthService.logout();
    navigate('/operador/login', { replace: true });
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <Link to="/operador/overview" className="flex items-center gap-3">
            <img src="/qruta-symbol.svg" alt="QRuta" className="h-9 w-9 shrink-0" />
            <span className="flex flex-col">
              <span className="text-sm font-bold text-white">QRuta Operador</span>
              <span className="text-[10px] uppercase tracking-wider text-brand-lime">
                Portal B2B
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar menú"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Gestión de red
          </p>
          <ul className="space-y-1">
            {navigation.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-lime/15 text-brand-lime'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-800 px-4 py-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-800/70 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-lime/15 text-xs font-bold text-brand-lime">
              OP
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {user?.operatorName || user?.fullName || 'Operador'}
              </p>
              <p className="truncate text-[11px] text-slate-400">{user?.email || ''}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

export default OperatorSidebar;
