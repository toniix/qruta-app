import { apiClient } from './apiClient';

export const adminLineService = {
  async getAllLines() {
    const response = await apiClient.get('/admin/lines');
    return response.data;
  },

  async createLine(data) {
    const response = await apiClient.post('/admin/lines', data);
    return response.data;
  },

  async updateLine(id, data) {
    const response = await apiClient.put(`/admin/lines/${id}`, data);
    return response.data;
  },

  async deleteLine(id) {
    await apiClient.delete(`/admin/lines/${id}`);
  },
};
