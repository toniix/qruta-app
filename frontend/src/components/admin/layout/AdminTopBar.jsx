import { Menu, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { authService } from '../../../services/authService';

export function AdminTopBar({ onOpenMobile }) {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const email = currentUser?.email || 'admin@rutasya.pe';

  const handleLogout = () => {
    authService.logout();
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Abrir menú"
          className="md:hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-3">
        {/* User Pill */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-700">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px]">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold hidden sm:inline max-w-[140px] truncate">
            {email}
          </span>
          <span className="rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 px-1 py-0.2">
            ADMIN
          </span>
        </div>

        {/* Quick logout */}
        <button
          type="button"
          onClick={handleLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
