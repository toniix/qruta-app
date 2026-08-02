import { apiClient } from './apiClient';

export const adminStopService = {
  async getAllStops() {
    const response = await apiClient.get('/admin/stops');
    return response.data;
  },

  async createStop(data) {
    const response = await apiClient.post('/admin/stops', data);
    return response.data;
  },

  async updateStop(id, data) {
    const response = await apiClient.put(`/admin/stops/${id}`, data);
    return response.data;
  },

  async deleteStop(id) {
    await apiClient.delete(`/admin/stops/${id}`);
  },
};
