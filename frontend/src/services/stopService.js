import { apiClient } from './apiClient';
import { MOCK_STOPS } from './mockData';
import { calculateDistanceKm } from '../utils/geoUtils';

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

  async getNearbyStops(userLat, userLng, radiusKm = 1.0) {
    const stops = await this.getAllStops();
    return stops
      .map((stop) => ({
        ...stop,
        distanceKm: calculateDistanceKm(userLat, userLng, stop.latitude, stop.longitude),
      }))
      .filter((stop) => stop.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  // Admin mutation
  async createStop(stopData) {
    if (USE_MOCK) {
      const newStop = {
        id: `stop-${Date.now()}`,
        ...stopData,
      };
      MOCK_STOPS.push(newStop);
      return newStop;
    }
    const response = await apiClient.post('/stops', stopData);
    return response.data;
  },
};
