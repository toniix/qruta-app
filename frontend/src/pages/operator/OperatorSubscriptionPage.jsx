import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, TriangleAlert } from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { OperatorStatePanel } from '../../components/operator/OperatorStatePanel';
import { useAdminToast } from '../../hooks/useAdminToast';
import { STALE_TIMES } from '../../lib/queryClient';
import { operatorKeys } from '../../lib/queryKeys';
import { operatorAuthService } from '../../services/operatorAuthService';
import { operatorPortalService } from '../../services/operatorPortalService';
import { formatDateTime } from '../../utils/dateUtils';
import { isSafeHttpsUrl } from '../../utils/urlUtils';

const STATUS_LABELS = {
  ACTIVE: 'Activa',
  TRIAL: 'En prueba',
  PAST_DUE: 'Vencida',
  CANCELED: 'Cancelada',
  EXPIRED: 'Expirada',
};

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  TRIAL: 'bg-blue-50 text-blue-700 ring-blue-200',
  PAST_DUE: 'bg-amber-50 text-amber-700 ring-amber-200',
  CANCELED: 'bg-rose-50 text-rose-700 ring-rose-200',
  EXPIRED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const PERIOD_STATUS_LABELS = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
};

const BLOCKED_STATUSES = new Set(['PAST_DUE', 'CANCELED', 'EXPIRED']);

function formatAmount(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const numeric = Number(amount);
  const formatted = Number.isFinite(numeric)
    ? new Intl.NumberFormat('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numeric)
    : String(amount);
  return currency ? `${formatted} ${currency}` : formatted;
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-[10px] uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd>
    </div>
  );
}

export function OperatorSubscriptionPage() {
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [user] = useState(() => operatorAuthService.getCurrentUser());
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  const subscriptionQuery = useQuery({
    queryKey: operatorKeys.subscription(),
    queryFn: async () => {
      try {
        return await operatorPortalService.getSubscription();
      } catch (err) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const subscription = subscriptionQuery.data ?? null;
  const loading = subscriptionQuery.isPending;
  const error = subscriptionQuery.isError
    ? subscriptionQuery.error?.response?.data?.message ||
      subscriptionQuery.error?.message ||
      'No se pudo cargar la suscripción'
    : null;

  const handleRetry = () => {
    setCheckoutUrl(null);
    void subscriptionQuery.refetch();
  };

  const checkoutMutation = useMutation({
    mutationFn: (payload) => operatorPortalService.createCheckout(payload),
    onSuccess: async (checkout) => {
      if (checkout?.checkoutUrl) {
        if (!isSafeHttpsUrl(checkout.checkoutUrl)) {
          toast.error('El enlace de pago recibido no es válido.');
          return;
        }
        const safeUrl = checkout.checkoutUrl.trim();
        setCheckoutUrl(safeUrl);
        window.open(safeUrl, '_self');
        toast.info('Abriendo la pasarela de pago...');
      } else {
        toast.success('Solicitud de pago creada');
      }
      await queryClient.invalidateQueries({ queryKey: operatorKeys.subscription() });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'No se pudo iniciar el pago');
    },
  });

  const handleCheckout = () => {
    checkoutMutation.mutate({
      plan: subscription?.plan || 'PRO',
      method: 'QR',
    });
  };

  const creatingCheckout = checkoutMutation.isPending;
  const status = String(subscription?.status || '').toUpperCase();
  const statusLabel = STATUS_LABELS[status] || status || 'Sin estado';
  const periods = Array.isArray(subscription?.periods) ? subscription.periods : [];
  const blocked = BLOCKED_STATUSES.has(status);

  return (
    <div>
      <OperatorPageHeader
        title="Suscripción"
        description="Plan contratado y estado de facturación"
        actions={
          <button
            type="button"
            onClick={handleCheckout}
            disabled={creatingCheckout || loading || Boolean(error)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingCheckout ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-lime" />
            ) : (
              <CreditCard className="h-4 w-4 text-brand-lime" />
            )}
            {creatingCheckout ? 'Generando pago...' : 'Pagar ahora'}
          </button>
        }
      />

      {user?.operatorName && (
        <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operador</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{user.operatorName}</p>
        </div>
      )}

      {loading ? (
        <OperatorStatePanel loading />
      ) : error ? (
        <OperatorStatePanel error={error} title="No se pudo cargar la suscripción" onRetry={handleRetry} />
      ) : !subscription ? (
        <OperatorStatePanel
          title="Sin datos de suscripción"
          description="No hay información de facturación disponible para esta operación en este momento."
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Plan y estado</h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 ring-slate-200'}`}
              >
                {statusLabel} ({status || '—'})
              </span>
            </div>

            {blocked && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  La suscripción no permite editar el catálogo hasta regularizar el pago. La lectura
                  de tus rutas publicadas continúa disponible.
                </p>
              </div>
            )}

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Plan" value={subscription.plan || '—'} />
              <Detail label="Inicio" value={formatDateTime(subscription.startsAt)} />
              <Detail label="Renovación" value={formatDateTime(subscription.renewsAt)} />
              <Detail label="Gracia hasta" value={formatDateTime(subscription.graceUntil)} />
            </dl>

            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Abrir enlace de pago
              </a>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">Historial de pagos</h3>
            </div>
            {periods.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-slate-500">
                Todavía no hay periodos de facturación registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        Periodo
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Monto
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Método
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Estado
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Referencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {periods.map((period) => (
                      <tr key={period.id || period.providerReference}>
                        <td className="px-5 py-3 text-slate-700">
                          {formatDateTime(period.fromAt)} — {formatDateTime(period.toAt)}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {formatAmount(period.amount, period.currency)}
                        </td>
                        <td className="px-5 py-3 text-slate-700">{period.method || '—'}</td>
                        <td className="px-5 py-3 text-slate-700">
                          {PERIOD_STATUS_LABELS[period.status] || period.status || '—'}
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {period.providerReference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorSubscriptionPage;
