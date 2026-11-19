import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { OperatorSidebar } from '../components/operator/layout/OperatorSidebar';
import { OperatorTopBar } from '../components/operator/layout/OperatorTopBar';
import { ToastProvider } from '../components/admin/common/ToastContext';
import { operatorPortalService } from '../services/operatorPortalService';

const BLOCKED_STATUSES = new Set(['PAST_DUE', 'CANCELED', 'EXPIRED']);

const STATUS_MESSAGES = {
  PAST_DUE: 'Tu suscripción está vencida.',
  CANCELED: 'Tu suscripción fue cancelada.',
  EXPIRED: 'Tu suscripción expiró.',
};

export function OperatorLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    let active = true;
    operatorPortalService
      .getSubscription()
      .then((subscription) => {
        if (active) {
          setSubscriptionStatus(String(subscription?.status || '').toUpperCase());
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const blockedStatus = BLOCKED_STATUSES.has(subscriptionStatus) ? subscriptionStatus : null;

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const previous = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (created) {
        meta.remove();
      } else if (previous) {
        meta.setAttribute('content', previous);
      }
    };
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-slate-100 font-sans text-slate-800">
        <OperatorSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <OperatorTopBar onOpenMobile={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 focus:outline-none">
            {blockedStatus && (
              <div
                role="alert"
                className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
              >
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {STATUS_MESSAGES[blockedStatus]} Puedes seguir consultando tus rutas, pero no
                    editar el catálogo hasta regularizar el pago.
                  </p>
                </div>
                <Link
                  to="/operador/suscripcion"
                  className="inline-flex rounded-xl bg-amber-900 px-3 py-2 font-bold text-white hover:bg-amber-800"
                >
                  Regularizar pago
                </Link>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default OperatorLayout;
