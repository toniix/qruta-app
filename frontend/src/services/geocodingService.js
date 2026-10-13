import axios from "axios";
import { apiClient } from "./apiClient";

/**
 * Geocoding Service: reverse geocoding via the backend proxy only
 * (the backend owns Google -> Photon fallback); forward place search
 * still uses Photon directly.
 */
const DEFAULT_LAT = -14.0678;
const DEFAULT_LON = -75.7286;

/**
 * Short street line for display: "Av. Bolivar 123".
 * Never double spaces, never "null": empty parts are dropped.
 */
export function streetLine(geo) {
  const street = typeof geo?.street === "string" ? geo.street.trim() : "";
  const number =
    geo?.streetNumber == null ? "" : String(geo.streetNumber).trim();
  return [street, number].filter(Boolean).join(" ");
}

export const geocodingService = {
  streetLine,
  /**
   * Busca lugares por nombre usando Photon OSM
   * @param {string} query - Texto de búsqueda
   * @param {Object} centerCoords - Coordenadas centrales { latitude, longitude } de la ciudad activa
   */
  async searchPlace(query, centerCoords) {
    if (!query || query.trim().length < 2) return [];

    const lat = centerCoords?.latitude ?? DEFAULT_LAT;
    const lon = centerCoords?.longitude ?? DEFAULT_LON;

    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query,
      )}&lat=${lat}&lon=${lon}&limit=5`;

      const response = await axios.get(url, { timeout: 5000 });

      if (response.data?.features) {
        return response.data.features.map((item) => ({
          name: item.properties.name || item.properties.street || query,
          district: item.properties.city || item.properties.state || "",
          country: item.properties.country || "Perú",
          latitude: item.geometry.coordinates[1],
          longitude: item.geometry.coordinates[0],
          raw: item.properties,
        }));
      }
    } catch (err) {
      console.warn("Geocoding request failed:", err);
    }
    return [];
  },

  /**
   * Geocodificación Inversa: Convierte coordenadas [lat, lng] en nombre de dirección
   * Ej: "Avenida Bolívar, Ica" o "Hostal Dorado, Ica"
   * Proxy-only: the backend owns the whole chain (Google -> Photon ->
   * honest error), so there is no client-side fallback to keep in sync.
   */
  async reverseGeocode(lat, lon) {
    if (lat == null || lon == null) return null;

    try {
      const response = await apiClient.get("/geocode/reverse", {
        params: { lat, lng: lon },
        timeout: 4000,
      });
      const data = response.data;
      if (data?.formattedAddress || data?.street) {
        return {
          formattedAddress: data.formattedAddress || "",
          street: data.street || "",
          streetNumber: data.streetNumber || "",
          district: data.district || "",
          city: data.city || "",
          source: data.source || "",
        };
      }
    } catch {
      // Proxy unavailable: callers already handle null (coordinates fallback).
    }
    return null;
  },
};
