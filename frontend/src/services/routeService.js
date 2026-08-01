import { apiClient } from './apiClient';
import { MOCK_ROUTES } from './mockData';
import { calculateDistanceKm } from '../utils/geoUtils';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const routeService = {
  // Get all active public transit routes
  async getAllRoutes() {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate async latency
      return MOCK_ROUTES;
    }
    const response = await apiClient.get('/routes');
    return response.data;
  },

  // Get route by ID with detail, stops and polylines
  async getRouteById(routeId) {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const route = MOCK_ROUTES.find((r) => r.id === routeId || r.code === routeId);
      if (!route) throw new Error('Ruta no encontrada');
      return route;
    }
    const response = await apiClient.get(`/routes/${routeId}`);
    return response.data;
  },

  // Search routes by name, code or line
  async searchRoutes(query) {
    const all = await this.getAllRoutes();
    if (!query || query.trim() === '') return all;
    
    const term = query.toLowerCase().trim();
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.code.toLowerCase().includes(term) ||
        r.origin.toLowerCase().includes(term) ||
        r.destination.toLowerCase().includes(term) ||
        r.lineName.toLowerCase().includes(term) ||
        r.stops.some((s) => s.name.toLowerCase().includes(term))
    );
  },

  // Find routes near user's GPS coordinates
  async getNearbyRoutes(userLat, userLng, radiusKm = 1.5) {
    const allRoutes = await this.getAllRoutes();
    
    return allRoutes.filter((route) => {
      // Check if any stop or route point is within the radius
      const hasCloseStop = route.stops.some((stop) => {
        const dist = calculateDistanceKm(userLat, userLng, stop.latitude, stop.longitude);
        return dist <= radiusKm;
      });

      if (hasCloseStop) return true;

      return route.points.some(([lat, lng]) => {
        const dist = calculateDistanceKm(userLat, userLng, lat, lng);
        return dist <= radiusKm;
      });
    });
  },

  // Find absolute nearest route and stop to user's coordinates
  findNearestRouteAndStop(routes, userLat, userLng) {
    if (!routes || routes.length === 0 || !userLat || !userLng) return null;

    let bestMatch = null;
    let minDistance = Infinity;

    routes.forEach((route) => {
      route.stops?.forEach((stop) => {
        const dist = calculateDistanceKm(userLat, userLng, stop.latitude, stop.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = {
            route,
            stop,
            distanceKm: dist,
          };
        }
      });
    });

    return bestMatch;
  },
};
