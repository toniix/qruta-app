import { Bus, Navigation, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useRoutes } from '../../contexts/RouteContext';

const CITIZEN_LINKS = [
  { label: 'Inicio', path: '/' },
  { label: 'Mapa', path: '/mapa' },
  { label: 'Rutas', path: '/rutas' },
  { label: 'Comunidad', path: '/comunidad' },
  { label: 'Lugares', path: '/lugares' },
];

export function Header() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const { triggerGpsRequest, isLocating, hasCustomLocation, userAddress } = useRoutes();

  // Citizen pages own their full-screen mobile layout; the global header is
  // desktop-only there. Admin pages always show it.
  const visibility = isAdmin ? 'flex' : 'hidden sm:flex';

  return (
    <header
      className={`${visibility} sticky top-0 z-30 w-full glass-panel border-b border-slate-200/80 shadow-xs`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & tagline */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-slate-900">
                Ruta<span className="text-brand-primary">Ya</span>
              </span>
              <span className="text-xs font-bold tracking-wider uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/70 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Ica
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 hidden lg:flex items-center gap-1">
              ¿A dónde vamos hoy?
            </p>
          </div>
        </Link>

        {/* Desktop section nav (citizen mode only) */}
        {!isAdmin && (
          <nav className="hidden lg:flex items-center gap-1" aria-label="Secciones">
            {CITIZEN_LINKS.map(({ label, path }) => {
              const active =
                path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-blue-50 text-brand-primary'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!isAdmin && (
            <button
              onClick={triggerGpsRequest}
              disabled={isLocating}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all max-w-[200px] truncate ${
                hasCustomLocation
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={
                userAddress?.formattedAddress
                  ? `Ubicación: ${userAddress.formattedAddress}`
                  : 'Obtener GPS actual'
              }
            >
              <MapPin
                className={`w-3.5 h-3.5 shrink-0 ${isLocating ? 'animate-spin text-brand-primary' : ''}`}
              />
              <span className="hidden md:inline truncate">
                {isLocating
                  ? 'Ubicando...'
                  : hasCustomLocation
                    ? userAddress?.street || userAddress?.formattedAddress || 'GPS Activo'
                    : 'Mi Ubicación'}
              </span>
            </button>
          )}

          {isAdmin ? (
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Modo Ciudadano</span>
            </Link>
          ) : (
            <Link
              to="/admin/login"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Acceso Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
