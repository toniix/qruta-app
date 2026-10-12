import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, LayoutDashboard } from 'lucide-react';

const ROUTE_LABELS = {
  admin: 'Panel Administrativo',
  overview: 'Resumen',
  rutas: 'Rutas',
  lineas: 'Líneas',
  paraderos: 'Paraderos',
  ciudades: 'Ciudades',
  comunidad: 'Comunidad',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  // If we are at /admin or /admin/overview
  const isOverview =
    pathnames.length <= 1 || (pathnames.length === 2 && pathnames[1] === 'overview');

  return (
    <nav aria-label="Miga de pan" className="flex items-center text-xs text-slate-500">
      <Link
        to="/admin/overview"
        className="inline-flex items-center gap-1.5 font-medium hover:text-blue-600 transition-colors"
      >
        <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
        <span className="hidden sm:inline">Admin</span>
      </Link>

      {!isOverview &&
        pathnames.slice(1).map((segment, index) => {
          const path = `/admin/${pathnames.slice(1, index + 2).join('/')}`;
          const isLast = index === pathnames.slice(1).length - 1;
          const label = ROUTE_LABELS[segment] || segment;

          return (
            <div key={path} className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-slate-300" />
              {isLast ? (
                <span className="font-semibold text-slate-800" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  to={path}
                  className="font-medium hover:text-blue-600 transition-colors"
                >
                  {label}
                </Link>
              )}
            </div>
          );
        })}
    </nav>
  );
}
