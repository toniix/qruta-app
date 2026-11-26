import { lazy, Suspense } from 'react';
import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { CitizenRouteFallback } from '../components/common/CitizenRouteFallback';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { RouteProvider } from '../contexts/RouteContext';
import { Outlet } from 'react-router-dom';

const GpsPermissionModal = lazy(() =>
  import('../components/common/GpsPermissionModal').then((m) => ({
    default: m.GpsPermissionModal,
  }))
);

export function CitizenLayout() {
  return (
    <RouteProvider>
      <div className="h-screen h-[100dvh] flex flex-col bg-surface-page text-ink-primary overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-xl focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 flex flex-col w-full overflow-hidden relative focus:outline-none"
        >
          <ErrorBoundary>
            <Suspense fallback={<CitizenRouteFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <BottomNav />
        {/* GPS permission modal — deferred so it doesn't block critical bundle */}
        <Suspense fallback={null}>
          <GpsPermissionModal />
        </Suspense>
      </div>
    </RouteProvider>
  );
}

export default CitizenLayout;
