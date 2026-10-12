import { calculateDistanceKm } from "./geoUtils";

/**
 * Shared walking-distance helpers for "nearby routes" presentation.
 * Single source of truth so distance hints never drift between screens
 * (Cercanas, global search, destination-picker results).
 */

// Default search radius for a picked destination point (≈ 5 cuadras).
export const DESTINATION_DEFAULT_RADIUS_M = 500;

// Preset steps offered from destination results / empty state.
// All values stay within the backend NearbySearchRequest bounds (0, 100000].
export const DESTINATION_RADIUS_PRESETS_M = [500, 1000, 2000];

// Backend NearbySearchRequest validation bounds for radiusMeters.
export const NEARBY_RADIUS_MIN_M = 0; // exclusive: radius must be > 0
export const NEARBY_RADIUS_MAX_M = 100000;

/**
 * Clamps a radius to the backend NearbySearchRequest bounds.
 * Out-of-range or non-numeric input falls back to the default radius.
 */
export function clampRadiusMeters(radiusMeters) {
  const value = Number(radiusMeters);
  if (!Number.isFinite(value) || value <= NEARBY_RADIUS_MIN_M) {
    return DESTINATION_DEFAULT_RADIUS_M;
  }
  return Math.min(value, NEARBY_RADIUS_MAX_M);
}

function routeStops(route) {
  if (!route) return [];
  if (Array.isArray(route.keyStops) && route.keyStops.length > 0) {
    return route.keyStops;
  }
  return Array.isArray(route.stops) ? route.stops : [];
}

/**
 * Finds the nearest stop of a route to a point.
 * The nearby endpoint carries no per-route distance field, so the distance
 * is always computed client-side with Haversine over the stop coordinates.
 * @returns {{ distanceMeters: number, stop: object } | null}
 */
export function nearestStopDistance(route, lat, lng) {
  if (lat == null || lng == null) return null;
  let best = null;
  for (const stop of routeStops(route)) {
    if (stop?.latitude == null || stop?.longitude == null) continue;
    const meters =
      calculateDistanceKm(lat, lng, stop.latitude, stop.longitude) * 1000;
    if (best == null || meters < best.distanceMeters) {
      best = { distanceMeters: meters, stop };
    }
  }
  return best;
}

/**
 * Ranks routes nearest-first by distance from the point to each route's
 * nearest stop. Routes without usable stop coordinates sort last.
 * @returns {Array<{ route: object, nearest: { distanceMeters, stop } | null }>}
 */
export function sortRoutesByDistance(routes, lat, lng) {
  return (routes || [])
    .map((route) => ({ route, nearest: nearestStopDistance(route, lat, lng) }))
    .sort(
      (a, b) =>
        (a.nearest?.distanceMeters ?? Infinity) -
        (b.nearest?.distanceMeters ?? Infinity),
    );
}

/**
 * Ranks routes by combined proximity to BOTH an origin and a destination
 * point (nearest to the whole trip first). Each endpoint may match a
 * different stop of the same route. Routes without a usable stop near
 * either endpoint are excluded — the caller intersects the nearby sets
 * first and this helper ranks the survivors.
 * @returns {Array<{ route: object, origin: { distanceMeters, stop } | null, destination: { distanceMeters, stop } | null }>}
 */
export function sortRoutesByOriginDestination(
  routes,
  originLat,
  originLng,
  destLat,
  destLng,
) {
  return (routes || [])
    .map((route) => ({
      route,
      origin: nearestStopDistance(route, originLat, originLng),
      destination: nearestStopDistance(route, destLat, destLng),
    }))
    .filter((item) => item.origin != null && item.destination != null)
    .sort(
      (a, b) =>
        a.origin.distanceMeters +
        a.destination.distanceMeters -
        (b.origin.distanceMeters + b.destination.distanceMeters),
    );
}

/**
 * Walking-distance hint band for one result (1 cuadra ≈ 100 m).
 * Same thresholds for every screen rendering nearby results.
 */
export function formatDistanceBand(distanceMeters) {
  if (distanceMeters == null || Number.isNaN(Number(distanceMeters))) return "";
  const meters = Number(distanceMeters);
  if (meters < 150) return "Muy cerca";
  if (meters < 500) {
    // Straight-line Haversine underestimates walked distance on a street grid (typically 20-40%), so scale up conservatively.
    const blocks = Math.max(1, Math.round((meters * 1.3) / 100));
    return blocks === 1 ? "A 1 cuadra" : `A ${blocks} cuadras`;
  }
  return "A más de 5 cuadras";
}
