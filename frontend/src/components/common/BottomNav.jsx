import { Home, Map, Route, Heart, MapPin } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRoutes } from '../../contexts/RouteContext';

const NAV_ITEMS = [
  { label: 'Inicio',    icon: Home,   path: '/' },
  { label: 'Mapa',      icon: Map,    path: '/mapa' },
  { label: 'Rutas',     icon: Route,  path: '/rutas' },
  { label: 'Favoritos', icon: Heart,  path: '/favoritos' },
  { label: 'Lugares',   icon: MapPin, path: '/lugares' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSelection } = useRoutes();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path) => {
    // Placeholders — stay put
    if (path === '/favoritos' || path === '/lugares') return;
    clearSelection();
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white border-t border-gray-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const active = isActive(path);
          const isPlaceholder = path === '/favoritos' || path === '/lugares';

          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-90 ${
                active
                  ? 'text-[#7c3aed]'
                  : isPlaceholder
                    ? 'text-gray-300 cursor-default'
                    : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label={label}
            >
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-1.5 w-1 h-1 rounded-full bg-[#7c3aed] animate-fade-in" />
              )}

              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] leading-none transition-all duration-200 ${
                  active ? 'font-bold' : 'font-medium'
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
