import axios from "axios";

/**
 * Geocoding Service using Photon (OSM) API
 */
const DEFAULT_LAT = -14.0678;
const DEFAULT_LON = -75.7286;

export const geocodingService = {
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
   */
  async reverseGeocode(lat, lon) {
    console.log("Reverse geocoding for:", lat, lon);
    if (lat == null || lon == null) return null;

    try {
      const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;
      const response = await axios.get(url, { timeout: 4000 });
      console.log("Reverse geocoding response:", response.data);
      const feature = response.data?.features?.[0];
      if (!feature?.properties) return null;

      const p = feature.properties;
      const streetOrName = p.name || p.street || p.locality || "";
      const district = p.district || p.city || p.county || "";

      let formatted = "";
      if (streetOrName) {
        // Si hay nombre y calle distintos (ej: Hostal Dorado en Av. Bolívar)
        if (p.name && p.street && p.name !== p.street) {
          formatted = `${p.name}, ${p.street}`;
        } else {
          formatted = streetOrName;
        }
        if (district && !formatted.includes(district)) {
          formatted = `${formatted}, ${district}`;
        }
      } else {
        formatted = district ? `${district}, Perú` : "Tu ubicación actual";
      }
      console.log("Reverse geocoding result:", formatted, p);

      return {
        formattedAddress: formatted,
        street: p.street || p.name || "",
        district,
        city: p.city || p.district || "",
        raw: p,
      };
    } catch (err) {
      console.warn("Reverse geocoding failed:", err);
      return null;
    }
  },
};
