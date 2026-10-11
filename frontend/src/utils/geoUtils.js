/**
 * Distance and Geolocation Utilities for RutaYa
 */

// Calculate distance between two lat/lng pairs in kilometers using Haversine formula
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// Format distance in meters or kilometers for UI display
export function formatDistance(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return '';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

// Compute bounding box for array of points [[lat, lng], ...]
export function getBoundsFromPoints(points) {
  if (!points || points.length === 0) return null;
  
  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];

  points.forEach(([lat, lng]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * Determina la ciudad más cercana dentro de su radio de cobertura.
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLng - Longitud del usuario
 * @param {Array} cities - Lista de ciudades con { id, name, latitude, longitude, radiusKm }
 * @returns {{ city: Object|null, nearestCity: Object|null, distanceKm: number, isInsideCoverage: boolean }}
 */
export function detectCityFromCoords(userLat, userLng, cities) {
  if (userLat == null || userLng == null || !Array.isArray(cities) || cities.length === 0) {
    return { city: null, nearestCity: null, distanceKm: Infinity, isInsideCoverage: false };
  }

  let nearestCity = null;
  let minDistance = Infinity;

  for (const city of cities) {
    if (city.latitude == null || city.longitude == null) continue;
    const dist = calculateDistanceKm(userLat, userLng, Number(city.latitude), Number(city.longitude));
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = city;
    }
  }

  if (!nearestCity) {
    return { city: null, nearestCity: null, distanceKm: Infinity, isInsideCoverage: false };
  }

  const maxRadius = Number(nearestCity.radiusKm) || 30;
  const isInside = minDistance <= maxRadius;

  return {
    city: isInside ? nearestCity : null,
    nearestCity,
    distanceKm: minDistance,
    isInsideCoverage: isInside,
  };
}
