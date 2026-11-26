import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { CitizenLayout } from '../layouts/CitizenLayout';
import { HomePage } from '../pages/citizen/HomePage';
import { authService } from '../services/authService';
import { operatorAuthService } from '../services/operatorAuthService';

// Lazy-loaded Citizen pages for mobile bundle optimization
const HomeMapPage = lazy(() =>
  import('../pages/citizen/HomeMapPage').then((m) => ({
    default: m.HomeMapPage,
  }))
);
const RoutesListPage = lazy(() =>
  import('../pages/citizen/RoutesListPage').then((m) => ({
    default: m.RoutesListPage,
  }))
);
const SearchPage = lazy(() =>
  import('../pages/citizen/SearchPage').then((m) => ({
    default: m.SearchPage,
  }))
);
const NearbyRoutesPage = lazy(() =>
  import('../pages/citizen/NearbyRoutesPage').then((m) => ({
    default: m.NearbyRoutesPage,
  }))
);
const CommunityPage = lazy(() =>
  import('../pages/citizen/CommunityPage').then((m) => ({
    default: m.CommunityPage,
  }))
);
const PlacesPage = lazy(() =>
  import('../pages/citizen/PlacesPage').then((m) => ({
    default: m.PlacesPage,
  }))
);
const QrRedirectHandler = lazy(() =>
  import('../pages/citizen/QrRedirectHandler').then((m) => ({
    default: m.QrRedirectHandler,
  }))
);

// Lazy-loaded Admin pages
const AdminLayout = lazy(() =>
  import('../layouts/AdminLayout').then((m) => ({
    default: m.AdminLayout,
  }))
);
const AdminLoginPage = lazy(() =>
  import('../pages/admin/AdminLoginPage').then((m) => ({
    default: m.AdminLoginPage,
  }))
);
const AdminOverviewPage = lazy(() =>
  import('../pages/admin/overview/AdminOverviewPage').then((m) => ({
    default: m.AdminOverviewPage,
  }))
);
const RouteListPage = lazy(() =>
  import('../pages/admin/routes/RouteListPage').then((m) => ({
    default: m.RouteListPage,
  }))
);
const LineListPage = lazy(() =>
  import('../pages/admin/lines/LineListPage').then((m) => ({
    default: m.LineListPage,
  }))
);
const StopListPage = lazy(() =>
  import('../pages/admin/stops/StopListPage').then((m) => ({
    default: m.StopListPage,
  }))
);
const CityListPage = lazy(() =>
  import('../pages/admin/cities/CityListPage').then((m) => ({
    default: m.CityListPage,
  }))
);
const CommunityModerationPage = lazy(() =>
  import('../pages/admin/community/CommunityModerationPage').then((m) => ({
    default: m.CommunityModerationPage,
  }))
);
const OperatorListPage = lazy(() =>
  import('../pages/admin/operators/OperatorListPage').then((m) => ({
    default: m.OperatorListPage,
  }))
);
const AdminQrListPage = lazy(() =>
  import('../pages/admin/qr/AdminQrListPage').then((m) => ({
    default: m.AdminQrListPage,
  }))
);
const AdminQrDetailPage = lazy(() =>
  import('../pages/admin/qr/AdminQrDetailPage').then((m) => ({
    default: m.AdminQrDetailPage,
  }))
);

const OperatorLoginPage = lazy(() =>
  import('../pages/operator/OperatorLoginPage').then((m) => ({
    default: m.OperatorLoginPage,
  }))
);
const OperatorLayout = lazy(() =>
  import('../layouts/OperatorLayout').then((m) => ({
    default: m.OperatorLayout,
  }))
);
const OperatorOverviewPage = lazy(() =>
  import('../pages/operator/OperatorOverviewPage').then((m) => ({
    default: m.OperatorOverviewPage,
  }))
);
const OperatorLinesPage = lazy(() =>
  import('../pages/operator/OperatorLinesPage').then((m) => ({
    default: m.OperatorLinesPage,
  }))
);
const OperatorRoutesPage = lazy(() =>
  import('../pages/operator/OperatorRoutesPage').then((m) => ({
    default: m.OperatorRoutesPage,
  }))
);
const OperatorStopsPage = lazy(() =>
  import('../pages/operator/OperatorStopsPage').then((m) => ({
    default: m.OperatorStopsPage,
  }))
);
const OperatorDisruptionsPage = lazy(() =>
  import('../pages/operator/OperatorDisruptionsPage').then((m) => ({
    default: m.OperatorDisruptionsPage,
  }))
);
const OperatorAnalyticsPage = lazy(() =>
  import('../pages/operator/OperatorAnalyticsPage').then((m) => ({
    default: m.OperatorAnalyticsPage,
  }))
);
const OperatorSubscriptionPage = lazy(() =>
  import('../pages/operator/OperatorSubscriptionPage').then((m) => ({
    default: m.OperatorSubscriptionPage,
  }))
);
const OperatorQrListPage = lazy(() =>
  import('../pages/operator/OperatorQrListPage').then((m) => ({
    default: m.OperatorQrListPage,
  }))
);
const OperatorQrDetailPage = lazy(() =>
  import('../pages/operator/OperatorQrDetailPage').then((m) => ({
    default: m.OperatorQrDetailPage,
  }))
);

