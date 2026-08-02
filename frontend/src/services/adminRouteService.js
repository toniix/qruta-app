import { apiClient } from './apiClient';

export const adminRouteService = {
  async getAllRoutes() {
    const response = await apiClient.get('/admin/routes');
    return response.data;
  },

  async getRouteById(id) {
    const response = await apiClient.get(`/admin/routes/${id}`);
    return response.data;
  },

  async createRoute(data) {
    const response = await apiClient.post('/admin/routes', data);
    return response.data;
  },

  async updateRoute(id, data) {
    const response = await apiClient.put(`/admin/routes/${id}`, data);
    return response.data;
  },

  async updateRouteDirections(id, data) {
    const response = await apiClient.put(`/admin/routes/${id}/directions`, data);
    return response.data;
  },

  async deleteRoute(id) {
    await apiClient.delete(`/admin/routes/${id}`);
  },
};
