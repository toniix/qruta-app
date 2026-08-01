import axios from 'axios';

/**
 * Service to calculate real road polylines using Open Source Routing Machine (OSRM)
 */
export const routingService = {
  async getRoadPolyline(points) {
    if (!points || points.length < 2) return points;

    try {
      // Format coordinates for OSRM: lon,lat;lon,lat
      const coordString = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

      const response = await axios.get(url, { timeout: 5000 });

      if (response.data?.routes?.[0]?.geometry?.coordinates) {
        // OSRM returns [lon, lat], so we map it back to Leaflet [lat, lon]
        return response.data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      }
    } catch (err) {
      console.warn('OSRM routing request failed, falling back to direct points:', err);
    }

    return points;
  },
};
