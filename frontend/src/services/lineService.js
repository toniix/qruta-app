import { apiClient } from "./apiClient";

export const lineService = {
  /**
   * Obtiene todas las líneas de transporte
   * GET /api/lines
   */
  async getAllLines() {
    const response = await apiClient.get("/lines");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Filtra líneas por ciudad
   * GET /api/lines/city/{cityId}
   */
  async getLinesByCity(cityId) {
    const response = await apiClient.get(`/lines/city/${cityId}`);
    return Array.isArray(response.data) ? response.data : [];
  },
};
