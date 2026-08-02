import { apiClient } from './apiClient';
import { MOCK_STOPS } from './mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const stopService = {
  async getAllStops() {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return MOCK_STOPS;
    }
    const response = await apiClient.get('/stops');
    return response.data;
  },

  async getStopById(stopId) {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const stop = MOCK_STOPS.find((s) => s.id === stopId);
      if (!stop) throw new Error('Paradero no encontrado');
      return stop;
    }
    const response = await apiClient.get(`/stops/${stopId}`);
    return response.data;
  },

  async searchStops(query) {
    if (USE_MOCK) {
      if (!query || query.trim() === '') return MOCK_STOPS;
      const term = query.toLowerCase().trim();
      return MOCK_STOPS.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.reference?.toLowerCase().includes(term) ||
          s.address?.toLowerCase().includes(term)
      );
    }
    const response = await apiClient.get('/stops/search', { params: { query } });
    return response.data;
  },
};
