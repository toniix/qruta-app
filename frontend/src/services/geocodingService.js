import axios from 'axios';

/**
 * Geocoding Service using Photon (OSM) API for Ica, Perú
 */
const ICA_LAT = -14.0678;
const ICA_LON = -75.7286;

export const geocodingService = {
  async searchPlace(query) {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query
      )}&lat=${ICA_LAT}&lon=${ICA_LON}&limit=5`;

      const response = await axios.get(url, { timeout: 5000 });

      if (response.data?.features) {
        return response.data.features.map((item) => ({
          name: item.properties.name || item.properties.street || query,
          district: item.properties.city || item.properties.state || 'Ica',
          country: item.properties.country || 'Perú',
          latitude: item.geometry.coordinates[1],
          longitude: item.geometry.coordinates[0],
          raw: item.properties,
        }));
      }
    } catch (err) {
      console.warn('Geocoding request failed:', err);
    }
    return [];
  },
};
