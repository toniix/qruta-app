import { apiClient } from './apiClient';

export const cityService = {
  async getAllCities() {
    const response = await apiClient.get('/cities');
    return response.data;
  },

  async getAdminCities() {
    const response = await apiClient.get('/admin/cities');
    return response.data;
  },

  async createCity(data) {
    const response = await apiClient.post('/admin/cities', data);
    return response.data;
  },

  async updateCity(id, data) {
    const response = await apiClient.put(`/admin/cities/${id}`, data);
    return response.data;
  },

  async deleteCity(id) {
    await apiClient.delete(`/admin/cities/${id}`);
  },
};