function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-brand-primary animate-spin" />
    </div>
  );
}

function ProtectedPortalRoute({ auth, loginPath, children }) {
  // Synchronous local check (token presence); backend /me confirms session validity.
  const [state, setState] = useState(() =>
    auth.getToken()
      ? { checking: true, allowed: false }
      : { checking: false, allowed: false },
  );

  useEffect(() => {
    if (!state.checking) return;
    let cancelled = false;
    auth
      .me()
      .then(() => {
        if (!cancelled) setState({ checking: false, allowed: true });
      })
      .catch(() => {
        if (!cancelled) setState({ checking: false, allowed: false });
      });
    return () => {
      cancelled = true;
    };
  }, [auth, state.checking]);

  if (state.checking) {
    return <PageLoading />;
  }
  if (!state.allowed) {
    return <Navigate to={loginPath} replace />;
  }
  return children;
}

function PortalLoginRoute({ auth, homePath, children }) {
  // Authenticated portal users skip the login form.
  if (auth.isAuthenticated()) {
    return <Navigate to={homePath} replace />;
  }
  return children;
}

function RouteAliasRedirect() {
  const { id } = useParams();
  return <Navigate to={`/mapa/ruta/${id}`} replace />;
}

function StopAliasRedirect() {
  const { id } = useParams();
  return <Navigate to={`/mapa/paradero/${id}`} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* ── Citizen Portal Routes ────────────────────────────────────────── */}
        <Route element={<CitizenLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/buscar" element={<SearchPage />} />
          <Route path="/cercanas" element={<NearbyRoutesPage />} />
          <Route path="/mapa" element={<HomeMapPage />} />
          <Route path="/mapa/ruta/:id" element={<HomeMapPage />} />
          <Route path="/mapa/paradero/:id" element={<HomeMapPage />} />
          <Route path="/ruta/:id" element={<RouteAliasRedirect />} />
          <Route path="/paradero/:id" element={<StopAliasRedirect />} />
          <Route path="/q/:code" element={<QrRedirectHandler />} />
          <Route path="/rutas" element={<RoutesListPage />} />
          <Route path="/comunidad" element={<CommunityPage />} />
          <Route
            path="/favoritos"
            element={<Navigate to="/lugares?tab=rutas" replace />}
          />
          <Route path="/lugares" element={<PlacesPage />} />
        </Route>

        {/* ── Standalone Admin Login (noindex, outside citizen layout) ─────── */}
        <Route
          path="/admin/login"
          element={
            <PortalLoginRoute auth={authService} homePath="/admin/overview">
              <AdminLoginPage />
            </PortalLoginRoute>
          }
        />

        {/* ── Dedicated Admin Management Tree ──────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedPortalRoute auth={authService} loginPath="/admin/login">
              <AdminLayout />
            </ProtectedPortalRoute>
          }
        >
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="dashboard" element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="rutas" element={<RouteListPage />} />
          <Route path="lineas" element={<LineListPage />} />
          <Route path="paraderos" element={<StopListPage />} />
          <Route path="ciudades" element={<CityListPage />} />
          <Route path="operadores" element={<OperatorListPage />} />
          <Route path="qr-codes" element={<AdminQrListPage />} />
          <Route path="qr-codes/:id" element={<AdminQrDetailPage />} />
          <Route path="comunidad" element={<CommunityModerationPage />} />
        </Route>

        <Route
          path="/operador/login"
          element={
            <PortalLoginRoute auth={operatorAuthService} homePath="/operador/overview">
              <OperatorLoginPage />
            </PortalLoginRoute>
          }
        />

        <Route
          path="/operador"
          element={
            <ProtectedPortalRoute auth={operatorAuthService} loginPath="/operador/login">
              <OperatorLayout />
            </ProtectedPortalRoute>
          }
        >
          <Route index element={<Navigate to="/operador/overview" replace />} />
          <Route path="overview" element={<OperatorOverviewPage />} />
          <Route path="lineas" element={<OperatorLinesPage />} />
          <Route path="rutas" element={<OperatorRoutesPage />} />
          <Route path="paraderos" element={<OperatorStopsPage />} />
          <Route path="desvios" element={<OperatorDisruptionsPage />} />
          <Route path="qr-codes" element={<OperatorQrListPage />} />
          <Route path="qr-codes/:id" element={<OperatorQrDetailPage />} />
          <Route path="analitica" element={<OperatorAnalyticsPage />} />
          <Route path="suscripcion" element={<OperatorSubscriptionPage />} />
        </Route>

        {/* ── Catch-All Fallback ────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
