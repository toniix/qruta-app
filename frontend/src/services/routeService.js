import { apiClient } from './apiClient';
import { MOCK_ROUTES } from './mockData';
import { calculateDistanceKm } from '../utils/geoUtils';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// Extract flattened stops and points from route detail (with directions)
function extractRouteData(route) {
  if (!route) return route;

  // If already flattened (has direct stops/points), return as-is
  if (route.stops && route.points) return route;

  // Extract from directions if available
  const allStops = [];
  const allPoints = [];
  let originName = '';
  let destinationName = '';

  if (route.directions && route.directions.length > 0) {
    const firstDir = route.directions[0];
    if (firstDir.stops) {
      allStops.push(...firstDir.stops);
    }
    if (firstDir.routePoints) {
      allPoints.push(...firstDir.routePoints.map(p => [p.latitude, p.longitude]));
    }
    if (firstDir.originName) originName = firstDir.originName;
    if (firstDir.destinationName) destinationName = firstDir.destinationName;
  }

  return {
    ...route,
    stops: allStops,
    points: allPoints,
    origin: originName,
    destination: destinationName,
  };
}

export const routeService = {
  async getAllRoutes() {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_ROUTES;
    }
    const response = await apiClient.get('/routes/cards');
    // Summaries don't have directions, so no stops/points yet
    return response.data;
  },

  async getRouteDetail(routeId) {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const route = MOCK_ROUTES.find((r) => r.id === routeId || r.code === routeId);
      if (!route) throw new Error('Ruta no encontrada');
      return route;
    }
    const response = await apiClient.get(`/routes/${routeId}`);
    return extractRouteData(response.data);
  },

  async searchRoutes(query) {
    if (USE_MOCK) {
      const all = await this.getAllRoutes();
      if (!query || query.trim() === '') return all;
      const term = query.toLowerCase().trim();
      return all.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          r.transportLineName?.toLowerCase().includes(term)
      );
    }
    const response = await apiClient.get('/routes/search', { params: { query } });
    return response.data;
  },

  async getRoutesByLine(transportLineId) {
    if (USE_MOCK) {
      const all = await this.getAllRoutes();
      return all.filter((r) => r.transportLineId === transportLineId);
    }
    const response = await apiClient.get(`/routes/line/${transportLineId}`);
    return response.data;
  },

  async getNearbyRoutes(userLat, userLng, radiusMeters = 1500) {
    if (USE_MOCK) {
      const allRoutes = await this.getAllRoutes();
      return allRoutes.filter((route) => {
        const hasCloseStop = route.stops?.some((stop) => {
          const dist = calculateDistanceKm(userLat, userLng, stop.latitude, stop.longitude);
          return dist <= radiusMeters / 1000;
        });
        if (hasCloseStop) return true;
        return route.points?.some(([lat, lng]) => {
          const dist = calculateDistanceKm(userLat, userLng, lat, lng);
          return dist <= radiusMeters / 1000;
        });
      });
    }
    const response = await apiClient.post('/routes/nearby', {
      latitude: userLat,
      longitude: userLng,
      radiusMeters,
    });
    return response.data;
  },

  findNearestRouteAndStop(routes, userLat, userLng) {
    if (!routes || routes.length === 0 || !userLat || !userLng) return null;

    let bestMatch = null;
    let minDistance = Infinity;

    routes.forEach((route) => {
      // Try stops from direction or direct property
      const stops = route.stops || [];
      stops.forEach((stop) => {
        const dist = calculateDistanceKm(userLat, userLng, stop.latitude, stop.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = { route, stop, distanceKm: dist };
        }
      });
    });

    return bestMatch;
  },
};
