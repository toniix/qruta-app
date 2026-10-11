import { apiClient } from "./apiClient";
import { normalizeRoute } from "../utils/adapters";
import { calculateDistanceKm } from "../utils/geoUtils";

export const routeService = {
  /**
   * Obtiene todas las tarjetas de rutas
   * GET /api/routes/cards
   * @param {string} cityId - UUID de la ciudad (opcional)
   */
  async getAllRoutes(cityId) {
    const response = await apiClient.get("/routes/cards", {
      params: cityId ? { cityId } : {},
    });
    console.log(response.data);
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeRoute).filter(Boolean);
  },

  /**
   * Obtiene rutas más populares
   * GET /api/routes/popular
   * @param {string} cityId - UUID de la ciudad (opcional)
   */
  async getPopularRoutes(cityId) {
    const response = await apiClient.get("/routes/popular", {
      params: cityId ? { cityId } : {},
    });
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
   * @param {string} query - Texto de búsqueda
   * @param {string} cityId - UUID de la ciudad (opcional)
   */
  async searchRoutes(query, cityId) {
    if (!query || query.trim() === "") {
      return this.getAllRoutes(cityId);
    }
    const response = await apiClient.get("/routes/search", {
      params: { query, ...(cityId ? { cityId } : {}) },
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
