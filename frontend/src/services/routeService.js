import { apiClient } from './apiClient';
import { MOCK_ROUTES } from './mockData';
import { calculateDistanceKm } from '../utils/geoUtils';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// Flatten route directions into a single stops/points array for compatibility with existing UI
function flattenRoute(route) {
  if (!route.directions || route.directions.length === 0) return route;

  const allStops = [];
  const allPoints = [];
  let originName = '';
  let destinationName = '';

    for (const dir of route.directions) {
      for (const stop of dir.stops || []) {
        if (!allStops.find((s) => s.id === stop.id)) {
          allStops.push(stop);
        }
      }
      for (const point of dir.routePoints || []) {
        allPoints.push([point.latitude, point.longitude]);
      }
      if (!originName && dir.originName) originName = dir.originName;
      if (dir.destinationName) destinationName = dir.destinationName;
    }

  return {
    ...route,
    stops: allStops,
    points: allPoints,
    totalDistanceKm: allPoints.length > 0 ? null : (route.totalDistanceKm || null),
    estimatedMinutes: allPoints.length > 0 ? null : (route.estimatedMinutes || null),
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
    const response = await apiClient.get('/routes');
    return response.data.map(flattenRoute);
  },

  async getRouteById(routeId) {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const route = MOCK_ROUTES.find((r) => r.id === routeId || r.code === routeId);
      if (!route) throw new Error('Ruta no encontrada');
      return route;
    }
    const response = await apiClient.get(`/routes/${routeId}`);
    return flattenRoute(response.data);
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
    return response.data.map(flattenRoute);
  },

  async getRoutesByLine(transportLineId) {
    if (USE_MOCK) {
      const all = await this.getAllRoutes();
      return all.filter((r) => r.transportLineId === transportLineId);
    }
    const response = await apiClient.get(`/routes/line/${transportLineId}`);
    return response.data.map(flattenRoute);
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
    return response.data.map(flattenRoute);
  },

  findNearestRouteAndStop(routes, userLat, userLng) {
    if (!routes || routes.length === 0 || !userLat || !userLng) return null;

    let bestMatch = null;
    let minDistance = Infinity;

    routes.forEach((route) => {
      route.stops?.forEach((stop) => {
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
