import { apiClient } from './apiClient';

function unwrap(response) {
  return response.data;
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function rangeQuery(from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const operatorPortalService = {
  async getProfile() {
    return unwrap(await apiClient.get('/operator/profile'));
  },

  async getLines() {
    return toList(unwrap(await apiClient.get('/operator/lines')));
  },

  async updateLine(id, payload) {
    return unwrap(await apiClient.put(`/operator/lines/${id}`, payload));
  },

  async getRoutes() {
    return toList(unwrap(await apiClient.get('/operator/routes')));
  },

  async getRouteById(id) {
    return unwrap(await apiClient.get(`/operator/routes/${id}`));
  },

  async updateRoute(id, payload) {
    return unwrap(await apiClient.put(`/operator/routes/${id}`, payload));
  },

  async updateRouteDirections(id, payload) {
    return unwrap(await apiClient.put(`/operator/routes/${id}/directions`, payload));
  },

  async getStops() {
    return toList(unwrap(await apiClient.get('/operator/stops')));
  },

  async updateStop(id, payload) {
    return unwrap(await apiClient.put(`/operator/stops/${id}`, payload));
  },

  async getDisruptions() {
    return toList(unwrap(await apiClient.get('/operator/disruptions')));
  },

  async createDisruption(payload) {
    return unwrap(await apiClient.post('/operator/disruptions', payload));
  },

  async updateDisruption(id, payload) {
    return unwrap(await apiClient.put(`/operator/disruptions/${id}`, payload));
  },

  async deleteDisruption(id) {
    await apiClient.delete(`/operator/disruptions/${id}`);
  },

  async getAnalyticsSummary(from, to) {
    return unwrap(await apiClient.get(`/operator/analytics/summary${rangeQuery(from, to)}`));
  },

  async getRouteAnalytics(routeId, from, to) {
    return unwrap(
      await apiClient.get(`/operator/analytics/routes/${routeId}${rangeQuery(from, to)}`)
    );
  },

  async getSubscription() {
    return unwrap(await apiClient.get('/operator/subscription'));
  },

  async createCheckout(payload) {
    return unwrap(await apiClient.post('/billing/checkout', payload));
  },
};

export default operatorPortalService;
