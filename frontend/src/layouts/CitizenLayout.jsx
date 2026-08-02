import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { GpsPermissionModal } from '../components/common/GpsPermissionModal';
import { Outlet } from 'react-router-dom';

export function CitizenLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1 flex flex-col w-full pb-16 sm:pb-0 overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
      {/* GPS permission modal — shown once per session if needed */}
      <GpsPermissionModal />
    </div>
  );
}
