import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CitizenLayout } from "../layouts/CitizenLayout";
import { HomePage } from "../pages/citizen/HomePage";
import { HomeMapPage } from "../pages/citizen/HomeMapPage";
import { authService } from "../services/authService";

// Lazy-loaded pages for mobile bundle optimization
const RoutesListPage = lazy(() =>
  import("../pages/citizen/RoutesListPage").then((m) => ({
    default: m.RoutesListPage,
  })),
);
const SearchPage = lazy(() =>
  import("../pages/citizen/SearchPage").then((m) => ({
    default: m.SearchPage,
  })),
);
const NearbyRoutesPage = lazy(() =>
  import("../pages/citizen/NearbyRoutesPage").then((m) => ({
    default: m.NearbyRoutesPage,
  })),
);
const CommunityPage = lazy(() =>
  import("../pages/citizen/CommunityPage").then((m) => ({
    default: m.CommunityPage,
  })),
);
const PlacesPage = lazy(() =>
  import("../pages/citizen/PlacesPage").then((m) => ({
    default: m.PlacesPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import("../pages/admin/AdminLoginPage").then((m) => ({
    default: m.AdminLoginPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("../pages/admin/AdminDashboardPage").then((m) => ({
    default: m.AdminDashboardPage,
  })),
);

function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-3 border-blue-600/30 border-t-blue-600 animate-spin" />
    </div>
  );
}

function ProtectedAdminRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route element={<CitizenLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/buscar" element={<SearchPage />} />
          <Route path="/cercanas" element={<NearbyRoutesPage />} />
          <Route path="/mapa" element={<HomeMapPage />} />
          <Route path="/mapa/ruta/:id" element={<HomeMapPage />} />
          <Route path="/rutas" element={<RoutesListPage />} />
          <Route path="/comunidad" element={<CommunityPage />} />
          <Route
            path="/favoritos"
            element={<Navigate to="/lugares?tab=rutas" replace />}
          />
          <Route path="/lugares" element={<PlacesPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboardPage />
              </ProtectedAdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
