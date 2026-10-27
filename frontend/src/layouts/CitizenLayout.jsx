import { lazy, Suspense } from 'react';
import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { CitizenRouteFallback } from '../components/common/CitizenRouteFallback';
import { Outlet } from 'react-router-dom';

const GpsPermissionModal = lazy(() =>
  import('../components/common/GpsPermissionModal').then((m) => ({
    default: m.GpsPermissionModal,
  }))
);

export function CitizenLayout() {
  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-surface-page text-ink-primary overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col w-full overflow-hidden relative">
        <Suspense fallback={<CitizenRouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
      {/* GPS permission modal — deferred so it doesn't block critical bundle */}
      <Suspense fallback={null}>
        <GpsPermissionModal />
      </Suspense>
    </div>
  );
}

export default CitizenLayout;
