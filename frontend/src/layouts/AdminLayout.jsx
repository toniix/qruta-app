import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/admin/layout/AdminSidebar';
import { AdminTopBar } from '../components/admin/layout/AdminTopBar';
import { ToastProvider } from '../components/admin/common/ToastContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { PortalQueryProvider } from '../components/common/PortalQueryProvider';
import { useNoIndex } from '../hooks/useNoIndex';

export function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Admin panel must never be indexed by search engines.
  useNoIndex();

  return (
    <PortalQueryProvider>
      <ToastProvider>
        <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-slate-100 font-sans text-slate-800">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-xl focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
          >
            Saltar al contenido principal
          </a>

          {/* Sidebar */}
          <AdminSidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <AdminTopBar onOpenMobile={() => setMobileSidebarOpen(true)} />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 focus:outline-none"
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </ToastProvider>
    </PortalQueryProvider>
  );
}

export default AdminLayout;
