import { Routes, Route, Navigate } from "react-router-dom";
import { CitizenLayout } from "../layouts/CitizenLayout";
import { HomeMapPage } from "../pages/citizen/HomeMapPage";
import { RoutesListPage } from "../pages/citizen/RoutesListPage";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { authService } from "../services/authService";

function ProtectedAdminRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<CitizenLayout />}>
        <Route path="/" element={<HomeMapPage />} />
        <Route path="/rutas" element={<RoutesListPage />} />
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
  );
}
