import { apiClient } from './apiClient';
import { routeService } from './routeService';
import { stopService } from './stopService';
import { calculateDistanceKm } from '../utils/geoUtils';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const nearbyService = {
  async findNearbyRoutes(latitude, longitude, radiusMeters = 1000) {
    if (USE_MOCK) {
      const allRoutes = await routeService.getAllRoutes();
      return allRoutes.filter((route) => {
        return route.stops?.some((stop) => {
          const dist = calculateDistanceKm(latitude, longitude, stop.latitude, stop.longitude);
          return dist <= radiusMeters / 1000;
        });
      });
    }
    const response = await apiClient.post('/routes/nearby', {
      latitude,
      longitude,
      radiusMeters,
    });
    return response.data;
  },

  async findNearbyStops(latitude, longitude, radiusMeters = 1000) {
    if (USE_MOCK) {
      const allStops = await stopService.getAllStops();
      return allStops
        .map((stop) => ({
          ...stop,
          distanceKm: calculateDistanceKm(latitude, longitude, stop.latitude, stop.longitude),
        }))
        .filter((stop) => stop.distanceKm <= radiusMeters / 1000)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    const response = await apiClient.post('/stops/nearby', {
      latitude,
      longitude,
      radiusMeters,
    });
    return response.data;
  },
};
