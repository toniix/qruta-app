import { Map, Route, Navigation, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRoutes } from '../../contexts/RouteContext';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { onlyNearby, toggleNearby, clearSelection } = useRoutes();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden glass-panel border-t border-slate-200/90 pb-safe shadow-xl backdrop-blur-xl bg-white/95">
      <div className="flex items-center justify-around h-15 px-2">
        <button
          onClick={() => {
            clearSelection();
            navigate('/');
          }}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-transform ${
            isActive('/') && !onlyNearby ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px]">Mapa</span>
        </button>

        <button
          onClick={() => {
            clearSelection();
            navigate('/rutas');
          }}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-transform ${
            isActive('/rutas') ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Route className="w-5 h-5" />
          <span className="text-[10px]">Rutas</span>
        </button>

        <button
          onClick={() => {
            toggleNearby();
            if (location.pathname !== '/') navigate('/');
          }}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-transform ${
            onlyNearby ? 'text-emerald-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-full ${onlyNearby ? 'bg-emerald-100' : ''}`}>
            <Navigation className="w-4 h-4" />
          </div>
          <span className="text-[10px]">Cercanas</span>
        </button>

        <button
          onClick={() => navigate('/admin/login')}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-transform ${
            location.pathname.startsWith('/admin') ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px]">Admin</span>
        </button>
      </div>
    </nav>
  );
}
