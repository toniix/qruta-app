import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/admin/layout/AdminSidebar';
import { AdminTopBar } from '../components/admin/layout/AdminTopBar';
import { ToastProvider } from '../components/admin/common/ToastContext';

export function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-slate-100 font-sans text-slate-800">
        {/* Sidebar */}
        <AdminSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AdminTopBar onOpenMobile={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 focus:outline-none">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default AdminLayout;
