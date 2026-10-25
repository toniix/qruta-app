import { Navigation, MapPin, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useRoutes } from '../../contexts/RouteContext';
import { streetLine } from '../../services/geocodingService';

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
  const { triggerGpsRequest, isLocating, gpsReady, addressStatus, userAddress, currentCity } = useRoutes();

  // Citizen pages own their full-screen mobile layout; the global header is
  // desktop-only there. Admin pages always show it.
  const visibility = isAdmin ? 'flex' : 'hidden sm:flex';

  return (
    <header
      className={`${visibility} sticky top-0 z-30 w-full bg-white border-b border-slate-200`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & tagline */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/qruta-icon.svg"
            alt="QRuta"
            className="w-10 h-10 rounded-xl shadow-2xs group-hover:scale-105 transition-transform duration-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-ink-primary">
                Q<span className="text-brand-primary-green">Ruta</span>
              </span>
              <span className="text-xs font-semibold tracking-wide uppercase bg-slate-100 text-ink-secondary px-2 py-0.5 rounded-full border border-slate-200/80">
                {currentCity?.name || 'Ica'}
              </span>
            </div>
            <p className="text-xs font-medium text-ink-muted hidden lg:flex items-center gap-1">
              Pregunta menos, <span className="text-brand-primary-green font-semibold">muévete más.</span>
            </p>
          </div>
        </Link>

        {/* Desktop section nav (citizen mode only) */}
        {!isAdmin && (
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Secciones">
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
                  className={`px-3.5 py-2 rounded-xl text-sm font-extrabold transition-all duration-200 ${
                    active
                      ? 'bg-brand-navy text-brand-lime shadow-xs border border-border-navy'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-lime shadow-[0_0_6px_rgba(183,243,74,0.8)]" />
                    )}
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!isAdmin && (
            <Link
              to="/buscar"
              aria-label="Buscar rutas en todas las ciudades"
              title="Buscar rutas"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors text-slate-700 bg-slate-100 hover:bg-slate-200"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Buscar</span>
            </Link>
          )}
          {!isAdmin && (
            <button
              onClick={triggerGpsRequest}
              disabled={isLocating}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all max-w-[200px] truncate ${
                gpsReady
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
                {isLocating || addressStatus === 'loading'
                  ? 'Ubicando...'
                  : gpsReady
                    ? streetLine(userAddress) || userAddress?.formattedAddress || 'GPS Activo'
                    : 'Mi Ubicación'}
              </span>
            </button>
          )}

          {isAdmin && (
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Modo Ciudadano</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
