import { apiClient } from "./apiClient";
import { normalizeRoute } from "../utils/adapters";
import { calculateDistanceKm } from "../utils/geoUtils";

export const routeService = {
  /**
   * Obtiene todas las tarjetas de rutas
   * GET /api/routes/cards
   */
  async getAllRoutes() {
    const response = await apiClient.get("/routes/cards");
    console.log(response.data);
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeRoute).filter(Boolean);
  },

  /**
   * Obtiene rutas más populares
   * GET /api/routes/popular
   */
  async getPopularRoutes() {
    const response = await apiClient.get("/routes/popular");
    console.log(response.data);
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeRoute).filter(Boolean);
  },

  /**
   * Obtiene el detalle completo de una ruta con paraderos y direcciones
   * GET /api/routes/{id}
   */
  async getRouteDetail(routeId) {
    if (!routeId) throw new Error("ID de ruta no especificado");
    const response = await apiClient.get(`/routes/${routeId}`);
    return normalizeRoute(response.data);
  },

  /**
   * Busca rutas por query (nombre, código o paraderos)
   * GET /api/routes/search?query=...
   */
  async searchRoutes(query) {
    if (!query || query.trim() === "") {
      return this.getAllRoutes();
    }
    const response = await apiClient.get("/routes/search", {
      params: { query },
    });
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeRoute).filter(Boolean);
  },

  /**
   * Lista rutas por línea de transporte
   * GET /api/routes/line/{transportLineId}
   */
  async getRoutesByLine(transportLineId) {
    const response = await apiClient.get(`/routes/line/${transportLineId}`);
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeRoute).filter(Boolean);
  },

  /**
   * Encuentra rutas cercanas a coordenadas GPS
   * POST /api/routes/nearby
   */
  async getNearbyRoutes(latitude, longitude, radiusMeters = 1500) {
    const response = await apiClient.post("/routes/nearby", {
      latitude,
      longitude,
      radiusMeters,
    });
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeRoute).filter(Boolean);
  },

  /**
   * Utilidad cliente para identificar la ruta y paradero más cercano en una colección
   */
  findNearestRouteAndStop(routes, userLat, userLng) {
    if (!routes || routes.length === 0 || !userLat || !userLng) return null;

    let bestMatch = null;
    let minDistance = Infinity;

    routes.forEach((route) => {
      const stops =
        route.keyStops?.length > 0 ? route.keyStops : route.stops || [];
      stops.forEach((stop) => {
        if (stop.latitude == null || stop.longitude == null) return;

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
