import { Navigate } from 'react-router-dom';

/**
 * @deprecated The monolithic AdminDashboardPage has been refactored into modular
 * domain pages under `src/pages/admin/`:
 * - overview/AdminOverviewPage
 * - routes/RouteListPage
 * - lines/LineListPage
 * - stops/StopListPage
 * - cities/CityListPage
 * - community/CommunityModerationPage
 */
export function AdminDashboardPage() {
  return <Navigate to="/admin/overview" replace />;
}

export default AdminDashboardPage;
