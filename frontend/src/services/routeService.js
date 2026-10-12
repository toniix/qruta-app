import { apiClient } from "./apiClient";
import { normalizeRoute } from "../utils/adapters";
import { calculateDistanceKm } from "../utils/geoUtils";
import { clampRadiusMeters } from "../utils/distanceBands";

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
   * Busca rutas por query (nombre, código, empresa o paraderos)
   * GET /api/routes/search?query=...&cityId=...&size=...
   * Global by default: omit cityId to search across all cities.
   * @param {string} query - Texto de búsqueda
   * @param {string|null} cityId - UUID de la ciudad (opcional; ausente = todas las ciudades)
   * @param {number|null} size - Máximo de resultados (opcional, 1–100, el backend usa 50 por defecto)
   */
  async searchRoutes(query, cityId = null, size = null) {
    if (!query || query.trim() === "") {
      return this.getAllRoutes(cityId);
    }
    // Allow options-object style: searchRoutes(query, { cityId, size })
    if (cityId && typeof cityId === "object") {
      ({ cityId = null, size = null } = cityId);
    }
    const params = { query: query.trim() };
    if (cityId) params.cityId = cityId;
    if (size != null) {
      const bounded = Math.min(100, Math.max(1, Number(size) || 50));
      params.size = bounded;
    }
    const response = await apiClient.get("/routes/search", { params });
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
   * Encuentra rutas cercanas a coordenadas arbitrarias (GPS o punto elegido)
   * POST /api/routes/nearby
   * El radio se limita a los bordes del backend (NearbySearchRequest: (0, 100000]).
   */
  async getNearbyRoutes(latitude, longitude, radiusMeters = 1500) {
    const response = await apiClient.post("/routes/nearby", {
      latitude,
      longitude,
      radiusMeters: clampRadiusMeters(radiusMeters),
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
