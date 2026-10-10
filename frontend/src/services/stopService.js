import { apiClient } from "./apiClient";
import { normalizeStop } from "../utils/adapters";

export const stopService = {
  /**
   * Obtiene todos los paraderos
   * GET /api/stops
   */
  async getAllStops() {
    const response = await apiClient.get("/stops");
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeStop).filter(Boolean);
  },

  /**
   * Obtiene un paradero por su ID
   * GET /api/stops/{id}
   */
  async getStopById(stopId) {
    if (!stopId) throw new Error("ID de paradero no especificado");
    const response = await apiClient.get(`/stops/${stopId}`);
    return normalizeStop(response.data);
  },

  /**
   * Busca paraderos por nombre o referencia
   * GET /api/stops/search?query=...
   */
  async searchStops(query) {
    if (!query || query.trim() === "") {
      return this.getAllStops();
    }
    const response = await apiClient.get("/stops/search", {
      params: { query },
    });
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeStop).filter(Boolean);
  },

  /**
   * Obtiene las rutas asociadas a un paradero
   * GET /api/stops/{id}/routes
   */
  async getStopRoutes(stopId) {
    if (!stopId) return [];
    const response = await apiClient.get(`/stops/${stopId}/routes`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Encuentra paraderos cercanos a coordenadas GPS
   * POST /api/stops/nearby
   */
  async getNearbyStops(latitude, longitude, radiusMeters = 1000) {
    const response = await apiClient.post("/stops/nearby", {
      latitude,
      longitude,
      radiusMeters,
    });
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeStop).filter(Boolean);
  },
};
