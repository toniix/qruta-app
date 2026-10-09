import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { GpsPermissionModal } from '../components/common/GpsPermissionModal';
import { Outlet, useLocation } from 'react-router-dom';

export function CitizenLayout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-surface-page text-ink-primary overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col w-full overflow-hidden relative">
        <Outlet />
      </main>
      {!isAdmin && <BottomNav />}
      {/* GPS permission modal — shown once per session if needed */}
      <GpsPermissionModal />
    </div>
  );
}
