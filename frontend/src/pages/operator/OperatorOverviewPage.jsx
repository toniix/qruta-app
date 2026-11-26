import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bus, MapPin, Route as RouteIcon, TriangleAlert } from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { MetricCard } from '../../components/admin/common/MetricCard';
import { OperatorStatePanel } from '../../components/operator/OperatorStatePanel';
import { STALE_TIMES } from '../../lib/queryClient';
import { operatorKeys } from '../../lib/queryKeys';
import { operatorPortalService } from '../../services/operatorPortalService';
import { operatorAuthService } from '../../services/operatorAuthService';

const EMPTY_LIST = [];
const selectArray = (data) => (Array.isArray(data) ? data : []);

export function OperatorOverviewPage() {
  const [fallbackProfile] = useState(() => operatorAuthService.getCurrentUser());

  const linesQuery = useQuery({
    queryKey: operatorKeys.lines(),
    queryFn: () => operatorPortalService.getLines(),
    staleTime: STALE_TIMES.CATALOG,
    select: selectArray,
  });

  const routesQuery = useQuery({
    queryKey: operatorKeys.routes(),
    queryFn: () => operatorPortalService.getRoutes(),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: selectArray,
  });

  const stopsQuery = useQuery({
    queryKey: operatorKeys.stops(),
    queryFn: () => operatorPortalService.getStops(),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: selectArray,
  });

  const disruptionsQuery = useQuery({
    queryKey: operatorKeys.disruptions(),
    queryFn: () => operatorPortalService.getDisruptions(),
    staleTime: STALE_TIMES.OPERATIONAL,
    select: selectArray,
  });

  const profileQuery = useQuery({
    queryKey: operatorKeys.overview(),
    queryFn: () => operatorPortalService.getProfile().catch(() => null),
    staleTime: STALE_TIMES.METRICS,
  });

  const lines = linesQuery.data ?? EMPTY_LIST;
  const routes = routesQuery.data ?? EMPTY_LIST;
  const stops = stopsQuery.data ?? EMPTY_LIST;
  const allDisruptions = disruptionsQuery.data ?? EMPTY_LIST;
  const profile = profileQuery.data ?? fallbackProfile;

  const loading =
    linesQuery.isPending ||
    routesQuery.isPending ||
    stopsQuery.isPending ||
    disruptionsQuery.isPending;

  const firstError =
    linesQuery.error ||
    routesQuery.error ||
    stopsQuery.error ||
    disruptionsQuery.error;

  const error = firstError
    ? firstError.response?.data?.message || firstError.message || 'No se pudo cargar el resumen'
    : null;

  const counts = {
    lines: lines.length,
    routes: routes.length,
    stops: stops.length,
    disruptions: allDisruptions.filter((item) => item.active).length,
  };
  const disruptions = allDisruptions.slice(0, 5);

  const handleRetry = () => {
    void Promise.all([
      linesQuery.refetch(),
      routesQuery.refetch(),
      stopsQuery.refetch(),
      disruptionsQuery.refetch(),
      profileQuery.refetch(),
    ]);
  };

  return (
    <div>
      <OperatorPageHeader
        title={`Hola, ${profile?.operatorName || profile?.fullName || 'Operador'}`}
        description="Resumen general de tu red operativa"
      />

      {error && (
        <div className="mb-5">
          <OperatorStatePanel error={error} title="No se pudo cargar el resumen" onRetry={handleRetry} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Líneas"
          value={loading ? '—' : counts.lines}
          subtitle="Asignadas a tu operación"
          icon={Bus}
          colorScheme="blue"
          to="/operador/lineas"
        />
        <MetricCard
          title="Rutas"
          value={loading ? '—' : counts.routes}
          subtitle="Rutas activas y planificadas"
          icon={RouteIcon}
          colorScheme="emerald"
          to="/operador/rutas"
        />
        <MetricCard
          title="Paraderos"
          value={loading ? '—' : counts.stops}
          subtitle="Puntos de tu red"
          icon={MapPin}
          colorScheme="purple"
          to="/operador/paraderos"
        />
        <MetricCard
          title="Desvíos activos"
          value={loading ? '—' : counts.disruptions}
          subtitle="Alteraciones vigentes"
          icon={TriangleAlert}
          colorScheme="rose"
          to="/operador/desvios"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
        <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
        {loading ? (
          <p className="mt-3 text-xs text-slate-500">Cargando...</p>
        ) : disruptions.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            No hay desvíos recientes para mostrar.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {disruptions.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {item.type} · {item.routeName || item.routeCode || 'Ruta'}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{item.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.active ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.active ? 'Activo' : 'Finalizado'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default OperatorOverviewPage;
