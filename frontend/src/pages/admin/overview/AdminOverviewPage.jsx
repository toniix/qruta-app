import { useState, useEffect, useCallback } from 'react';
import {
  Route,
  Bus,
  MapPin,
  Building2,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MetricCard } from '../../../components/admin/common/MetricCard';
import { StatusBadge } from '../../../components/admin/common/StatusBadge';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminLineService } from '../../../services/adminLineService';
import { adminStopService } from '../../../services/adminStopService';
import { cityService } from '../../../services/cityService';
import { communityService } from '../../../services/communityService';
import { useAdminToast } from '../../../hooks/useAdminToast';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const toast = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    routes: [],
    lines: [],
    stops: [],
    cities: [],
    community: [],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [routes, lines, stops, cities, community] = await Promise.all([
        adminRouteService.getAllRoutes().catch(() => []),
        adminLineService.getAllLines().catch(() => []),
        adminStopService.getAllStops().catch(() => []),
        cityService.getAdminCities().catch(() => []),
        communityService.getAdminPosts().catch(() => []),
      ]);

      setData({
        routes: Array.isArray(routes) ? routes : [],
        lines: Array.isArray(lines) ? lines : [],
        stops: Array.isArray(stops) ? stops : [],
        cities: Array.isArray(cities) ? cities : [],
        community: Array.isArray(community) ? community : [],
      });
    } catch (err) {
      console.error('Error cargando métricas:', err);
      toast.error('Error al cargar métricas del sistema.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [routes, lines, stops, cities, community] = await Promise.all([
          adminRouteService.getAllRoutes().catch(() => []),
          adminLineService.getAllLines().catch(() => []),
          adminStopService.getAllStops().catch(() => []),
          cityService.getAdminCities().catch(() => []),
          communityService.getAdminPosts().catch(() => []),
        ]);

        if (isMounted) {
          setData({
            routes: Array.isArray(routes) ? routes : [],
            lines: Array.isArray(lines) ? lines : [],
            stops: Array.isArray(stops) ? stops : [],
            cities: Array.isArray(cities) ? cities : [],
            community: Array.isArray(community) ? community : [],
          });
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error cargando métricas:', err);
          toast.error('Error al cargar métricas del sistema.');
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const recentRoutes = data.routes.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Panel de Control Central
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Gestión Operativa de Red QRuta
          </h1>
          <p className="text-xs text-blue-100 max-w-xl">
            Supervisa en tiempo real las rutas, líneas concesionadas, paraderos georreferenciados y alertas de la ciudadanía.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm transition self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar datos</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Rutas Activas"
          value={loading ? '...' : data.routes.length}
          subtitle="Redes urbanas e interurbanas"
          icon={Route}
          colorScheme="blue"
          to="/admin/rutas"
        />

        <MetricCard
          title="Líneas de Transporte"
          value={loading ? '...' : data.lines.length}
          subtitle="Empresas y consorcios"
          icon={Bus}
          colorScheme="emerald"
          to="/admin/lineas"
        />

        <MetricCard
          title="Paraderos"
          value={loading ? '...' : data.stops.length}
          subtitle="Puntos de abordaje"
          icon={MapPin}
          colorScheme="purple"
          to="/admin/paraderos"
        />

        <MetricCard
          title="Ciudades"
          value={loading ? '...' : data.cities.length}
          subtitle="Zonas de cobertura"
          icon={Building2}
          colorScheme="amber"
          to="/admin/ciudades"
        />

        <MetricCard
          title="Comunidad"
          value={loading ? '...' : data.community.length}
          subtitle="Reportes y alertas"
          icon={MessageSquare}
          colorScheme="rose"
          to="/admin/comunidad"
        />
      </div>

      {/* Quick Actions & Recent Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Accesos Rápidos</h2>
            <p className="text-xs text-slate-500 mb-4">
              Crea entidades operativas o gestiona las coberturas rápidamente.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/admin/rutas')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-left transition hover:bg-blue-50/70 hover:border-blue-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Route className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                      Gestionar Rutas
                    </h3>
                    <p className="text-[11px] text-slate-500">Configurar recorridos y paraderos</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/lineas')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-left transition hover:bg-emerald-50/70 hover:border-emerald-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Bus className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                      Gestionar Líneas
                    </h3>
                    <p className="text-[11px] text-slate-500">Empresas, colores y flotas</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/paraderos')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-left transition hover:bg-purple-50/70 hover:border-purple-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                      Gestionar Paraderos
                    </h3>
                    <p className="text-[11px] text-slate-500">Georreferenciación en mapa interactivo</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> API Operativa
            </span>
            <span>Versión 2.0 Modular</span>
          </div>
        </div>

        {/* Recent Routes Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Rutas en Operación</h2>
                <p className="text-xs text-slate-500">
                  Resumen de las rutas principales registradas en la plataforma.
                </p>
              </div>

              <Link
                to="/admin/rutas"
                className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 transition"
              >
                <span>Ver todas</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Código</th>
                    <th className="px-3 py-2.5">Nombre</th>
                    <th className="px-3 py-2.5">Línea</th>
                    <th className="px-3 py-2.5">Tarifa</th>
                    <th className="px-3 py-2.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-3 py-3">
                          <div className="h-3.5 bg-slate-100 rounded w-12" />
                        </td>
                        <td className="px-3 py-3">
                          <div className="h-3.5 bg-slate-100 rounded w-32" />
                        </td>
                        <td className="px-3 py-3">
                          <div className="h-3.5 bg-slate-100 rounded w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <div className="h-3.5 bg-slate-100 rounded w-14" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="h-3.5 bg-slate-100 rounded w-16 ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : recentRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                        No hay rutas registradas todavía.
                      </td>
                    </tr>
                  ) : (
                    recentRoutes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          <span
                            className="inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold text-white"
                            style={{ backgroundColor: r.color || '#2563eb' }}
                          >
                            {r.code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{r.name}</td>
                        <td className="px-3 py-2.5 text-slate-600">{r.transportLineName || '—'}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">
                          {r.fare ? `S/ ${r.fare}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <StatusBadge status={r.status || 'ACTIVE'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total: {data.routes.length} rutas en el sistema</span>
            <Link to="/admin/rutas" className="font-semibold text-blue-600 hover:underline">
              Ir al listado completo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminOverviewPage;
