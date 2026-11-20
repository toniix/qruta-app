import { apiClient } from './apiClient';

function unwrap(response) {
  return response.data;
}

export const adminAnalyticsService = {
  async getOverview(from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return unwrap(await apiClient.get(`/admin/analytics/overview${query ? `?${query}` : ''}`));
  },

  async getRouteSeries(routeId, from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return unwrap(await apiClient.get(`/admin/analytics/routes/${routeId}${query ? `?${query}` : ''}`));
  },
};
