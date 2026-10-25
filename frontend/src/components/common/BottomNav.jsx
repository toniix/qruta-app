import { Home, Map, Route, MessageSquare, MapPin } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useRoutes } from '../../contexts/RouteContext';

const NAV_ITEMS = [
  { label: 'Inicio', icon: Home, path: '/' },
  { label: 'Mapa', icon: Map, path: '/mapa' },
  { label: 'Rutas', icon: Route, path: '/rutas' },
  { label: 'Comunidad', icon: MessageSquare, path: '/comunidad' },
  { label: 'Lugares', icon: MapPin, path: '/lugares' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedRoute } = useRoutes();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path) => {
    // If clicking on Mapa and user was viewing a route, restore that route's URL
    let targetPath = path;
    if (path === '/mapa' && selectedRoute?.id) {
      targetPath = `/mapa/ruta/${selectedRoute.id}`;
    }

    if (location.pathname === targetPath) return;
    navigate(targetPath);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-brand-navy/95 backdrop-blur-lg border-t border-border-navy pb-safe shadow-2xl transition-colors"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const active = isActive(path);

          return (
            <button
              key={path}
              type="button"
              onClick={() => handleNav(path)}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-all duration-200 cursor-pointer active:scale-95 ${
                active
                  ? 'text-brand-lime'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Luminous lime indicator pill for active tab */}
              {active && (
                <span className="absolute top-0 w-8 h-1 rounded-full bg-brand-lime shadow-[0_0_12px_rgba(183,243,74,0.7)] animate-fade-in" />
              )}

              <div
                className={`flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-brand-lime/15 text-brand-lime'
                    : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-surface-navy/60'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    active ? 'scale-110 text-brand-lime' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  strokeWidth={active ? 2.5 : 1.9}
                />
              </div>

              <span
                className={`text-[11px] leading-tight transition-colors duration-200 tracking-tight ${
                  active ? 'font-extrabold text-brand-lime' : 'font-medium text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
