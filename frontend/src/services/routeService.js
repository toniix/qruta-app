import { apiClient } from "./apiClient";
import { BRAND_PRIMARY } from "../constants/brand";
import { MOCK_ROUTES } from "./mockData";
import { calculateDistanceKm } from "../utils/geoUtils";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const routeService = {
  async getAllRoutes() {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_ROUTES;
    }
    const response = await apiClient.get("/routes/cards");
    console.log("rutas obtenidas:", response.data);
    return response.data;
  },

  async getPopularRoutes() {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          code: "R101",
          name: "Miraflores - Centro",
          color: "#E8532E",
          totalStops: 25,
          popularityScore: 95,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          code: "R202",
          name: "Mercado Modelo - UNICA",
          color: "#16a34a",
          totalStops: 18,
          popularityScore: 88,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          code: "R303",
          name: "Parcona - San Joaquín",
          color: BRAND_PRIMARY,
          totalStops: 22,
          popularityScore: 82,
        },
      ];
    }
    const response = await apiClient.get("/routes/popular");
    return response.data;
  },

  async getRouteDetail(routeId) {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const route = MOCK_ROUTES.find(
        (r) => r.id === routeId || r.code === routeId,
      );
      if (!route) throw new Error("Ruta no encontrada");
      return route;
    }
    const response = await apiClient.get(`/routes/${routeId}`);
    // console.log("route detail:", response.data);
    return response.data;
  },

  async searchRoutes(query) {
    if (USE_MOCK) {
      const all = await this.getAllRoutes();
      if (!query || query.trim() === "") return all;
      const term = query.toLowerCase().trim();
      return all.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          r.transportLineName?.toLowerCase().includes(term),
      );
    }
    const response = await apiClient.get("/routes/search", {
      params: { query },
    });
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
          const dist = calculateDistanceKm(
            userLat,
            userLng,
            stop.latitude,
            stop.longitude,
          );
          return dist <= radiusMeters / 1000;
        });
        if (hasCloseStop) return true;
        return route.points?.some(([lat, lng]) => {
          const dist = calculateDistanceKm(userLat, userLng, lat, lng);
          return dist <= radiusMeters / 1000;
        });
      });
    }
    const response = await apiClient.post("/routes/nearby", {
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
      const stops = route.stops || [];
      stops.forEach((stop) => {
        const dist = calculateDistanceKm(
          userLat,
          userLng,
          stop.latitude,
          stop.longitude,
        );
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = { route, stop, distanceKm: dist };
        }
      });
    });

    return bestMatch;
  },
};
