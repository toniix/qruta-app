import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { CitizenLayout } from '../layouts/CitizenLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { HomePage } from '../pages/citizen/HomePage';
import { authService } from '../services/authService';

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

// Lazy-loaded Admin pages
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

function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-brand-primary animate-spin" />
    </div>
  );
}

function ProtectedAdminRoute({ children }) {
  // Chequeo local sincrónico (existe + no expirado); la validez real la confirma /me.
  const [state, setState] = useState(() =>
    authService.getToken()
      ? { checking: true, allowed: false }
      : { checking: false, allowed: false },
  );

  useEffect(() => {
    if (!state.checking) return;
    let cancelled = false;
    authService
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
  }, [state.checking]);

  if (state.checking) {
    return <PageLoading />;
  }
  if (!state.allowed) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function AdminLoginRoute({ children }) {
  // Authenticated admins never see the login form again.
  if (authService.isAuthenticated()) {
    return <Navigate to="/admin/overview" replace />;
  }
  return children;
}

function RouteAliasRedirect() {
  const { id } = useParams();
  return <Navigate to={`/mapa/ruta/${id}`} replace />;
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
          <Route path="/ruta/:id" element={<RouteAliasRedirect />} />
          <Route path="/rutas" element={<RoutesListPage />} />
          <Route path="/comunidad" element={<CommunityPage />} />
          <Route
            path="/favoritos"
            element={<Navigate to="/lugares?tab=rutas" replace />}
          />
          <Route path="/lugares" element={<PlacesPage />} />
        </Route>

        {/* ── Standalone Admin Login (noindex, fuera del layout ciudadano) ─── */}
        <Route
          path="/admin/login"
          element={
            <AdminLoginRoute>
              <AdminLoginPage />
            </AdminLoginRoute>
          }
        />

        {/* ── Dedicated Admin Management Tree ──────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="dashboard" element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="rutas" element={<RouteListPage />} />
          <Route path="lineas" element={<LineListPage />} />
          <Route path="paraderos" element={<StopListPage />} />
          <Route path="ciudades" element={<CityListPage />} />
          <Route path="comunidad" element={<CommunityModerationPage />} />
        </Route>

        {/* ── Catch-All Fallback ────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
