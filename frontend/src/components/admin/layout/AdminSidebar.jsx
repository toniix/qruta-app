import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Route,
  Bus,
  MapPin,
  Building2,
  MessageSquare,
  Compass,
  LogOut,
  X,
} from 'lucide-react';
import { authService } from '../../../services/authService';

const NAV_ITEMS = [
  { to: '/admin/overview', label: 'Resumen', icon: LayoutDashboard },
  { to: '/admin/rutas', label: 'Rutas', icon: Route },
  { to: '/admin/lineas', label: 'Líneas', icon: Bus },
  { to: '/admin/paraderos', label: 'Paraderos', icon: MapPin },
  { to: '/admin/ciudades', label: 'Ciudades', icon: Building2 },
  { to: '/admin/comunidad', label: 'Comunidad', icon: MessageSquare },
];

export function AdminSidebar({ mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/admin/login');
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-slate-900 text-slate-300">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
          <Link to="/admin/overview" className="flex items-center gap-3 group">
            <img
              src="/qruta-icon.svg"
              alt="QRuta"
              className="h-10 w-10 rounded-xl shadow-lg shadow-black/40 group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white tracking-tight">QRuta</span>
                <span className="rounded-md bg-brand-lime/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-lime">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Panel de Control</p>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="px-3 py-4">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navegación
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-slate-800/80 p-3 space-y-1.5">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors"
        >
          <Compass className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Modo Ciudadano</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-800 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl transition-transform animate-slide-in-top z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
