import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Route as RouteIcon } from 'lucide-react';
import { OperatorPageHeader } from '../../components/operator/OperatorPageHeader';
import { OperatorStatePanel } from '../../components/operator/OperatorStatePanel';

import { operatorPortalService } from '../../services/operatorPortalService';

const formatter = new Intl.NumberFormat('es-PE');

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 29);
  return { from: isoDate(from), to: isoDate(to) };
}

function sumMetric(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function demandOf(entry) {
  return Number(entry.views || 0) + Number(entry.searches || 0) + Number(entry.qrScans || 0);
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-900">{formatter.format(value)}</p>
    </div>
  );
}

function DailyDemandChart({ entries, title }) {
  if (!entries.length) {
    return (
      <p className="py-8 text-center text-xs text-slate-500">
        No hay datos de demanda para el rango seleccionado.
      </p>
    );
  }

  const width = 640;
  const height = 180;
  const padding = 24;
  const max = Math.max(1, ...entries.map(demandOf));
  const step = entries.length > 1 ? (width - padding * 2) / (entries.length - 1) : 0;
  const points = entries.map((entry, index) => ({
    x: padding + index * step,
    y: height - padding - (demandOf(entry) / max) * (height - padding * 2),
    date: entry.date,
    value: demandOf(entry),
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const lastIndex = points.length - 1;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 w-full min-w-[520px]"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <polyline
          points={line}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.date || index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={index === lastIndex ? '#1d4ed8' : '#2563eb'}
          />
        ))}
        {points.length <= 8
          ? points.map((point, index) => (
              <text
                key={`${point.date || index}-label`}
                x={point.x}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
              >
                {point.date}
              </text>
            ))
          : [points[0], points[lastIndex]].map((point, index) => (
              <text
                key={`${point.date || index}-edge`}
                x={index === 0 ? padding : width - padding}
                y={height - 6}
                textAnchor={index === 0 ? 'start' : 'end'}
                fontSize="9"
                fill="#64748b"
              >
                {point.date}
              </text>
            ))}
      </svg>
    </div>
  );
}

export function OperatorAnalyticsPage() {
  const initialRange = defaultRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [routeSeries, setRouteSeries] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await operatorPortalService.getAnalyticsSummary(from, to);
      setSummary({
        lines: payload?.lines || [],
        days: payload?.days || [],
        routes: payload?.routes || [],
        qrCampaigns: payload?.qrCampaigns || [],
      });
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || err.message || 'No se pudo cargar la analítica');
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void Promise.resolve().then(loadSummary);
  }, [loadSummary]);

  const selectRoute = useCallback(
    async (routeId) => {
      setSelectedRouteId(routeId);
      setRouteSeries(null);
      setRouteError(null);
      setRouteLoading(true);
      try {
        const payload = await operatorPortalService.getRouteAnalytics(routeId, from, to);
        setRouteSeries(payload);
      } catch (err) {
        setRouteError(err.response?.data?.message || err.message || 'No se pudo cargar la serie de la ruta');
      } finally {
        setRouteLoading(false);
      }
    },
    [from, to]
  );

  const lines = summary?.lines || [];
  const days = summary?.days || [];
  const routes = summary?.routes || [];
  const campaigns = summary?.qrCampaigns || [];

  return (
    <div>
      <OperatorPageHeader
        title="Analítica"
        description="Indicadores de desempeño de tu red"
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Desde
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Hasta
          <input
            type="date"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {loading ? (
        <OperatorStatePanel loading />
      ) : error ? (
        <OperatorStatePanel error={error} title="No se pudo cargar la analítica" onRetry={loadSummary} />
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Resumen de la red</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Visualizaciones" value={sumMetric(lines, 'views')} />
              <MetricCard label="Búsquedas" value={sumMetric(lines, 'searches')} />
              <MetricCard label="Escaneos QR" value={sumMetric(lines, 'qrScans')} />
              <MetricCard label="Dispositivos únicos" value={sumMetric(lines, 'uniqueDevices')} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Demanda por día</h3>
              <span className="text-xs text-slate-500">Vistas + búsquedas + QR</span>
            </div>
            <DailyDemandChart entries={days} title="Demanda diaria de la red" />
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <RouteIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Rutas más consultadas</h3>
            </div>
            {routes.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">Sin rutas consultadas en el rango.</p>
            ) : (
              <div className="space-y-2">
                {routes.map((route) => (
                  <button
                    key={route.routeId}
                    type="button"
                    onClick={() => void selectRoute(route.routeId)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      selectedRouteId === route.routeId
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-300'
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {route.routeName}
                      </span>
                      <span className="block text-xs text-slate-500">{route.routeCode || route.routeId}</span>
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatter.format(route.interactions)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedRouteId && (
              <div className="mt-5 border-t border-slate-200 pt-5">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Serie diaria de la ruta
                </h4>
                {routeLoading ? (
                  <OperatorStatePanel loading />
                ) : routeError ? (
                  <OperatorStatePanel error={routeError} title="No se pudo cargar la serie de la ruta" />
                ) : (
                  <DailyDemandChart entries={routeSeries?.series || []} title="Demanda diaria por ruta" />
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Escaneos QR por campaña</h3>
            {campaigns.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">Sin campañas registradas en el rango.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.campaign} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600">
                      {campaign.campaign === 'UNATTRIBUTED' ? 'Sin campaña' : campaign.campaign}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-slate-900">
                      {formatter.format(campaign.scans)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default OperatorAnalyticsPage;
