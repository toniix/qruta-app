import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { GpsPermissionModal } from '../components/common/GpsPermissionModal';
import { Outlet, useLocation } from 'react-router-dom';

export function CitizenLayout() {
  const location = useLocation();
  // Hide top header on citizen views (Home, Mapa, Rutas) to allow full-screen layout
  const hideTopHeader = !location.pathname.startsWith('/admin');

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {!hideTopHeader && <Header />}
      <main className="flex-1 flex flex-col w-full overflow-hidden relative">
        <Outlet />
      </main>
      <BottomNav />
      {/* GPS permission modal — shown once per session if needed */}
      <GpsPermissionModal />
    </div>
  );
}
